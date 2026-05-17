'use client';

import type { Translator } from '@/lib/i18n';
import type { TranslateStage } from '@/types';

const ORDER: Exclude<TranslateStage, 'idle' | 'error'>[] = [
  'uploading',
  'extracting',
  'translating',
  'generating',
  'ready',
];

const KEY: Record<(typeof ORDER)[number], string> = {
  uploading: 'progress.uploading',
  extracting: 'progress.extracting',
  translating: 'progress.translating',
  generating: 'progress.generating',
  ready: 'progress.ready',
};

interface Props {
  stage: TranslateStage;
  t: Translator;
}

export function ProgressSteps({ stage, t }: Props) {
  if (stage === 'idle' || stage === 'error') return null;
  const currentIdx = ORDER.indexOf(stage as (typeof ORDER)[number]);
  const pct = ((currentIdx + (stage === 'ready' ? 1 : 0.5)) / ORDER.length) * 100;

  return (
    <div className="rounded-3xl glass-card p-5 sm:p-6 animate-slide-up">
      {/* Top progress bar */}
      <div className="mb-5">
        <div className="relative h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-pink-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="relative space-y-3">
        {ORDER.map((s, i) => {
          const state: 'done' | 'active' | 'pending' =
            i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending';
          return (
            <li key={s} className="relative flex items-center gap-3">
              <StepDot state={state} />
              <span
                className={[
                  'text-sm transition-colors',
                  state === 'done'
                    ? 'text-ink-500'
                    : state === 'active'
                      ? 'text-ink-900 font-bold'
                      : 'text-ink-400',
                ].join(' ')}
              >
                {t(KEY[s])}
              </span>
              {state === 'active' && s !== 'ready' && (
                <span className="ms-auto inline-flex items-center text-xs text-brand-600">
                  <Spinner />
                </span>
              )}
              {state === 'done' && (
                <span className="ms-auto text-xs font-bold text-emerald-600">✓</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <span className="w-6 h-6 grid place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-[11px] shadow-soft">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="m5 12 5 5L20 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="relative w-6 h-6 grid place-items-center">
        <span className="absolute inset-0 rounded-full bg-brand-500/25 animate-pulse-ring" />
        <span className="w-3 h-3 rounded-full bg-gradient-brand shadow-soft" />
      </span>
    );
  }
  return <span className="w-6 h-6 rounded-full border-2 border-ink-200 bg-white" />;
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" fill="none" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
