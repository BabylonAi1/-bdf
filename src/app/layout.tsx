import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PDF Translator — Translate any PDF in seconds',
  description:
    'Upload a PDF, pick your languages, and download a clean translated copy. Built for Arabic and English.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
