/**
 * Pluggable translation service.
 *
 *   1. LibreTranslate     — used when LIBRETRANSLATE_URL is set.
 *   2. Google Translate   — free public endpoint used by the Google Translate
 *                           widget. Default. No API key required. Best quality
 *                           and the most reliable free option for Arabic.
 *
 * The whole rest of the app talks to `translateText()` only, so the provider
 * can be swapped here without touching call sites.
 */

import { protectTerms, restoreTerms } from './glossary';

export interface TranslateOptions {
  text: string;
  sourceLang: string; // ISO code or "auto"
  targetLang: string; // ISO code
  signal?: AbortSignal;
}

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';

// Google's free endpoint accepts ~5000 chars per request; stay well under.
const MAX_CHUNK_CHARS = 4500;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 600;

export async function translateText(opts: TranslateOptions): Promise<string> {
  const { text, sourceLang, targetLang, signal } = opts;
  if (!text.trim()) return '';
  if (sourceLang === targetLang) return text;

  // Protect technical terms / URLs / file paths / versions so the provider
  // can't translate them away. Tokens are restored after translation.
  const { protected: protectedText, tokens } = protectTerms(text);

  let raw: string;
  if (process.env.LIBRETRANSLATE_URL) {
    raw = await libreTranslate({ text: protectedText, sourceLang, targetLang, signal });
  } else {
    raw = await googleTranslate(protectedText, sourceLang, targetLang, signal);
  }
  return restoreTerms(raw, tokens);
}

async function googleTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal?: AbortSignal,
): Promise<string> {
  const chunks = chunkText(text, MAX_CHUNK_CHARS);
  const out: string[] = [];
  for (const chunk of chunks) {
    out.push(await callGoogle(chunk, sourceLang, targetLang, signal));
  }
  return out.join('');
}

async function callGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal?: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang === 'auto' ? 'auto' : sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Per-attempt timeout. Combined with any outer abort signal.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const res = await fetch(`${GOOGLE_URL}?${params.toString()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          Accept: 'application/json',
        },
        signal: ctrl.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Transient ${res.status}`);
      }
      if (!res.ok) throw new Error(`Translation API responded ${res.status}`);

      const data = (await res.json()) as unknown;
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Unexpected translation payload');
      }
      const segments = data[0] as Array<unknown>;
      return segments
        .map((s) => (Array.isArray(s) && typeof s[0] === 'string' ? (s[0] as string) : ''))
        .join('');
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt) + Math.random() * 200;
        await sleep(delay);
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Translation failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function libreTranslate(args: {
  text: string;
  sourceLang: string;
  targetLang: string;
  signal?: AbortSignal;
}): Promise<string> {
  const body: Record<string, string> = {
    q: args.text,
    source: args.sourceLang === 'auto' ? 'auto' : args.sourceLang,
    target: args.targetLang,
    format: 'text',
  };
  const apiKey = process.env.LIBRETRANSLATE_API_KEY;
  if (apiKey) body.api_key = apiKey;

  const res = await fetch(`${process.env.LIBRETRANSLATE_URL!.replace(/\/$/, '')}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: args.signal,
  });
  if (!res.ok) throw new Error(`Translation service responded with ${res.status}`);
  const json = (await res.json()) as { translatedText?: string };
  if (typeof json.translatedText !== 'string') {
    throw new Error('Translation service returned an unexpected payload');
  }
  return json.translatedText;
}

/**
 * Split a long string into chunks no bigger than `maxLen`, preferring to
 * break at paragraph boundaries, then sentences, then whitespace. Keeps
 * paragraph spacing so the rebuilt text still flows naturally.
 */
function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let buf = '';

  const flush = () => {
    if (buf.length) {
      chunks.push(buf);
      buf = '';
    }
  };

  // Paragraph-first split, preserving the separator.
  const paragraphs = text.split(/(\n\s*\n)/);
  for (const part of paragraphs) {
    if ((buf + part).length <= maxLen) {
      buf += part;
      continue;
    }
    if (part.length <= maxLen) {
      flush();
      buf = part;
      continue;
    }
    // Paragraph itself too big — split by sentences, then by spaces.
    flush();
    for (const piece of splitOversized(part, maxLen)) {
      if ((buf + piece).length <= maxLen) {
        buf += piece;
      } else {
        flush();
        buf = piece;
      }
    }
  }
  flush();
  return chunks;
}

function splitOversized(text: string, maxLen: number): string[] {
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?؟؛])\s+/);
  for (const s of sentences) {
    if (s.length <= maxLen) {
      out.push(s);
    } else {
      // Brute-split by whitespace (last resort).
      const words = s.split(/\s+/);
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).trim().length > maxLen) {
          if (line) out.push(line);
          line = w;
        } else {
          line = (line ? line + ' ' : '') + w;
        }
      }
      if (line) out.push(line);
    }
  }
  return out;
}
