declare module 'arabic-reshaper' {
  const ArabicReshaper: {
    convertArabic(text: string): string;
    convertArabicBack(text: string): string;
  };
  export default ArabicReshaper;
}

declare module 'bidi-js' {
  export type BidiDirection = 'ltr' | 'rtl' | 'auto';
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }
  export interface Bidi {
    getEmbeddingLevels(text: string, baseDirection?: BidiDirection): EmbeddingLevels;
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ): Array<[number, number]>;
  }
  export default function bidiFactory(): Bidi;
}
