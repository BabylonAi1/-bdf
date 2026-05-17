import { promises as fs } from 'fs';
import path from 'path';

/**
 * Build a transparent HTML overlay for one PDF page. Each translated text
 * block is rendered as an absolutely-positioned <div> at the block's PDF
 * bounding box, with the correct CSS for Arabic so the browser (Chromium)
 * handles shaping, BiDi reordering, and mixed Arabic/Latin segments natively.
 *
 * The body is transparent and only the .block elements have a white
 * background — so when this is rendered to a PNG and overlaid on the original
 * PDF page, images and graphics outside the text blocks remain untouched.
 */

let fontDataUriCache: string | undefined;

export async function getArabicFontDataUri(): Promise<string> {
  if (fontDataUriCache) return fontDataUriCache;
  const fontPath = path.join(
    process.cwd(),
    'public',
    'fonts',
    'NotoNaskhArabic-Regular.ttf',
  );
  const buf = await fs.readFile(fontPath);
  fontDataUriCache = `data:font/ttf;base64,${buf.toString('base64')}`;
  return fontDataUriCache;
}

export interface OverlayBlock {
  bbox: { x: number; y: number; width: number; height: number };
  /** Source-language text — used for size-fit hints only, not displayed. */
  originalText: string;
  /** Arabic translation that will actually be drawn. */
  translatedText: string;
  /** Approximate original font size, in PDF points. */
  fontSize: number;
  /** Where this block came from. OCR blocks live on images so their white
   *  mask is kept as tight as possible. */
  source?: 'pdf' | 'ocr';
}

export function buildOverlayHtml(
  blocks: OverlayBlock[],
  pageWidth: number,
  pageHeight: number,
  fontDataUri: string,
): string {
  const blockHtml = blocks
    .filter((b) => b.translatedText && b.translatedText.trim())
    .map((b) => {
      // OCR blocks sit on top of images; keep their mask as tight as
      // possible so we don't damage the surrounding image. Regular PDF text
      // gets a slightly bigger pad to cover antialiased glyph edges.
      const isOcr = b.source === 'ocr';
      const padOut = isOcr ? 0.2 : 0.6;
      const x = b.bbox.x - padOut;
      const y = b.bbox.y - padOut;
      const w = b.bbox.width + padOut * 2;
      const h = b.bbox.height + padOut * 2;
      // Start at the original font size (clamped) and let the auto-fit
      // script shrink it if the Arabic translation doesn't fit.
      const baseSize = Math.max(7, Math.min(b.fontSize, 18));
      const klass = isOcr ? 'block block-ocr' : 'block';
      return `<div class="${klass}" data-orig-pt="${num(baseSize)}" style="
        left:${num(x)}pt;
        bottom:${num(y)}pt;
        width:${num(w)}pt;
        height:${num(h)}pt;
        font-size:${num(baseSize)}pt;
      ">${escapeAndWrapLatin(b.translatedText)}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: 'NotoNaskhArabic';
    src: url(${fontDataUri}) format('truetype');
    font-display: block;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${num(pageWidth)}pt;
    height: ${num(pageHeight)}pt;
    background: transparent;
  }
  body { position: relative; }
  .block {
    position: absolute;
    background: #ffffff;
    color: #111827;
    direction: rtl;
    text-align: right;
    unicode-bidi: plaintext;
    font-family: 'NotoNaskhArabic', 'Noto Sans Arabic', 'Tahoma', 'Arial', sans-serif;
    line-height: 1.5;
    overflow: hidden;
    word-wrap: break-word;
    overflow-wrap: break-word;
    padding: 0.5pt 1.5pt;
    /* Extend the white background slightly past the bbox so we catch
       antialiased edges of the original glyphs. */
    box-shadow: 0 0 0 0.6pt #ffffff;
    box-sizing: border-box;
  }
  /* Latin / digit runs inside Arabic — kept as LTR isolates so BiDi works. */
  span.ltr { direction: ltr; unicode-bidi: isolate; white-space: nowrap; }
</style>
</head>
<body>
${blockHtml}
</body>
</html>`;
}

/**
 * Wrap runs of ASCII letters/digits (e.g. "PDF", "Linux", "VirtualBox",
 * "123") in <span dir="ltr"> so the browser treats them as LTR isolates
 * inside the RTL Arabic flow. Also guarantees a thin space before and
 * after the run so adjacent Arabic / Latin text never visually glues
 * together — a common Google-Translate output quirk.
 *
 * NOTE: called on already-escaped HTML, so we re-wrap only plain ASCII runs.
 */
function escapeAndWrapLatin(raw: string): string {
  // Do escaping and isolation in ONE pass on raw text. If we escape first
  // and then match Latin, the regex will match `quot` inside `&quot;` and
  // insert <span> tags inside the entity, breaking it.
  const RE2 = /([A-Za-z][A-Za-z0-9._-]{1,}|[0-9]+(?:[.,][0-9]+)*)/g;
  let out = '';
  let last2 = 0;
  let mm: RegExpExecArray | null;
  while ((mm = RE2.exec(raw)) !== null) {
    const s = mm.index;
    const e = s + mm[0].length;
    const b = s > 0 ? raw[s - 1] : ' ';
    const a = e < raw.length ? raw[e] : ' ';
    const sb = !/\s|[(\[<>«"']/.test(b);
    const sa = !/\s|[).,;:!?\]>»"']/.test(a);
    out += escapeHtml(raw.slice(last2, s));
    out += (sb ? ' ' : '') + `<span class="ltr">${mm[0]}</span>` + (sa ? ' ' : '');
    last2 = e;
  }
  out += escapeHtml(raw.slice(last2));
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(n: number): string {
  // Avoid scientific notation; trim excess decimals.
  return Number(n.toFixed(3)).toString();
}
