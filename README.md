# PDF Translator

A clean, modern web app that translates PDF files. Upload a PDF, pick the
source and target languages, and download a translated PDF.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling, with Arabic RTL support
- **pdfjs-dist** for text extraction (Node-friendly legacy build)
- **pdf-lib** + **@pdf-lib/fontkit** for translated-PDF generation
  (embeds Noto Sans / Noto Naskh Arabic for Unicode support)

## Project structure

```
src/
├── app/
│   ├── layout.tsx          # Loads fonts, sets <html lang/dir>
│   ├── page.tsx            # Client wrapper, locale state
│   ├── globals.css         # Tailwind + base styles
│   └── api/translate/route.ts  # Upload + translate endpoint
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── UploadBox.tsx       # Drag-drop + validation
│   ├── LanguageSelector.tsx
│   ├── TranslateFlow.tsx   # Orchestrates the full flow
│   ├── ProgressSteps.tsx
│   ├── Features.tsx
│   ├── SafetyNote.tsx
│   └── Footer.tsx
├── lib/
│   ├── constants.ts        # MAX_FILE_BYTES = 9 MB, MIME, etc.
│   ├── languages.ts        # Language options + isRtlLanguage()
│   ├── i18n.ts             # English + Arabic dictionaries
│   ├── translator.ts       # Pluggable translation service
│   └── pdf.ts              # extractPdfPages + generateTranslatedPdf
└── types/index.ts
```

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Connecting a real translation service

`src/lib/translator.ts` exposes a single `translateText()` entry point.
By default it returns a clearly-marked stub so the full pipeline can be
exercised end-to-end with no external services.

To wire up a real provider, set environment variables in `.env.local`:

```
LIBRETRANSLATE_URL=https://your-libretranslate-host
LIBRETRANSLATE_API_KEY=optional
```

Or swap the implementation entirely — every call site uses the same
`translateText()` signature.

## Limits & behavior

- **Max upload size: 9 MB.** Enforced on the frontend (UploadBox + flow)
  and the backend (`/api/translate`). Returns `TOO_LARGE` with a 413.
- **PDFs only.** MIME + extension are checked client and server side.
- **Scanned PDFs.** If pdfjs cannot extract text, the API returns
  `EXTRACT_FAILED` so the UI can show a clear message.
- **Files are not persisted.** Uploads are parsed in memory and discarded
  once the response is sent.

## Error codes

| Code               | Meaning                                          |
| ------------------ | ------------------------------------------------ |
| `NO_FILE`          | No PDF in the request                            |
| `BAD_TYPE`         | Not a PDF                                        |
| `TOO_LARGE`        | Over 9 MB                                        |
| `EMPTY_PDF`        | Empty file or no extractable text                |
| `EXTRACT_FAILED`   | pdfjs could not parse the document               |
| `TRANSLATE_FAILED` | Upstream translation service failed              |
| `GENERATE_FAILED`  | pdf-lib could not build the output               |
| `SERVER_ERROR`     | Unexpected error — see server logs               |
