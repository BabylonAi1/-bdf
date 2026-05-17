/**
 * OCR pipeline for pages where pdfjs gave us little or no text layer.
 *
 *   1. Render the source PDF page to a high-DPI PNG via unpdf + napi-rs/canvas.
 *   2. Run tesseract.js (English) on the PNG.
 *   3. Convert OCR word bboxes (image px, top-left origin) to PDF user-space
 *      coordinates (PDF points, bottom-left origin) and group adjacent words
 *      into line-blocks ready for translation.
 *
 * OCR is invoked on demand from extractPdfBlocks() — only for pages that
 * would otherwise have no/few translatable blocks.
 */

export interface OcrBlock {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  fontSize: number;
  confidence: number;
}

const RENDER_SCALE = 3; // Target ~216 DPI for accurate OCR on 12pt body text.
const MIN_CONFIDENCE = 60;
const MIN_WORD_LEN = 1;

interface TesseractBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface TesseractWord {
  text: string;
  confidence: number;
  bbox: TesseractBbox;
}
interface TesseractLine {
  text: string;
  confidence: number;
  bbox: TesseractBbox;
  words?: TesseractWord[];
}
interface TesseractParagraph {
  text?: string;
  confidence?: number;
  bbox?: TesseractBbox;
  lines?: TesseractLine[];
}
interface TesseractBlock {
  paragraphs?: TesseractParagraph[];
  text?: string;
  bbox?: TesseractBbox;
}
type TesseractWorker = {
  recognize: (
    image: Uint8Array | Buffer,
    options?: unknown,
    output?: { blocks?: boolean; text?: boolean },
  ) => Promise<{
    data: {
      blocks?: TesseractBlock[];
      text?: string;
    };
  }>;
  terminate: () => Promise<unknown>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      // English only for the source side; the translator handles the rest.
      const w = (await createWorker('eng', undefined, {
        // Silence tesseract's progress logger.
        logger: () => undefined,
      })) as unknown as TesseractWorker;
      return w;
    })();
  }
  return workerPromise;
}

/** Useful when shutting down — not invoked during a normal request. */
export async function disposeOcr(): Promise<void> {
  if (workerPromise) {
    try {
      const w = await workerPromise;
      await w.terminate();
    } catch {
      /* ignore */
    } finally {
      workerPromise = null;
    }
  }
}

/**
 * Render one PDF page at high DPI and return its PNG bytes.
 * Uses unpdf's renderPageAsImage (under the hood: pdfjs + napi-rs/canvas).
 */
async function renderPdfPageAsPng(
  pdfBytes: Uint8Array,
  pageNumber: number,
  scale: number = RENDER_SCALE,
): Promise<Uint8Array> {
  // unpdf re-uses the buffer; pass a fresh copy so it doesn't conflict with
  // any other consumer holding a reference.
  const copy = new Uint8Array(pdfBytes);
  const unpdf = await import('unpdf');
  const arrayBuf = (await unpdf.renderPageAsImage(copy, pageNumber, {
    // unpdf v1.6 uses `canvasImport` (used to be `canvas` in older versions).
    canvasImport: () => import('@napi-rs/canvas'),
    scale,
  })) as ArrayBuffer | Uint8Array;
  return arrayBuf instanceof Uint8Array ? arrayBuf : new Uint8Array(arrayBuf);
}

/**
 * OCR the given page and return line-level blocks already in PDF user-space.
 */
export async function ocrPage(
  pdfBytes: Uint8Array,
  pageNumber: number,
  pdfWidth: number,
  pdfHeight: number,
): Promise<OcrBlock[]> {
  let png: Uint8Array;
  try {
    png = await renderPdfPageAsPng(pdfBytes, pageNumber, RENDER_SCALE);
  } catch (err) {
    console.warn(`[ocr] render failed for page ${pageNumber}:`, err instanceof Error ? err.message : err);
    return [];
  }

  let result;
  try {
    const worker = await getWorker();
    // tesseract.js v6+ disables structured output by default; we need
    // blocks → paragraphs → lines to get per-line bboxes for layout-preserving
    // overlay.
    result = await worker.recognize(png, undefined, { blocks: true, text: false });
  } catch (err) {
    console.warn(`[ocr] tesseract failed on page ${pageNumber}:`, err instanceof Error ? err.message : err);
    return [];
  }

  const scale = RENDER_SCALE;
  const blocks: OcrBlock[] = [];

  // Walk the blocks/paragraphs/lines tree and collect line-level entries.
  for (const block of result.data.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const clean = (line.text || '').replace(/\s+/g, ' ').trim();
        if (!clean) continue;
        if ((line.confidence ?? 0) < MIN_CONFIDENCE) continue;
        if (clean.length < MIN_WORD_LEN) continue;

        const { x0, y0, x1, y1 } = line.bbox;
        const px = x0 / scale;
        const pw = (x1 - x0) / scale;
        const ptop = y0 / scale;
        const ph = (y1 - y0) / scale;
        if (pw < 1 || ph < 1) continue;
        // image-top → PDF-bottom (Y flip)
        const py = pdfHeight - (ptop + ph);

        blocks.push({
          text: clean,
          bbox: { x: px, y: py, width: pw, height: ph },
          fontSize: ph,
          confidence: line.confidence,
        });
      }
    }
  }

  // Lines are already grouped per Tesseract — no extra pass needed.
  return blocks;
}

