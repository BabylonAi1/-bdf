import { NextRequest, NextResponse } from 'next/server';
import { ACCEPTED_MIME, MAX_FILE_BYTES } from '@/lib/constants';
import { extractPdfBlocks, generateTranslatedPdf } from '@/lib/pdf';
import type { ExtractedPage, TextBlock } from '@/lib/pdf';
import { translateText } from '@/lib/translator';
import type { TranslateApiError } from '@/types';

export const runtime = 'nodejs';
// Long books need real time to translate; raise the per-request budget.
export const maxDuration = 300;

// Cap parallel translation calls so we don't burst the upstream provider.
// 4 lifts throughput a little since each block is shorter than a whole page.
const TRANSLATE_CONCURRENCY = 4;

function fail(code: TranslateApiError['code'], message: string, status = 400) {
  const body: TranslateApiError = { ok: false, code, message };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const sourceLang = String(form.get('sourceLang') || 'auto');
    const targetLang = String(form.get('targetLang') || 'en');

    if (!(file instanceof File)) {
      return fail('NO_FILE', 'Please choose a PDF file first.');
    }

    if (file.type && file.type !== ACCEPTED_MIME) {
      return fail('BAD_TYPE', 'Only PDF files are accepted.');
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return fail('BAD_TYPE', 'Only PDF files are accepted.');
    }

    if (file.size > MAX_FILE_BYTES) {
      return fail('TOO_LARGE', 'The PDF file must be 9 MB or less.', 413);
    }
    if (file.size === 0) {
      return fail('EMPTY_PDF', 'This PDF appears to be empty.');
    }

    console.log(
      `[translate] received file "${file.name}" (${file.size} bytes, type=${file.type || 'n/a'}), source=${sourceLang}, target=${targetLang}`,
    );

    const buf = new Uint8Array(await file.arrayBuffer());
    // pdfjs (via unpdf) takes ownership of the buffer during extraction, so
    // keep a pristine copy aside for the page-copy step that runs later.
    const originalForCopy = new Uint8Array(buf);

    let pages: ExtractedPage[];
    try {
      pages = await extractPdfBlocks(buf);
    } catch (err) {
      console.error('[translate] extract failed:', err);
      return fail(
        'EXTRACT_FAILED',
        'We could not read text from this PDF. It may be a scanned image.',
        422,
      );
    }

    const pagesWithText = pages.filter((p) => p.blocks.length > 0).length;
    const pagesNoText = pages.length - pagesWithText;
    const totalBlocks = pages.reduce((s, p) => s + p.blocks.length, 0);
    const unsafeBlocks = pages.reduce(
      (s, p) => s + p.blocks.filter((b) => b.unsafeReason).length,
      0,
    );
    const byType = {
      text: pages.filter((p) => p.pageType === 'text').length,
      'image-heavy': pages.filter((p) => p.pageType === 'image-heavy').length,
      cover: pages.filter((p) => p.pageType === 'cover').length,
      scanned: pages.filter((p) => p.pageType === 'scanned').length,
    };
    console.log(
      `[translate] extracted ${pages.length} page(s) — ${pagesWithText} with text, ${pagesNoText} empty/scanned, ${totalBlocks} block(s) total, ${unsafeBlocks} pre-flagged unsafe`,
    );
    console.log(
      `[translate] page classification — text=${byType.text}, image-heavy=${byType['image-heavy']}, cover=${byType.cover}, scanned=${byType.scanned}`,
    );
    if (!pagesWithText) {
      return fail('EMPTY_PDF', 'This PDF has no extractable text.', 422);
    }

    let translationStats: TranslationStats;
    try {
      translationStats = await translateAllBlocks(
        pages,
        sourceLang,
        targetLang,
        TRANSLATE_CONCURRENCY,
      );
    } catch (err) {
      console.error('[translate] translate failed:', err);
      return fail('TRANSLATE_FAILED', 'Translation failed. Please try again.', 502);
    }
    console.log(
      `[translate] translated ${translationStats.ok}/${totalBlocks} block(s) — ${translationStats.failed} failed, ${translationStats.skipped} skipped`,
    );

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generateTranslatedPdf({
        pages,
        targetLang,
        originalPdf: originalForCopy,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.stack || err.message : String(err);
      console.error('[translate] generate failed:', reason);
      // Surface the real reason in a response header so the failure can be
      // diagnosed without re-running with verbose logging. The body stays a
      // user-friendly JSON error so the UI keeps working unchanged.
      const body: TranslateApiError = {
        ok: false,
        code: 'GENERATE_FAILED',
        message: 'We could not build the translated PDF. Please try again.',
      };
      return NextResponse.json(body, {
        status: 500,
        headers: {
          'X-Error-Reason': (err instanceof Error ? err.message : 'unknown').slice(0, 300),
        },
      });
    }

    const filename = makeOutputFilename(file.name, targetLang);
    const pageCount = pages.length;
    console.log(
      `[translate] done — output filename "${filename}", ${pdfBytes.byteLength} bytes`,
    );

    // Return the raw PDF as a binary stream so the browser / macOS Finder
    // recognises it correctly. Using Blob ensures Next.js sends the bytes
    // verbatim with the Content-Type we set.
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.byteLength),
        'Cache-Control': 'no-store',
        'X-Page-Count': String(pageCount),
        'X-Pages-Translated': String(translationStats.ok),
        'X-Pages-Failed': String(translationStats.failed),
        'X-Pages-Empty': String(translationStats.skipped),
        'X-Filename': filename,
      },
    });
  } catch (err) {
    console.error('[translate] unexpected error', err);
    return fail('SERVER_ERROR', 'Something went wrong on our side.', 500);
  }
}

interface TranslationStats {
  ok: number;
  failed: number;
  skipped: number;
}

interface BlockJob {
  block: TextBlock;
  pageNumber: number;
}

/**
 * Translate every text block on every page, bounded by concurrency. Each
 * block's translated string is written back into `block.translatedText` so
 * the generator can lay it out in the block's bounding box. Failures don't
 * abort the job — they're counted and the block keeps its original English
 * (visible behind the white mask, easier to spot).
 *
 * Identical texts are deduplicated so we don't hit the upstream provider
 * thousands of times for the same caption.
 */
async function translateAllBlocks(
  pages: ExtractedPage[],
  sourceLang: string,
  targetLang: string,
  concurrency: number,
): Promise<TranslationStats> {
  const stats: TranslationStats = { ok: 0, failed: 0, skipped: 0 };

  // Flatten with page index.
  const jobs: BlockJob[] = [];
  for (const p of pages) {
    for (const block of p.blocks) {
      jobs.push({ block, pageNumber: p.pageNumber });
    }
  }

  // Per-text memoization avoids re-translating duplicates.
  const cache = new Map<string, Promise<string>>();

  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= jobs.length) return;
      const { block, pageNumber } = jobs[i];
      const key = block.text.trim();
      if (!key) {
        stats.skipped++;
        continue;
      }
      // Skip blocks pre-flagged unsafe by extraction (would damage page).
      if (block.unsafeReason) {
        stats.skipped++;
        continue;
      }

      let p = cache.get(key);
      if (!p) {
        p = translateText({ text: key, sourceLang, targetLang });
        cache.set(key, p);
      }
      try {
        block.translatedText = await p;
        stats.ok++;
      } catch (err) {
        stats.failed++;
        cache.delete(key); // allow another attempt elsewhere
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[translate] page ${pageNumber}: block failed: ${reason}`);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return stats;
}

/**
 * Produce a clean ASCII filename so macOS / Windows / Linux all recognise
 * the .pdf extension reliably. Non-ASCII (e.g. Arabic) is stripped because
 * some macOS download flows mis-detect the extension when the name is RTL.
 */
function makeOutputFilename(original: string, targetLang: string): string {
  const stripped = original.replace(/\.pdf$/i, '');
  const slug = stripped
    .replace(/[^a-zA-Z0-9\-_\s]/g, '') // drop non-ASCII / punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  const safeSlug = slug || 'document';
  const safeLang = targetLang.replace(/[^a-zA-Z]/g, '') || 'translated';
  return `translated-${safeSlug}-${safeLang}.pdf`;
}
