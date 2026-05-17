export type UiLocale = 'en' | 'ar';

export interface LanguageOption {
  code: string;
  labelEn: string;
  labelAr: string;
  rtl?: boolean;
}

export type TranslateStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'translating'
  | 'generating'
  | 'ready'
  | 'error';

export interface TranslateApiSuccess {
  ok: true;
  /** base64-encoded translated PDF */
  pdf: string;
  filename: string;
  pageCount: number;
}

export interface TranslateApiError {
  ok: false;
  code:
    | 'NO_FILE'
    | 'BAD_TYPE'
    | 'TOO_LARGE'
    | 'EMPTY_PDF'
    | 'EXTRACT_FAILED'
    | 'TRANSLATE_FAILED'
    | 'GENERATE_FAILED'
    | 'SERVER_ERROR';
  message: string;
}

export type TranslateApiResponse = TranslateApiSuccess | TranslateApiError;
