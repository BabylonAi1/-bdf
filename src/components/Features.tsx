'use client';

import type { ReactElement } from 'react';
import type { Translator } from '@/lib/i18n';

interface Props {
  t: Translator;
}

type Tone = 'indigo' | 'violet' | 'pink' | 'emerald' | 'amber' | 'sky';

const ITEMS: { key: string; icon: ReactElement; tone: Tone }[] = [
  { key: 'pdf', icon: <PdfIcon />, tone: 'indigo' },
  { key: 'fast', icon: <BoltIcon />, tone: 'amber' },
  { key: 'size', icon: <ScaleIcon />, tone: 'violet' },
  { key: 'format', icon: <SparklesIcon />, tone: 'pink' },
  { key: 'bilingual', icon: <GlobeIcon />, tone: 'sky' },
  { key: 'private', icon: <LockIcon />, tone: 'emerald' },
];

const TONES: Record<Tone, { tile: string; halo: string }> = {
  indigo: {
    tile: 'from-indigo-500 to-indigo-600',
    halo: 'bg-indigo-300/30',
  },
  violet: {
    tile: 'from-violet-500 to-purple-600',
    halo: 'bg-violet-300/30',
  },
  pink: {
    tile: 'from-pink-500 to-rose-500',
    halo: 'bg-pink-300/30',
  },
  emerald: {
    tile: 'from-emerald-500 to-teal-600',
    halo: 'bg-emerald-300/30',
  },
  amber: {
    tile: 'from-amber-500 to-orange-500',
    halo: 'bg-amber-300/30',
  },
  sky: {
    tile: 'from-sky-500 to-cyan-500',
    halo: 'bg-sky-300/30',
  },
};

export function Features({ t }: Props) {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto animate-fade-in">
        <span className="chip bg-white/80 text-brand-700 border border-brand-100 shadow-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          {t('nav.features')}
        </span>
        <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-ink-900 tracking-tight font-display">
          {t('features.title')}
        </h2>
        <p className="mt-3 text-ink-600">{t('features.subtitle')}</p>
      </div>

      <div className="mt-12 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, idx) => {
          const tone = TONES[item.tone];
          return (
            <article
              key={item.key}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="group relative rounded-3xl glass-card p-6 hover:-translate-y-1 hover:shadow-elev transition-all duration-300 animate-slide-up overflow-hidden"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -top-10 -end-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity ${tone.halo}`}
              />
              <div
                className={`relative w-12 h-12 rounded-2xl grid place-items-center text-white shadow-elev bg-gradient-to-br ${tone.tile}`}
              >
                <span className="absolute inset-0 rounded-2xl ring-1 ring-white/40" />
                {item.icon}
              </div>
              <h3 className="mt-5 font-bold text-ink-900 text-lg">{t(`features.${item.key}.title`)}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                {t(`features.${item.key}.desc`)}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>→</span>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PdfIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 13h8M8 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ScaleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7h18M6 7l-3 7a4 4 0 0 0 8 0L8 7m10 0-3 7a4 4 0 0 0 8 0l-3-7M12 3v18M8 21h8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Zm6 11 1 2.2L21 17l-2 .8L18 20l-1-2.2L15 17l2-.8L18 14ZM5 14l.8 1.7L7 16.5l-1.2.8L5 19l-.8-1.7L3 16.5l1.2-.8L5 14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
