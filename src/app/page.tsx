'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { TranslateFlow } from '@/components/TranslateFlow';
import { Features } from '@/components/Features';
import { SafetyNote } from '@/components/SafetyNote';
import { Footer } from '@/components/Footer';
import { makeT, DEFAULT_LOCALE } from '@/lib/i18n';
import type { UiLocale } from '@/types';

export default function Home() {
  const [locale, setLocale] = useState<UiLocale>(DEFAULT_LOCALE);

  // Sync dir/lang on <html> so layout adapts (Arabic = RTL).
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const t = makeT(locale);

  return (
    <>
      <Header locale={locale} t={t} onToggleLocale={() => setLocale(locale === 'en' ? 'ar' : 'en')} />
      <main>
        <Hero t={t} />
        <TranslateFlow locale={locale} t={t} />
        <Features t={t} />
        <SafetyNote t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}
