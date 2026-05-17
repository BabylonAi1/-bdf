export const metadata = {
  title: 'About — حول الموقع',
  description: 'About PDF Translator — a fast, private PDF translation tool.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate">
      <h1>About PDF Translator</h1>
      <p>
        PDF Translator is a free, fast tool that translates entire PDF files
        between 17+ languages. We built it because translating Arabic and
        English PDFs cleanly &mdash; preserving layout and reading direction
        &mdash; was hard to do anywhere else.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>You upload a PDF (up to 9 MB).</li>
        <li>Text is extracted page by page.</li>
        <li>Each block is translated through a translation provider.</li>
        <li>A new PDF is generated with the translated text and downloaded
            to your browser.</li>
      </ol>

      <h2>Why it&apos;s safe</h2>
      <p>
        Files are processed in memory only and discarded right after the
        translated PDF is sent back. We never store your documents.
      </p>

      <h2>Support the project</h2>
      <p>
        Keeping a translator online costs server time. If this saved you
        time, consider buying us a coffee &mdash; the link is at the bottom
        of every page.
      </p>

      <hr />

      <h2 dir="rtl">من نحن (بالعربية)</h2>
      <p dir="rtl">
        موقع <strong>مترجم PDF</strong> أداة مجانية لترجمة ملفات PDF كاملة
        بين 17+ لغة، مع دعم خاص للعربية والإنجليزية. ملفاتك لا تُحفظ على
        الخادم؛ تُعالَج في الذاكرة فقط ثم تُحذف فوراً.
      </p>
    </main>
  );
}
