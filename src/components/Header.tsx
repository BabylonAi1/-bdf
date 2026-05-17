'use client';

import type { Translator } from '@/lib/i18n';
import type { UiLocale } from '@/types';

interface Props {
  locale: UiLocale;
  onToggleLocale: () => void;
  t: Translator;
}

export function Header({ locale, onToggleLocale, t }: Props) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <LogoMark />
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-ink-900 tracking-tight">{t('nav.brand')}</span>
            <span className="hidden sm:inline text-[11px] text-ink-500 -mt-0.5">
              {t('nav.tagline')}
            </span>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-ink-600">
          <a
            href="#translate"
            className="px-3 py-2 rounded-full hover:text-brand-700 hover:bg-white/60 transition-colors"
          >
            {t('hero.cta')}
          </a>
          <a
            href="#features"
            className="px-3 py-2 rounded-full hover:text-brand-700 hover:bg-white/60 transition-colors"
          >
            {t('nav.features')}
          </a>
        </nav>

        <button
          onClick={onToggleLocale}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink-200 bg-white/70 hover:bg-white text-sm font-semibold text-ink-700 hover:text-brand-700 transition-colors shadow-sm"
          aria-label="Toggle language"
        >
          <GlobeIcon />
          <span>{t('nav.toggle')}</span>
        </button>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative w-10 h-10 rounded-2xl bg-gradient-brand grid place-items-center shadow-elev">
      <span className="absolute inset-0 rounded-2xl ring-1 ring-white/40 pointer-events-none" />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 3.5h8.5L19 9v11a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1.5-1.5Z"
          fill="white"
          opacity="0.95"
        />
        <path d="M13.5 3.5V9H19" stroke="#4f46e5" strokeWidth="1.4" />
        <path d="M7.5 13.5h7M7.5 16.5h5" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
