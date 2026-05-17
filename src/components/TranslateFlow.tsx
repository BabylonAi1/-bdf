'use client';

import { useState } from 'react';
import { UploadBox } from './UploadBox';
import { LanguageSelector } from './LanguageSelector';
import { ProgressSteps } from './ProgressSteps';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '@/lib/languages';
import { MAX_FILE_BYTES } from '@/lib/constants';
import type { Translator } from '@/lib/i18n';
import type { TranslateApiError, TranslateStage, UiLocale } from '@/types';

interface Props {
  locale: UiLocale;
  t: Translator;
}

export function TranslateFlow({ locale, t }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState(locale === 'ar' ? 'en' : 'ar');
  const [stage, setStage] = useState<TranslateStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState<string | null>(null);

  const busy =
    stage === 'uploading' ||
    stage === 'extracting' ||
    stage === 'translating' ||
    stage === 'generating';
  const canTranslate = !!file && !busy && sourceLang !== targetLang;

  async function handleTranslate() {
    if (!file) {
      setError(t('error.noFile'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('error.tooLarge'));
      return;
    }
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      setError(t('error.sameLanguage'));
      return;
    }

    setError(null);
    setDownloadUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setOutputName(null);

    const form = new FormData();
    form.append('file', file);
    form.append('sourceLang', sourceLang);
    form.append('targetLang', targetLang);

    try {
      // The UI advances through stages on a timer to surface progress, since
      // we use a single API call.
      setStage('uploading');
      const reqPromise = fetch('/api/translate', { method: 'POST', body: form });

      await wait(600);
      setStage('extracting');
      await wait(600);
      setStage('translating');

      const res = await reqPromise;
      setStage('generating');

      const contentType = res.headers.get('content-type') || '';

      // Error responses are JSON; success is a binary application/pdf body.
      if (!res.ok || !contentType.includes('application/pdf')) {
        const data = (await res.json().catch(() => null)) as TranslateApiError | null;
        setStage('error');
        setError(mapErrorMessage(data?.code, t));
        return;
      }

      const arrayBuf = await res.arrayBuffer();
      // Always construct the Blob with an explicit PDF MIME type so the
      // browser hands the file to the OS with the correct association.
      const blob = new Blob([arrayBuf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const filename =
        filenameFromContentDisposition(res.headers.get('content-disposition')) ||
        res.headers.get('x-filename') ||
        'translated.pdf';

      setDownloadUrl(url);
      setOutputName(filename);
      setStage('ready');
    } catch {
      setStage('error');
      setError(t('error.server'));
    }
  }

  function resetAll() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setOutputName(null);
    setFile(null);
    setStage('idle');
    setError(null);
  }

  function swapLanguages() {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }

  return (
    <section id="translate" className="mx-auto max-w-3xl px-4 sm:px-6 pb-16 scroll-mt-24">
      <div className="relative animate-slide-up">
        {/* Outer glow */}
        <div
          aria-hidden
          className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-500/20 via-accent-500/20 to-pink-500/20 blur-2xl"
        />

        <div className="relative rounded-3xl glass-card p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink-900 tracking-tight font-display">
                {t('card.title')}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t('card.subtitle')}</p>
            </div>
            <span className="hidden sm:inline-flex chip bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <UploadBox
            file={file}
            onFile={(f) => {
              setFile(f);
              if (f) setError(null);
            }}
            onError={setError}
            t={t}
            disabled={busy}
          />

          {/* Language row with swap button */}
          <div className="mt-6 relative grid sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-2 items-end">
            <LanguageSelector
              id="source-lang"
              label={t('lang.source')}
              value={sourceLang}
              onChange={setSourceLang}
              options={SOURCE_LANGUAGES}
              locale={locale}
            />
            <div className="flex sm:justify-center sm:pb-1.5">
              <button
                type="button"
                onClick={swapLanguages}
                disabled={sourceLang === 'auto'}
                title={t('card.swap')}
                aria-label={t('card.swap')}
                className="group w-11 h-11 grid place-items-center rounded-2xl bg-white border border-ink-200 shadow-soft text-ink-500 hover:text-brand-700 hover:border-brand-300 hover:shadow-card transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="transition-transform group-hover:rotate-180 duration-300"
                  aria-hidden
                >
                  <path
                    d="M7 7h13l-3-3M17 17H4l3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <LanguageSelector
              id="target-lang"
              label={t('lang.target')}
              value={targetLang}
              onChange={setTargetLang}
              options={TARGET_LANGUAGES}
              locale={locale}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 text-sm text-red-700 animate-fade-in flex items-start gap-3"
            >
              <span className="w-8 h-8 grid place-items-center rounded-xl bg-red-100 text-red-600 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.74 3h16.88a2 2 0 0 0 1.74-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-medium pt-0.5">{error}</span>
            </div>
          )}

          {/* Primary actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={!canTranslate}
              onClick={handleTranslate}
              className="btn-primary flex-1 py-4 text-base"
            >
              {busy ? (
                <>
                  <Spinner />
                  {t('action.translating')}
                </>
              ) : (
                <>
                  <SparkleIcon />
                  {t('action.translate')}
                </>
              )}
            </button>
          </div>

          {stage !== 'idle' && stage !== 'error' && stage !== 'ready' && (
            <div className="mt-5">
              <ProgressSteps stage={stage} t={t} />
            </div>
          )}

          {stage === 'ready' && downloadUrl && outputName && (
            <div className="mt-6 animate-scale-in">
              <ReadyPanel
                downloadUrl={downloadUrl}
                outputName={outputName}
                onReset={resetAll}
                t={t}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReadyPanel({
  downloadUrl,
  outputName,
  onReset,
  t,
}: {
  downloadUrl: string;
  outputName: string;
  onReset: () => void;
  t: Translator;
}) {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-5 sm:p-6">
      <div
        aria-hidden
        className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-emerald-300/40 blur-3xl"
      />
      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 grid place-items-center text-white shadow-elev shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m5 12 5 5L20 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            {t('progress.ready')}
          </div>
          <div className="mt-0.5 font-bold text-ink-900 truncate">{outputName}</div>
          <p className="mt-1 text-xs text-ink-500">{t('safety.item3')}</p>
        </div>
      </div>
      <div className="relative mt-5 flex flex-col sm:flex-row gap-3">
        <a
          href={downloadUrl}
          download={outputName.toLowerCase().endsWith('.pdf') ? outputName : `${outputName}.pdf`}
          type="application/pdf"
          className="btn-success flex-1 py-3.5 text-base"
        >
          <DownloadIcon />
          {t('action.download')}
        </a>
        <button type="button" onClick={onReset} className="btn-ghost py-3.5">
          {t('action.startOver')}
        </button>
      </div>
    </div>
  );
}

function mapErrorMessage(code: string | undefined, t: Translator): string {
  switch (code) {
    case 'NO_FILE':
      return t('error.noFile');
    case 'BAD_TYPE':
      return t('error.badType');
    case 'TOO_LARGE':
      return t('error.tooLarge');
    case 'EMPTY_PDF':
      return t('error.emptyPdf');
    case 'EXTRACT_FAILED':
      return t('error.extract');
    case 'TRANSLATE_FAILED':
      return t('error.translate');
    case 'GENERATE_FAILED':
      return t('error.generate');
    default:
      return t('error.server');
  }
}

/** Parse `Content-Disposition: attachment; filename="..."` reliably. */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  // RFC 5987 form first
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm6 11 1 2.2L21 17l-2 .8L18 20l-1-2.2L15 17l2-.8L18 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" fill="none" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
