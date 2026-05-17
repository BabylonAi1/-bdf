'use client';

import type { LanguageOption, UiLocale } from '@/types';

interface Props {
  label: string;
  value: string;
  onChange: (code: string) => void;
  options: LanguageOption[];
  locale: UiLocale;
  id?: string;
  badge?: string;
}

export function LanguageSelector({ label, value, onChange, options, locale, id, badge }: Props) {
  const current = options.find((o) => o.code === value);
  return (
    <label htmlFor={id} className="block w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-ink-500 uppercase tracking-widest">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="relative group">
        <div
          aria-hidden
          className="absolute -inset-px rounded-2xl bg-gradient-to-r from-brand-500/0 via-brand-500/0 to-accent-500/0 group-focus-within:from-brand-500/30 group-focus-within:via-brand-500/20 group-focus-within:to-accent-500/30 transition-all"
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="relative w-full appearance-none rounded-2xl border border-ink-200 bg-white px-4 py-3.5 pe-10 text-sm font-semibold text-ink-900 shadow-soft hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {locale === 'ar' ? o.labelAr : o.labelEn}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {current?.rtl && (
            <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
              RTL
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 20 20" className="text-ink-400" aria-hidden>
            <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>
    </label>
  );
}
