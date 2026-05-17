export const metadata = {
  title: 'Privacy Policy — سياسة الخصوصية',
  description: 'Privacy policy for the PDF translator service.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p>
        <em>Last updated: May 2026</em>
      </p>

      <h2>Files you upload</h2>
      <p>
        We process PDF files in memory only to translate them. Files are never
        saved to disk on our servers and are discarded as soon as the
        translated PDF is delivered to you. We do not keep copies, do not log
        the contents, and do not use them to train any model.
      </p>

      <h2>Translation provider</h2>
      <p>
        The text inside your PDF is sent to a third-party translation provider
        (Google Translate&apos;s public endpoint or, if configured, a private
        LibreTranslate instance) so it can be translated. Refer to the
        respective provider for their privacy practices.
      </p>

      <h2>Analytics</h2>
      <p>
        We may use basic, privacy-respecting analytics (such as Vercel
        Analytics) to count anonymized visits. We do not track individuals
        across sites.
      </p>

      <h2>Cookies</h2>
      <p>
        This site does not set tracking cookies. If you click the donation
        button, you will leave this site for Buy Me a Coffee, which has its
        own privacy policy.
      </p>

      <h2>Contact</h2>
      <p>
        For any privacy question, reach out via the GitHub repository linked
        in the footer.
      </p>

      <hr />

      <h2 dir="rtl">سياسة الخصوصية (ملخص بالعربية)</h2>
      <p dir="rtl">
        نعالج ملفات PDF في الذاكرة فقط لترجمتها، ولا نحفظها على الخادم.
        يتم إرسال النص إلى مزود ترجمة طرف ثالث (Google Translate افتراضياً).
        لا نضع كوكيز للتتبع.
      </p>
    </main>
  );
}
