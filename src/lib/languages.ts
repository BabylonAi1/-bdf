import type { LanguageOption } from '@/types';

export const LANGUAGES: LanguageOption[] = [
  { code: 'auto', labelEn: 'Detect language', labelAr: 'كشف تلقائي' },
  { code: 'en', labelEn: 'English', labelAr: 'الإنجليزية' },
  { code: 'ar', labelEn: 'Arabic', labelAr: 'العربية', rtl: true },
  { code: 'fr', labelEn: 'French', labelAr: 'الفرنسية' },
  { code: 'es', labelEn: 'Spanish', labelAr: 'الإسبانية' },
  { code: 'de', labelEn: 'German', labelAr: 'الألمانية' },
  { code: 'it', labelEn: 'Italian', labelAr: 'الإيطالية' },
  { code: 'pt', labelEn: 'Portuguese', labelAr: 'البرتغالية' },
  { code: 'ru', labelEn: 'Russian', labelAr: 'الروسية' },
  { code: 'tr', labelEn: 'Turkish', labelAr: 'التركية' },
  { code: 'zh', labelEn: 'Chinese', labelAr: 'الصينية' },
  { code: 'ja', labelEn: 'Japanese', labelAr: 'اليابانية' },
  { code: 'ko', labelEn: 'Korean', labelAr: 'الكورية' },
  { code: 'hi', labelEn: 'Hindi', labelAr: 'الهندية' },
  { code: 'fa', labelEn: 'Persian', labelAr: 'الفارسية', rtl: true },
  { code: 'ur', labelEn: 'Urdu', labelAr: 'الأردية', rtl: true },
  { code: 'he', labelEn: 'Hebrew', labelAr: 'العبرية', rtl: true },
];

export function isRtlLanguage(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.rtl === true;
}

export const SOURCE_LANGUAGES = LANGUAGES;
export const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== 'auto');
