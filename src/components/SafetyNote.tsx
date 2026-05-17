'use client';

import type { Translator } from '@/lib/i18n';

interface Props {
  t: Translator;
}

export function SafetyNote({ t }: Props) {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-20">
      <div className="relative rounded-3xl overflow-hidden glass-card p-6 sm:p-8 animate-fade-in">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -end-10 w-40 h-40 rounded-full bg-amber-200/40 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shrink-0 shadow-elev">
            <span className="absolute inset-0 rounded-2xl ring-1 ring-white/40 pointer-events-none" />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 8v5m0 3h.01M12 3l9 16H3l9-16Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="flex-1">
            <h3 className="font-bold text-ink-900 text-lg font-display">{t('safety.title')}</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
              <BulletItem>{t('safety.item1')}</BulletItem>
              <BulletItem>{t('safety.item2')}</BulletItem>
              <BulletItem>{t('safety.item3')}</BulletItem>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
