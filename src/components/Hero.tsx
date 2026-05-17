'use client';

import type { Translator } from '@/lib/i18n';

interface Props {
  t: Translator;
}

export function Hero({ t }: Props) {
  return (
    <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
      {/* Floating gradient orbs */}
      <div
        className="absolute -z-10 -top-10 start-1/4 w-72 h-72 rounded-full bg-brand-400/30 blur-3xl animate-float-slow"
        aria-hidden
      />
      <div
        className="absolute -z-10 -top-6 end-10 w-80 h-80 rounded-full bg-accent-400/30 blur-3xl animate-float-slower"
        aria-hidden
      />

      <div className="animate-fade-in">
        <span className="chip bg-white/80 text-brand-700 border border-brand-100 shadow-soft">
          <SparkleIcon />
          {t('hero.eyebrow')}
        </span>
      </div>

      <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink-900 leading-[1.05] animate-slide-up">
        <span className="text-gradient">{t('hero.title')}</span>
      </h1>

      <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-ink-600 leading-relaxed animate-slide-up">
        {t('hero.subtitle')}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
        <a href="#translate" className="btn-primary group">
          {t('hero.cta')}
          <span className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden>
            →
          </span>
        </a>
        <a href="#features" className="btn-ghost">
          {t('hero.secondaryCta')}
        </a>
      </div>

      <dl className="mt-12 mx-auto max-w-2xl grid grid-cols-3 gap-3 sm:gap-6 animate-fade-in">
        <Stat value={t('hero.stat1.value')} label={t('hero.stat1.label')} />
        <Stat value={t('hero.stat2.value')} label={t('hero.stat2.label')} />
        <Stat value={t('hero.stat3.value')} label={t('hero.stat3.label')} />
      </dl>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-card rounded-2xl py-4 px-3 sm:px-5">
      <dt className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 font-display">
        {value}
      </dt>
      <dd className="mt-0.5 text-xs sm:text-sm text-ink-500 font-medium">{label}</dd>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
