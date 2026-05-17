export const metadata = {
  title: 'Terms of Service — شروط الاستخدام',
  description: 'Terms of service for the PDF translator.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate">
      <h1>Terms of Service</h1>
      <p>
        <em>Last updated: May 2026</em>
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may use this PDF translator for personal and commercial documents
        that you have the right to translate. Do not upload content that is
        illegal, infringes copyright you do not hold, or attempts to abuse
        the service (mass automated requests, etc.).
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided &quot;as is&quot;. Translations are produced
        by automated systems and may contain errors. Always review the output
        before relying on it for critical decisions.
      </p>

      <h2>Limits</h2>
      <p>
        File size is currently limited to 9 MB per upload. We may adjust
        these limits at any time.
      </p>

      <h2>Liability</h2>
      <p>
        We are not liable for any direct or indirect damages arising from
        your use of the service.
      </p>

      <hr />

      <h2 dir="rtl">شروط الاستخدام (ملخص بالعربية)</h2>
      <p dir="rtl">
        الخدمة لاستخدامك على مسؤوليتك. الترجمة آلية وقد تحوي أخطاء.
        الحد الأقصى للملف 9 ميغا. لا نتحمل أي أضرار ناتجة عن الاستخدام.
      </p>
    </main>
  );
}
