'use client';

import type { Translator } from '@/lib/i18n';

interface Props {
  t: Translator;
}

export function Footer({ t }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-ink-200/60 bg-white/60 backdrop-blur-md">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand grid place-items-center text-white shadow-elev">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 3.5h8.5L19 9v11a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1.5-1.5Z"
                  fill="white"
                  opacity="0.95"
                />
                <path d="M13.5 3.5V9H19" stroke="#4f46e5" strokeWidth="1.4" />
              </svg>
            </div>
            <div className="text-start">
              <div className="font-extrabold text-ink-900">{t('nav.brand')}</div>
              <div className="text-xs text-ink-500 mt-0.5">{t('nav.tagline')}</div>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-sm font-medium text-ink-600 flex-wrap justify-center">
            <a href="#translate" className="px-3 py-1.5 rounded-full hover:text-brand-700 hover:bg-white">
              {t('hero.cta')}
            </a>
            <a href="#features" className="px-3 py-1.5 rounded-full hover:text-brand-700 hover:bg-white">
              {t('nav.features')}
            </a>
            <a href="/about" className="px-3 py-1.5 rounded-full hover:text-brand-700 hover:bg-white">
              About
            </a>
            <a href="/privacy" className="px-3 py-1.5 rounded-full hover:text-brand-700 hover:bg-white">
              Privacy
            </a>
            <a href="/terms" className="px-3 py-1.5 rounded-full hover:text-brand-700 hover:bg-white">
              Terms
            </a>
          </nav>
        </div>

        {/* Support / Buy Me a Coffee */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://www.buymeacoffee.com/soogxter3d"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold text-sm shadow-elev hover:shadow-lg transition-shadow"
          >
            <span aria-hidden>☕</span>
            <span>Buy me a coffee — ادعم المطور</span>
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-ink-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-500">
          <span>
            © {year} {t('nav.brand')}. {t('footer.rights')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('footer.made')}
          </span>
        </div>
      </div>
    </footer>
  );
}
