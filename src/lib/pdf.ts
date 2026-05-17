import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { promises as fs } from 'fs';
import path from 'path';
import bidiFactory from 'bidi-js';
import ArabicReshaper from 'arabic-reshaper';
import {
  buildOverlayHtml,
  getArabicFontDataUri,
  type OverlayBlock,
} from './overlay-html';
import { ocrPage } from './ocr';

/**
 * In-place PDF translation pipeline.
 *
 *   extractPdfBlocks(buffer)
 *     → walks each page via pdfjs and groups text items into paragraph blocks
 *       with bounding boxes (PDF user-space coordinates, origin bottom-left).
 *
 *   generateTranslatedPdf({ originalPdf, pages })
 *     → 1. copyPages the original (preserves images, layout and dimensions
 *          exactly — no shrinking, no distortion).
 *       2. For every block on every page: paint a white rectangle over the
 *          block's bbox to hide the original English, then draw the Arabic
 *          translation in that same rectangle. RTL, right-anchored, with
 *          shaping + bidi, per-character font fallback so non-Arabic glyphs
 *          inside the Arabic translation (digits, punctuation, brand names)
 *          render correctly instead of as tofu boxes.
 *
 * Output has the same page count and same page size as the source.
 */

/* ------------------------------------------------------------------ */
/*  Fonts                                                              */
/* ------------------------------------------------------------------ */

let fontCache: { latin?: Uint8Array; arabic?: Uint8Array } = {};

async function loadLocalFont(filename: string): Promise<Uint8Array> {
  const p = path.join(process.cwd(), 'public', 'fonts', filename);
  try {
    const buf = await fs.readFile(p);
    if (!buf.byteLength) throw new Error(`font file is empty: ${p}`);
    return new Uint8Array(buf);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Required font "${filename}" not found at ${p}. (${detail})`);
  }
}

async function getFonts(): Promise<{ latin: Uint8Array; arabic: Uint8Array }> {
  if (!fontCache.latin) fontCache.latin = await loadLocalFont('NotoSans-Regular.ttf');
  if (!fontCache.arabic) fontCache.arabic = await loadLocalFont('NotoNaskhArabic-Regular.ttf');
  return { latin: fontCache.latin, arabic: fontCache.arabic };
}

/* ------------------------------------------------------------------ */
/*  Block extraction                                                   */
/* ------------------------------------------------------------------ */

const bidi = bidiFactory();
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function containsArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}

export interface TextBlock {
  /** Original (source-language) text. */
  text: string;
  /** Translated text — filled in by the API route before generation. */
  translatedText?: string;
  /** PDF user-space bbox (origin bottom-left). */
  bbox: { x: number; y: number; width: number; height: number };
  /** Approximate original font size in PDF points. */
  fontSize: number;
  /** Set by the safety gate when a block can't be replaced cleanly. */
  unsafeReason?: string;
  /** Where the block came from. OCR blocks sit on top of images by design. */
  source?: 'pdf' | 'ocr';
  /** Only set for source==='ocr'. Tesseract confidence 0-100. */
  ocrConfidence?: number;
}

export interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PageType =
  | 'text' /* normal text-heavy page */
  | 'image-heavy' /* significant images — apply per-block safety */
  | 'cover' /* cover / decorative — skip overlay entirely */
  | 'scanned' /* no extractable text — skip overlay */;

export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  /** Plain concatenated text — kept for backwards-compat / no-text detection. */
  text: string;
  /** Paragraph blocks with coordinates. */
  blocks: TextBlock[];
  /** Detected image/picture regions on the page (PDF user-space coords). */
  imageRegions: ImageRegion[];
  /** Classification used to decide how aggressively we overlay text. */
  pageType: PageType;
}

interface PdfJsTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Image region detection + page classification                       */
/* ------------------------------------------------------------------ */

// pdfjs-dist OPS constants (stable across recent versions). We use the
// integer values directly to avoid importing pdfjs-dist's bundle twice
// (unpdf already brings it in transitively).
const OPS_TRANSFORM = 12;
const OPS_SAVE = 13;
const OPS_RESTORE = 14;
const OPS_PAINT_JPEG_XOBJ = 82;
const OPS_PAINT_IMAGE_XOBJ = 85;
const OPS_PAINT_INLINE_IMAGE = 86;

function matMul(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

/** Compute the AABB of the unit square [0,1]² under the CTM (handles rotation). */
function ctmToImageBbox(ctm: number[]): ImageRegion {
  const apply = (u: number, v: number) => ({
    x: ctm[0] * u + ctm[2] * v + ctm[4],
    y: ctm[1] * u + ctm[3] * v + ctm[5],
  });
  const corners = [apply(0, 0), apply(1, 0), apply(0, 1), apply(1, 1)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

/**
 * Walk the page's operator list and record every image draw's bbox in
 * PDF user space. We do this so we can refuse to white-mask text that
 * lives on top of an image (would damage the image).
 */
async function detectImageRegions(pdfPage: {
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>;
}): Promise<ImageRegion[]> {
  try {
    const ops = await pdfPage.getOperatorList();
    const regions: ImageRegion[] = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i] as number[];
      switch (fn) {
        case OPS_SAVE:
          stack.push([...ctm]);
          break;
        case OPS_RESTORE:
          if (stack.length > 0) ctm = stack.pop()!;
          break;
        case OPS_TRANSFORM:
          if (Array.isArray(args) && args.length >= 6) ctm = matMul(ctm, args);
          break;
        case OPS_PAINT_IMAGE_XOBJ:
        case OPS_PAINT_INLINE_IMAGE:
        case OPS_PAINT_JPEG_XOBJ: {
          const bbox = ctmToImageBbox(ctm);
          // Filter out vanishingly small "images" — usually mask patterns
          // or sub-pixel artefacts, not real content.
          if (bbox.width > 8 && bbox.height > 8) regions.push(bbox);
          break;
        }
      }
    }
    return regions;
  } catch (err) {
    console.warn('[pdf] image-region detection failed:', err);
    return [];
  }
}

function classifyPage(
  blocks: TextBlock[],
  imageRegions: ImageRegion[],
  pageW: number,
  pageH: number,
): PageType {
  if (blocks.length === 0) return 'scanned';
  const pageArea = Math.max(1, pageW * pageH);
  const textArea = blocks.reduce((s, b) => s + b.bbox.width * b.bbox.height, 0);
  const imageArea = imageRegions.reduce((s, r) => s + r.width * r.height, 0);
  const textDensity = textArea / pageArea;
  const imageDensity = Math.min(1, imageArea / pageArea);

  // Decorative / cover: very little text, but visual content present.
  if (textDensity < 0.04 && (imageDensity > 0.10 || blocks.length < 5)) {
    return 'cover';
  }
  // Image-heavy: a lot of the page is images.
  if (imageDensity > 0.30) return 'image-heavy';
  return 'text';
}

function rectOverlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: ImageRegion,
): number {
  const xMin = Math.max(a.x, b.x);
  const yMin = Math.max(a.y, b.y);
  const xMax = Math.min(a.x + a.width, b.x + b.width);
  const yMax = Math.min(a.y + a.height, b.y + b.height);
  if (xMin >= xMax || yMin >= yMax) return 0;
  return (xMax - xMin) * (yMax - yMin);
}

/**
 * Decide whether it's safe to white-mask + overlay Arabic in this block.
 * Conservative: when in doubt, preserve the original page.
 *
 * OCR blocks intentionally bypass the "on-image" check because they were
 * extracted *from* an image — the whole point is to translate that text.
 * We still keep all other safety checks, and OCR mask boxes are kept tight
 * (1-2 px) to minimise damage to the surrounding image.
 */
export function checkBlockSafety(
  block: TextBlock,
  pageW: number,
  pageH: number,
  imageRegions: ImageRegion[],
): { safe: boolean; reason?: string } {
  const blockArea = Math.max(1, block.bbox.width * block.bbox.height);
  const pageArea = Math.max(1, pageW * pageH);

  if (blockArea > pageArea * 0.3) return { safe: false, reason: 'too-large' };
  if (block.bbox.width > pageW * 0.95) return { safe: false, reason: 'too-wide' };
  if (block.bbox.height > pageH * 0.5) return { safe: false, reason: 'too-tall' };

  if (block.bbox.x < -5 || block.bbox.y < -5) return { safe: false, reason: 'outside-page' };
  if (block.bbox.x + block.bbox.width > pageW + 5) {
    return { safe: false, reason: 'outside-page' };
  }
  if (block.bbox.y + block.bbox.height > pageH + 5) {
    return { safe: false, reason: 'outside-page' };
  }

  // Pure PDF text: refuse if the block overlaps a detected image by >50 %.
  // OCR text is allowed to sit on images.
  if (block.source !== 'ocr') {
    for (const img of imageRegions) {
      const overlap = rectOverlapArea(block.bbox, img);
      if (overlap / blockArea > 0.5) return { safe: false, reason: 'on-image' };
    }
  }

  return { safe: true };
}

interface LineAgg {
  yBaseline: number;
  height: number;
  xMin: number;
  xMax: number;
  parts: { x: number; width: number; str: string }[];
}

interface BlockAgg {
  lines: LineAgg[];
  xMin: number;
  xMax: number;
  yMin: number; // bottom of block (smallest baseline)
  yMax: number; // top of block (highest baseline + line height)
  heightAvg: number;
}

/**
 * Decide whether a page needs OCR. We do it on:
 *   - Truly empty pages (no extractable text — scanned).
 *   - Image-heavy pages with very little text (probably a screenshot or
 *     diagram with text inside it).
 *
 * Keep the criterion strict so we don't OCR the whole book.
 */
function pageNeedsOcr(
  blocks: TextBlock[],
  imageRegions: ImageRegion[],
  pageW: number,
  pageH: number,
): boolean {
  const pageArea = pageW * pageH;
  const textArea = blocks.reduce((s, b) => s + b.bbox.width * b.bbox.height, 0);
  const imageArea = imageRegions.reduce((s, r) => s + r.width * r.height, 0);
  if (blocks.length === 0) return true;
  if (blocks.length < 3 && imageArea / pageArea > 0.20) return true;
  if (textArea / pageArea < 0.03 && imageArea / pageArea > 0.20) return true;
  return false;
}

/**
 * Drop OCR blocks that significantly overlap text-layer blocks. We trust
 * the PDF text layer more than OCR.
 */
function dedupeOcrAgainstText(ocrBlocks: TextBlock[], pdfBlocks: TextBlock[]): TextBlock[] {
  if (!pdfBlocks.length) return ocrBlocks;
  return ocrBlocks.filter((o) => {
    const oArea = Math.max(1, o.bbox.width * o.bbox.height);
    for (const p of pdfBlocks) {
      const overlap = rectOverlapArea(o.bbox, p.bbox);
      if (overlap / oArea > 0.5) return false;
    }
    return true;
  });
}

export async function extractPdfBlocks(buffer: Uint8Array): Promise<ExtractedPage[]> {
  // Take a pristine copy FIRST — getDocumentProxy detaches the underlying
  // ArrayBuffer (pdfjs transfers ownership), and we need a fresh copy later
  // for the OCR renderer.
  const pdfBytesForOcr = new Uint8Array(buffer);

  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(buffer);
  const pages: ExtractedPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const pdfPage = await pdf.getPage(p);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const content = await pdfPage.getTextContent();
    const items = (content.items as PdfJsTextItem[]).filter(
      (it) => typeof it.str === 'string',
    );

    // Step 1 — collect items into line-segments. Items on the same baseline
    // with a small horizontal gap join a single line; a *large* horizontal
    // gap is treated as a column break and starts a new segment. This is
    // what lets us pull table cells / multi-column layouts apart instead of
    // smearing one Arabic paragraph across them.
    const lines: LineAgg[] = [];
    let current: LineAgg | null = null;
    for (const item of items) {
      const t = item.transform;
      if (!t) continue;
      const x = t[4];
      const y = t[5];
      const height = item.height || Math.abs(t[3]) || 10;
      const width = item.width || 0;
      const str = item.str ?? '';

      const onSameBaseline =
        current && Math.abs(current.yBaseline - y) < Math.max(2, current.height * 0.5);

      // Compute horizontal gap from the current line's rightmost edge.
      let largeXGap = false;
      if (current && onSameBaseline) {
        const gap = x - current.xMax;
        // Threshold: ~1.5x line height worth of empty space. Slightly tighter
        // for very small fonts so captions don't get split.
        const gapLimit = Math.max(current.height * 1.5, 8);
        largeXGap = gap > gapLimit;
      }

      if (onSameBaseline && !largeXGap) {
        current!.parts.push({ x, width, str });
        current!.xMin = Math.min(current!.xMin, x);
        current!.xMax = Math.max(current!.xMax, x + width);
        current!.height = Math.max(current!.height, height);
      } else {
        if (current) lines.push(current);
        current = {
          yBaseline: y,
          height,
          xMin: x,
          xMax: x + width,
          parts: [{ x, width, str }],
        };
      }

      if (item.hasEOL && current) {
        lines.push(current);
        current = null;
      }
    }
    if (current) lines.push(current);

    // Convert line parts → text (sorted by X for safety) and skip empty lines.
    const lineTexts = lines
      .map((l) => {
        l.parts.sort((a, b) => a.x - b.x);
        // Insert single space between adjacent parts (pdfjs strips spaces).
        let s = '';
        for (let i = 0; i < l.parts.length; i++) {
          if (i > 0) s += ' ';
          s += l.parts[i].str;
        }
        return { line: l, text: s.replace(/\s+/g, ' ').trim() };
      })
      .filter((x) => x.text.length > 0);

    // Step 2 — group consecutive lines into paragraph blocks.
    // PDF Y axis points up, so a "next line down" has *smaller* y baseline.
    // Sort lines by y desc (top→bottom).
    lineTexts.sort((a, b) => b.line.yBaseline - a.line.yBaseline);

    const blocks: BlockAgg[] = [];
    let cur: BlockAgg | null = null;
    for (const { line } of lineTexts) {
      if (cur) {
        const lastLine = cur.lines[cur.lines.length - 1];
        const vGap = lastLine.yBaseline - line.yBaseline; // positive when going down
        const verticallyClose = vGap > 0 && vGap < line.height * 2.2;
        // Require the new line's x-range to overlap the block's x-range. If
        // it's off to the side it's probably a different column / table cell.
        const overlap = Math.max(
          0,
          Math.min(cur.xMax, line.xMax) - Math.max(cur.xMin, line.xMin),
        );
        const blockWidth = cur.xMax - cur.xMin;
        const lineWidth = Math.max(1, line.xMax - line.xMin);
        const overlapRatio = overlap / Math.max(blockWidth, lineWidth);
        const sameColumn = overlapRatio > 0.3;
        if (verticallyClose && sameColumn) {
          cur.lines.push(line);
          cur.xMin = Math.min(cur.xMin, line.xMin);
          cur.xMax = Math.max(cur.xMax, line.xMax);
          cur.yMin = Math.min(cur.yMin, line.yBaseline - line.height * 0.25);
          cur.yMax = Math.max(cur.yMax, line.yBaseline + line.height);
          cur.heightAvg = (cur.heightAvg + line.height) / 2;
          continue;
        }
      }
      if (cur) blocks.push(cur);
      cur = {
        lines: [line],
        xMin: line.xMin,
        xMax: line.xMax,
        yMin: line.yBaseline - line.height * 0.25,
        yMax: line.yBaseline + line.height,
        heightAvg: line.height,
      };
    }
    if (cur) blocks.push(cur);

    const extractedBlocks: TextBlock[] = blocks.map((b) => {
      const blockText = b.lines
        .map((l) =>
          l.parts
            .map((p) => p.str)
            .join('')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .filter(Boolean)
        .join(' ');
      return {
        text: blockText,
        bbox: {
          x: b.xMin,
          y: b.yMin,
          width: Math.max(1, b.xMax - b.xMin),
          height: Math.max(1, b.yMax - b.yMin),
        },
        fontSize: Math.max(6, Math.min(36, b.heightAvg)),
      };
    });

    // Tag every PDF text-layer block.
    for (const b of extractedBlocks) b.source = 'pdf';

    // Detect image regions so we can both classify the page and decide which
    // blocks are safe to overlay.
    const imageRegions = await detectImageRegions(
      pdfPage as unknown as { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }> },
    );

    // OCR pass: only when the text layer is sparse / missing. OCR text
    // bypasses the on-image safety check (it's *meant* to live on images).
    let ocrCount = 0;
    if (pageNeedsOcr(extractedBlocks, imageRegions, viewport.width, viewport.height)) {
      console.log(
        `[ocr] running on page ${p}/${pdf.numPages} (text-layer too sparse)…`,
      );
      try {
        const ocrBlocks = await ocrPage(
          pdfBytesForOcr,
          p,
          viewport.width,
          viewport.height,
        );
        const deduped = dedupeOcrAgainstText(
          ocrBlocks.map((o): TextBlock => ({
            text: o.text,
            bbox: o.bbox,
            fontSize: o.fontSize,
            source: 'ocr',
            ocrConfidence: o.confidence,
          })),
          extractedBlocks,
        );
        ocrCount = deduped.length;
        extractedBlocks.push(...deduped);
      } catch (err) {
        console.warn(
          `[ocr] failed on page ${p}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const pageType = classifyPage(
      extractedBlocks,
      imageRegions,
      viewport.width,
      viewport.height,
    );

    // Pre-flag unsafe blocks at extraction time so the API route can also
    // skip translating them (saves provider calls). Safety is re-checked at
    // render time too.
    for (const b of extractedBlocks) {
      const check = checkBlockSafety(b, viewport.width, viewport.height, imageRegions);
      if (!check.safe) b.unsafeReason = check.reason;
    }

    const concatText = extractedBlocks.map((b) => b.text).join('\n').trim();
    pages.push({
      pageNumber: p,
      width: viewport.width,
      height: viewport.height,
      text: concatText,
      blocks: extractedBlocks,
      imageRegions,
      pageType,
    });

    const unsafe = extractedBlocks.filter((b) => b.unsafeReason).length;
    const pdfBlockCount = extractedBlocks.filter((b) => b.source === 'pdf').length;
    console.log(
      `[extract] page ${p}/${pdf.numPages} — type=${pageType}, pdf_blocks=${pdfBlockCount}, ocr_blocks=${ocrCount}, images=${imageRegions.length}, unsafe=${unsafe}, dims=${Math.round(viewport.width)}x${Math.round(viewport.height)}pt`,
    );
  }

  return pages;
}

/** Back-compat: callers that only want page text. */
export async function extractPdfPages(buffer: Uint8Array): Promise<ExtractedPage[]> {
  return extractPdfBlocks(buffer);
}

/* ------------------------------------------------------------------ */
/*  Generator                                                          */
/* ------------------------------------------------------------------ */

export interface GenerateOptions {
  pages: ExtractedPage[];
  targetLang: string;
  /** Original PDF bytes — REQUIRED for in-place overlay. */
  originalPdf?: Uint8Array;
}

const WHITE = rgb(1, 1, 1);
const TEXT_COLOR = rgb(0.08, 0.10, 0.18);

export async function generateTranslatedPdf(opts: GenerateOptions): Promise<Uint8Array> {
  const { pages, originalPdf } = opts;
  if (!originalPdf || !originalPdf.byteLength) {
    throw new Error('In-place translation requires the original PDF bytes.');
  }
  console.log(`[pdf] starting in-place overlay — ${pages.length} source page(s)`);

  // Try Chromium-rendered Arabic overlay first. It has the most reliable
  // Arabic shaping + BiDi behavior because the browser handles it natively.
  // If Chromium can't launch (missing Chrome binary, sandbox issues, etc.)
  // we fall back to drawing Arabic with pdf-lib + arabic-reshaper + bidi-js.
  try {
    console.log('[pdf] rendering method: Chromium HTML overlay');
    return await generateViaChromium(opts);
  } catch (err) {
    console.warn(
      '[pdf] Chromium overlay failed, falling back to pdf-lib Arabic shaping/BiDi:',
      err instanceof Error ? err.message : err,
    );
    console.log('[pdf] rendering method: pdf-lib + Arabic shaping/BiDi (fallback)');
    return await generateViaPdfLib(opts);
  }
}

/* ------------------------------------------------------------------ */
/*  Chromium HTML overlay path (preferred)                             */
/* ------------------------------------------------------------------ */

async function generateViaChromium(opts: GenerateOptions): Promise<Uint8Array> {
  const { pages, originalPdf } = opts;

  // Lazy-load puppeteer so the API still loads if the package is missing.
  const puppeteer = (await import('puppeteer')).default;
  const fontDataUri = await getArabicFontDataUri();

  const output = await PDFDocument.create();
  output.registerFontkit(fontkit);

  const originalDoc = await PDFDocument.load(originalPdf!, { ignoreEncryption: true });
  console.log(
    `[pdf] loaded original PDF — ${originalDoc.getPageCount()} page(s). Original vector content preserved via copyPages (no rasterization).`,
  );
  console.log(
    `[pdf] overlay PNG render scale: deviceScaleFactor=2.0 (≈192 DPI). Original pages remain at their native (vector) resolution.`,
  );
  const copied = await output.copyPages(originalDoc, originalDoc.getPageIndices());

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  let totalOverlaid = 0;
  let totalUntouched = 0;
  let totalFitted = 0;
  let totalShrunk = 0;
  let totalOverflow = 0;

  try {
    const page = await browser.newPage();
    // JS is on because we run an auto-fit script after fonts load to shrink
    // any block whose Arabic translation doesn't fit its original bbox.
    await page.setJavaScriptEnabled(true);

    for (let i = 0; i < pages.length; i++) {
      const source = pages[i];
      const origPage = copied[i];
      if (!origPage) continue;
      output.addPage(origPage);
      const pageInOutput = output.getPage(output.getPageCount() - 1);

      // Use the actual page dimensions from the output (handles weird sizes).
      const pageW = pageInOutput.getWidth();
      const pageH = pageInOutput.getHeight();
      const imageRegions = source.imageRegions ?? [];

      // Per-block safety only. We no longer skip whole pages — every page
      // gets an overlay attempt, and individual unsafe blocks are filtered
      // out. This translates as much text as possible while still protecting
      // the page's images/graphics.
      const allBlocks = source.blocks ?? [];
      const renderable: OverlayBlock[] = [];
      let skippedUnsafe = 0;
      const skipReasons: Record<string, number> = {};
      for (const b of allBlocks) {
        const translated = (b.translatedText ?? '').trim();
        if (!translated) continue;
        const safety = checkBlockSafety(b, pageW, pageH, imageRegions);
        if (!safety.safe) {
          skippedUnsafe++;
          const r = safety.reason || 'unknown';
          skipReasons[r] = (skipReasons[r] || 0) + 1;
          continue;
        }
        renderable.push({
          bbox: b.bbox,
          originalText: b.text,
          translatedText: translated,
          fontSize: b.fontSize,
          source: b.source ?? 'pdf',
        });
      }

      if (renderable.length === 0) {
        totalUntouched++;
        console.log(
          `[pdf] page ${i + 1}/${pages.length} type=${source.pageType} — no safe blocks (skippedUnsafe=${skippedUnsafe}), preserved as-is`,
        );
        continue;
      }

      const { png: overlayPng, stats } = await renderOverlayPng(
        page,
        renderable,
        pageW,
        pageH,
        fontDataUri,
      );
      const pngImage = await output.embedPng(overlayPng);
      pageInOutput.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
      });
      totalOverlaid++;
      totalFitted += stats.fitted;
      totalShrunk += stats.shrunk;
      totalOverflow += stats.overflow;

      const reasonsStr = Object.entries(skipReasons)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      const ocrTotal = allBlocks.filter((b) => b.source === 'ocr').length;
      const pdfTotal = allBlocks.filter((b) => b.source !== 'ocr').length;
      console.log(
        `[pdf] page ${i + 1}/${pages.length} type=${source.pageType} dims=${Math.round(pageW)}x${Math.round(pageH)}pt images=${imageRegions.length} pdf_blocks=${pdfTotal} ocr_blocks=${ocrTotal} translated=${renderable.length} skipped_unsafe=${skippedUnsafe}${reasonsStr ? ' (' + reasonsStr + ')' : ''} fitted=${stats.fitted} shrunk=${stats.shrunk} overflow=${stats.overflow}`,
      );
    }
  } finally {
    await browser.close();
  }

  console.log(
    `[pdf] Chromium summary — overlaid=${totalOverlaid}, untouched=${totalUntouched}, fitted=${totalFitted}, shrunk=${totalShrunk}, overflow=${totalOverflow}, total_pages=${output.getPageCount()}`,
  );

  const bytes = await output.save();
  console.log(`[pdf] saved ${bytes.byteLength} bytes`);
  return bytes;
}

interface OverlayStats {
  total: number;
  fitted: number;
  shrunk: number;
  overflow: number;
}

async function renderOverlayPng(
  page: import('puppeteer').Page,
  blocks: OverlayBlock[],
  pageWidth: number,
  pageHeight: number,
  fontDataUri: string,
): Promise<{ png: Uint8Array; stats: OverlayStats }> {
  const html = buildOverlayHtml(blocks, pageWidth, pageHeight, fontDataUri);
  // Convert pt → CSS px. 1pt = 96/72 px. deviceScaleFactor=2 produces a
  // crisp PNG without bloating the file too much.
  const cssPxPerPt = 96 / 72;
  const viewportW = Math.max(1, Math.ceil(pageWidth * cssPxPerPt));
  const viewportH = Math.max(1, Math.ceil(pageHeight * cssPxPerPt));
  await page.setViewport({
    width: viewportW,
    height: viewportH,
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
  // Wait for the embedded font to actually load before measuring.
  await page.evaluateHandle('document.fonts.ready');

  // Auto-fit: for every block, shrink the font size until either its
  // content fits the box height or we hit the minimum readable size.
  // Done in the browser so we use Chromium's real layout engine.
  const stats: OverlayStats = await page.evaluate(() => {
    const MIN_PT = 6; // minimum readable size in points
    const ptToPx = (pt: number) => pt * (96 / 72);
    const minPx = ptToPx(MIN_PT);

    const blocks = Array.from(document.querySelectorAll<HTMLDivElement>('.block'));
    let fitted = 0;
    let shrunk = 0;
    let overflow = 0;
    for (const el of blocks) {
      const cs = window.getComputedStyle(el);
      let sizePx = parseFloat(cs.fontSize);
      const startedAt = sizePx;
      let guard = 0;
      while (
        (el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1) &&
        sizePx > minPx &&
        guard < 80
      ) {
        sizePx = Math.max(minPx, sizePx - 0.5);
        el.style.fontSize = `${sizePx}px`;
        guard++;
      }
      if (sizePx < startedAt) shrunk++;
      if (el.scrollHeight > el.clientHeight + 1) overflow++;
      else fitted++;
    }
    return { total: blocks.length, fitted, shrunk, overflow };
  });

  const buf = await page.screenshot({
    type: 'png',
    omitBackground: true,
    clip: { x: 0, y: 0, width: viewportW, height: viewportH },
  });
  return { png: new Uint8Array(buf as Buffer), stats };
}

/* ------------------------------------------------------------------ */
/*  pdf-lib drawing path (fallback)                                    */
/* ------------------------------------------------------------------ */

async function generateViaPdfLib(opts: GenerateOptions): Promise<Uint8Array> {
  const { pages, originalPdf } = opts;
  const output = await PDFDocument.create();
  output.registerFontkit(fontkit);
  const { latin, arabic } = await getFonts();
  const arabicFont = await output.embedFont(arabic, { subset: true });
  const latinFont = await output.embedFont(latin, { subset: true });
  const fonts: FontPair = {
    arabic: arabicFont,
    latin: latinFont,
    arabicFK: fontkit.create(arabic) as unknown as FontKitFont,
    latinFK: fontkit.create(latin) as unknown as FontKitFont,
  };

  const originalDoc = await PDFDocument.load(originalPdf!, { ignoreEncryption: true });
  console.log(`[pdf] loaded original PDF — ${originalDoc.getPageCount()} page(s)`);
  const copied = await output.copyPages(originalDoc, originalDoc.getPageIndices());

  let totalBlocksDrawn = 0;
  let totalBlocksSkipped = 0;
  let totalBlocksFailed = 0;

  for (let i = 0; i < pages.length; i++) {
    const source = pages[i];
    const origPage = copied[i];
    if (!origPage) continue;
    output.addPage(origPage);
    const page = output.getPage(output.getPageCount() - 1);

    if (!source.blocks || source.blocks.length === 0) continue;

    let drawn = 0;
    let skipped = 0;
    let failed = 0;
    for (const block of source.blocks) {
      const translated = (block.translatedText ?? '').trim();
      if (!translated) {
        skipped++;
        continue;
      }
      try {
        coverAndDrawBlock(page, block, translated, fonts);
        drawn++;
      } catch (err) {
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(
          `[pdf] page ${i + 1}: failed to render block at (${block.bbox.x.toFixed(0)},${block.bbox.y.toFixed(0)}): ${reason}`,
        );
      }
    }
    totalBlocksDrawn += drawn;
    totalBlocksSkipped += skipped;
    totalBlocksFailed += failed;
  }

  console.log(
    `[pdf] pdf-lib summary — drawn=${totalBlocksDrawn}, skipped=${totalBlocksSkipped}, failed=${totalBlocksFailed}`,
  );
  const bytes = await output.save();
  console.log(`[pdf] saved ${bytes.byteLength} bytes`);
  return bytes;
}

/* ------------------------------------------------------------------ */
/*  Block rendering                                                    */
/* ------------------------------------------------------------------ */

interface FontPair {
  arabic: PDFFont;
  latin: PDFFont;
  arabicFK: FontKitFont;
  latinFK: FontKitFont;
}
interface FontKitFont {
  hasGlyphForCodePoint?: (cp: number) => boolean;
  glyphForCodePoint?: (cp: number) => { id: number };
}

const MIN_FONT_SIZE = 5.5;
const PAD_X = 1;
const PAD_Y = 1;

function coverAndDrawBlock(
  page: PDFPage,
  block: TextBlock,
  translated: string,
  fonts: FontPair,
): void {
  // Mask the original English with a slightly expanded white rectangle so we
  // catch antialiased glyph edges from the original.
  const pad = 1.5;
  page.drawRectangle({
    x: block.bbox.x - pad,
    y: block.bbox.y - pad,
    width: block.bbox.width + pad * 2,
    height: block.bbox.height + pad * 2,
    color: WHITE,
  });

  // Adaptively pick the largest font size at which the translated Arabic
  // wraps within the block bbox without overflowing vertically.
  const innerW = Math.max(10, block.bbox.width - PAD_X * 2);
  const innerH = Math.max(8, block.bbox.height - PAD_Y * 2);
  const startSize = Math.max(MIN_FONT_SIZE, Math.min(block.fontSize, 18));

  const shaped = containsArabic(translated)
    ? (ArabicReshaper.convertArabic(translated) as string)
    : translated;

  let chosenSize = MIN_FONT_SIZE;
  let chosenLines: string[] = [];
  for (let size = startSize; size >= MIN_FONT_SIZE - 0.01; size -= 0.5) {
    const lines = wrapByWidth(shaped, size, innerW, fonts);
    const lineHeight = size * 1.25;
    if (lines.length * lineHeight <= innerH) {
      chosenSize = size;
      chosenLines = lines;
      break;
    }
    if (size <= MIN_FONT_SIZE) {
      chosenSize = MIN_FONT_SIZE;
      chosenLines = lines;
    }
  }
  if (chosenLines.length === 0) {
    chosenLines = wrapByWidth(shaped, MIN_FONT_SIZE, innerW, fonts);
    chosenSize = MIN_FONT_SIZE;
  }

  const lineHeight = chosenSize * 1.25;
  // Draw from top of the block downward.
  let y = block.bbox.y + block.bbox.height - PAD_Y - chosenSize;
  const rtl = containsArabic(translated);

  for (const line of chosenLines) {
    if (y < block.bbox.y - 1) break; // hard stop, don't write outside box
    const visual = rtl ? bidiReorder(line, 'rtl') : line;
    drawRichLine(page, visual, chosenSize, block.bbox.x + PAD_X, y, innerW, rtl, fonts);
    y -= lineHeight;
  }
}

function wrapByWidth(
  text: string,
  size: number,
  maxWidth: number,
  fonts: FontPair,
): string[] {
  const out: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (measureWidth(trial, size, fonts) <= maxWidth) {
        line = trial;
        continue;
      }
      if (line) out.push(line);
      if (measureWidth(w, size, fonts) > maxWidth) {
        let chunk = '';
        for (const ch of w) {
          if (measureWidth(chunk + ch, size, fonts) > maxWidth) {
            if (chunk) out.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function measureWidth(text: string, size: number, fonts: FontPair): number {
  let total = 0;
  for (const run of splitIntoRuns(text, fonts)) {
    try {
      total += run.font.widthOfTextAtSize(run.text, size);
    } catch {
      total += run.text.length * size * 0.5;
    }
  }
  return total;
}

function bidiReorder(shaped: string, baseDir: 'ltr' | 'rtl'): string {
  const levels = bidi.getEmbeddingLevels(shaped, baseDir);
  const flips = bidi.getReorderSegments(shaped, levels);
  const arr = shaped.split('');
  for (const [start, end] of flips) {
    const slice = arr.slice(start, end + 1).reverse();
    arr.splice(start, end - start + 1, ...slice);
  }
  return arr.join('');
}

function splitIntoRuns(
  text: string,
  fonts: FontPair,
): Array<{ text: string; font: PDFFont }> {
  const runs: Array<{ text: string; font: PDFFont }> = [];
  if (!text) return runs;
  let curText = '';
  let curFont: PDFFont | null = null;
  for (const ch of text) {
    const font = pickFontForChar(ch, fonts);
    if (curFont === null) {
      curFont = font;
      curText = ch;
    } else if (font === curFont) {
      curText += ch;
    } else {
      runs.push({ text: curText, font: curFont });
      curFont = font;
      curText = ch;
    }
  }
  if (curFont !== null && curText) runs.push({ text: curText, font: curFont });
  return runs;
}

function pickFontForChar(ch: string, fonts: FontPair): PDFFont {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return fonts.latin;
  if (hasGlyph(fonts.arabicFK, cp)) return fonts.arabic;
  if (hasGlyph(fonts.latinFK, cp)) return fonts.latin;
  return cp >= 0x0600 && cp <= 0x08ff ? fonts.arabic : fonts.latin;
}

function hasGlyph(fk: FontKitFont, cp: number): boolean {
  if (typeof fk.hasGlyphForCodePoint === 'function') return fk.hasGlyphForCodePoint(cp);
  if (typeof fk.glyphForCodePoint === 'function') {
    const g = fk.glyphForCodePoint(cp);
    return !!g && g.id !== 0;
  }
  return true;
}

function drawRichLine(
  page: PDFPage,
  visualText: string,
  size: number,
  startX: number,
  baselineY: number,
  contentWidth: number,
  rtl: boolean,
  fonts: FontPair,
): void {
  if (!visualText) return;
  const runs = splitIntoRuns(visualText, fonts).map((r) => {
    let w: number;
    try {
      w = r.font.widthOfTextAtSize(r.text, size);
    } catch {
      w = r.text.length * size * 0.5;
    }
    return { ...r, width: w };
  });
  const totalWidth = runs.reduce((s, r) => s + r.width, 0);
  let x = rtl ? startX + contentWidth - totalWidth : startX;
  for (const r of runs) {
    try {
      page.drawText(r.text, { x, y: baselineY, size, font: r.font, color: TEXT_COLOR });
    } catch {
      /* swallow encoder failure on a single run */
    }
    x += r.width;
  }
}
