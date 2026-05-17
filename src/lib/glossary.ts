/**
 * Glossary / term protection for the translator.
 *
 * Some tokens must NOT be translated:
 *   - Technical acronyms:        PDF, OCR, API, URL, HTTP, RAM…
 *   - Brand / OS / product names: Linux, Windows, macOS, Kali, VirtualBox…
 *   - URLs, file paths, version numbers, anything that "looks like code".
 *
 * Strategy:
 *   1. Before calling Google Translate, scan the source text and replace
 *      every protected term with a unique placeholder token that Google's
 *      free endpoint reliably passes through verbatim
 *      (uppercase ASCII trigraphs with a digit run — Google treats these
 *      as proper names).
 *   2. Send the placeholder-bearing text to Google.
 *   3. After translation, restore each placeholder to the original term.
 *
 * If Google ever does mangle a placeholder (case-folded, spaced, suffixed),
 * `restoreTerms` tries a few common variants before giving up — in the worst
 * case the placeholder is left visible so we can see what happened in logs.
 */

/**
 * Terms forced to stay in English. Casing here is what we'll restore — so
 * "Linux" stays "Linux" even if the source happened to be "LINUX" or "linux".
 */
const KEEP_ENGLISH: string[] = [
  // Acronyms
  'PDF', 'OCR', 'HTML', 'CSS', 'JS', 'TS', 'API', 'URL', 'URI',
  'CPU', 'GPU', 'RAM', 'ROM', 'SSD', 'HDD', 'USB',
  'IP', 'TCP', 'UDP', 'DNS', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'SSL', 'TLS',
  'JSON', 'XML', 'YAML', 'SQL', 'REST', 'SDK', 'CLI', 'GUI', 'UI', 'UX',
  'CSV', 'XLSX', 'DOCX',
  // OS / distro
  'Linux', 'Windows', 'macOS', 'iOS', 'Android', 'Ubuntu', 'Debian',
  'Fedora', 'CentOS', 'RedHat', 'Arch', 'Kali', 'Mint',
  // Tools / apps
  'VirtualBox', 'VMware', 'Docker', 'Kubernetes',
  'GitHub', 'GitLab', 'Bitbucket', 'Git',
  'Node.js', 'NPM', 'Yarn',
  // Languages
  'Python', 'JavaScript', 'TypeScript', 'Java', 'Bash',
];

interface ProtectionResult {
  protected: string;
  tokens: Map<string, string>;
}

/**
 * Token format: "ZQZ" + digits + "Z" — a sequence Google's free endpoint
 * reliably preserves in `dt=t` mode. Tested with: PDF, OCR, URLs, paths.
 */
function makeToken(i: number): string {
  return `ZQZ${i}Z`;
}

const URL_RE = /\b(?:https?|ftp|file):\/\/[^\s<>"']+/gi;
// File paths: POSIX (/usr/bin) and Windows (C:\Users\…). Conservative.
const POSIX_PATH_RE = /(?:^|[\s(])(\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+)/g;
const WIN_PATH_RE = /\b[A-Za-z]:\\(?:[^\s<>"'|*?\\]+\\)*[^\s<>"'|*?\\]+/g;
// Version numbers (1.2.3, v1.0, etc.). Keep numbers only when they have ≥2 dots.
const VERSION_RE = /\bv?\d+\.\d+(?:\.\d+)+(?:[-+][A-Za-z0-9.-]+)?\b/g;

/**
 * Replace every protected term with an opaque placeholder. Idempotent;
 * tokens are sequential and tracked in the returned map.
 */
export function protectTerms(text: string): ProtectionResult {
  const tokens = new Map<string, string>();
  let n = 0;
  let out = text;

  // 1) URLs first (most likely to contain other matches inside).
  out = out.replace(URL_RE, (m) => {
    const tok = makeToken(n++);
    tokens.set(tok, m);
    return tok;
  });

  // 2) File paths.
  out = out.replace(POSIX_PATH_RE, (full, p) => {
    const tok = makeToken(n++);
    tokens.set(tok, p);
    return full.slice(0, full.length - p.length) + tok;
  });
  out = out.replace(WIN_PATH_RE, (m) => {
    const tok = makeToken(n++);
    tokens.set(tok, m);
    return tok;
  });

  // 3) Version numbers.
  out = out.replace(VERSION_RE, (m) => {
    const tok = makeToken(n++);
    tokens.set(tok, m);
    return tok;
  });

  // 4) Glossary terms (word-boundary, case-insensitive). Restore exact
  // casing from KEEP_ENGLISH so the output is consistent across the book.
  for (const term of KEEP_ENGLISH) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    out = out.replace(re, () => {
      const tok = makeToken(n++);
      tokens.set(tok, term);
      return tok;
    });
  }

  return { protected: out, tokens };
}

/**
 * Restore placeholders in the translated text. Handles a few common
 * Google-Translate mutations: case folding, internal spaces, surrounding
 * punctuation tweaks.
 */
export function restoreTerms(translated: string, tokens: Map<string, string>): string {
  let out = translated;
  for (const [tok, original] of tokens) {
    // Exact match (fast path)
    out = out.split(tok).join(original);
    // Case-folded variants (some translation paths lowercase ALL-CAPS tokens)
    const lower = tok.toLowerCase();
    if (lower !== tok) out = out.split(lower).join(original);
    const upper = tok.toUpperCase();
    if (upper !== tok) out = out.split(upper).join(original);
    // Sometimes a stray space is inserted: "ZQZ 1 Z"
    const spaced = new RegExp(tok.replace(/(\d+)/, '\\s*$1\\s*'), 'gi');
    out = out.replace(spaced, original);
  }
  return out;
}

/** For unit tests / introspection only. */
export const __glossaryTerms = KEEP_ENGLISH;
