import type { UiLocale } from '@/types';

export const DEFAULT_LOCALE: UiLocale = 'ar';

type Dict = Record<string, string>;

const en: Dict = {
  'nav.brand': 'PDF Translator',
  'nav.tagline': 'Translate documents beautifully',
  'nav.features': 'Features',
  'nav.howto': 'How it works',
  'nav.toggle': 'العربية',

  'hero.eyebrow': 'New · Premium PDF translation',
  'hero.title': 'Translate any PDF in seconds',
  'hero.subtitle':
    'Upload a PDF, pick your languages, and download a clean translated copy. Fast, private, and built for both Arabic and English.',
  'hero.cta': 'Start translating',
  'hero.secondaryCta': 'See how it works',
  'hero.stat1.value': '9 MB',
  'hero.stat1.label': 'max upload',
  'hero.stat2.value': '17+',
  'hero.stat2.label': 'languages',
  'hero.stat3.value': '100%',
  'hero.stat3.label': 'private',

  'card.title': 'Translate your PDF',
  'card.subtitle': 'Drop a file, choose languages, get a translated PDF in seconds.',
  'card.swap': 'Swap languages',

  'upload.title': 'Upload your PDF',
  'upload.dropHere': 'Drag & drop your PDF here',
  'upload.or': 'or',
  'upload.browse': 'Browse files',
  'upload.maxSize': 'Maximum file size: 9 MB',
  'upload.onlyPdf': 'Only PDF files are accepted',
  'upload.selected': 'Selected file',
  'upload.remove': 'Remove',

  'lang.source': 'Source language',
  'lang.target': 'Target language',

  'action.translate': 'Translate PDF',
  'action.translating': 'Translating…',
  'action.download': 'Download translated PDF',
  'action.startOver': 'Translate another file',

  'progress.uploading': 'Uploading PDF…',
  'progress.extracting': 'Extracting text…',
  'progress.translating': 'Translating…',
  'progress.generating': 'Generating translated PDF…',
  'progress.ready': 'Ready to download',

  'error.tooLarge': 'The PDF file must be 9 MB or less.',
  'error.badType': 'Only PDF files are accepted.',
  'error.noFile': 'Please choose a PDF file first.',
  'error.emptyPdf': 'This PDF appears to be empty or has no extractable text.',
  'error.extract': 'We could not read text from this PDF. It may be a scanned image.',
  'error.translate': 'Translation failed. Please try again.',
  'error.generate': 'We could not build the translated PDF. Please try again.',
  'error.server': 'Something went wrong on our side. Please try again.',
  'error.sameLanguage': 'Source and target languages must be different.',

  'features.title': 'Everything you need to translate PDFs',
  'features.subtitle': 'A focused tool that does one thing very well.',
  'features.pdf.title': 'PDF in, PDF out',
  'features.pdf.desc': 'Upload a PDF and get a translated PDF back — no copy-pasting.',
  'features.fast.title': 'Fast processing',
  'features.fast.desc': 'Optimized pipeline gets your translation done in seconds.',
  'features.size.title': '9 MB max size',
  'features.size.desc': 'Designed for documents up to 9 MB so things stay snappy.',
  'features.format.title': 'Clean formatting',
  'features.format.desc': 'Pages stay readable with a layout that mirrors your original.',
  'features.bilingual.title': 'Arabic & English UI',
  'features.bilingual.desc': 'Native right-to-left support with a polished bilingual experience.',
  'features.private.title': 'Private by default',
  'features.private.desc': 'Files are processed in memory and removed after translation.',

  'safety.title': 'A note on responsible use',
  'safety.item1':
    'Only upload files you have the right to translate. Respect copyright and confidentiality.',
  'safety.item2': 'We do not store uploaded files permanently — they are used only for processing.',
  'safety.item3': 'Temporary files are deleted as soon as your translated PDF is delivered.',

  'footer.rights': 'All rights reserved.',
  'footer.made': 'Built with care for readers everywhere.',
};

const ar: Dict = {
  'nav.brand': 'مترجم PDF',
  'nav.tagline': 'ترجمة مستنداتك بأناقة',
  'nav.features': 'المميزات',
  'nav.howto': 'كيف يعمل',
  'nav.toggle': 'English',

  'hero.eyebrow': 'جديد · ترجمة PDF احترافية',
  'hero.title': 'ترجم أي ملف PDF في ثوانٍ',
  'hero.subtitle':
    'ارفع ملف PDF، اختر اللغات، وحمّل نسخة مترجمة نظيفة. سريع، خاص، ومصمم للعربية والإنجليزية معاً.',
  'hero.cta': 'ابدأ الترجمة',
  'hero.secondaryCta': 'شاهد كيف يعمل',
  'hero.stat1.value': '9 ميغا',
  'hero.stat1.label': 'الحد الأقصى',
  'hero.stat2.value': '+17',
  'hero.stat2.label': 'لغة',
  'hero.stat3.value': '100%',
  'hero.stat3.label': 'خصوصية',

  'card.title': 'ترجم ملف PDF',
  'card.subtitle': 'أفلت الملف، اختر اللغات، واحصل على ملف مترجم في ثوانٍ.',
  'card.swap': 'تبديل اللغات',

  'upload.title': 'ارفع ملف PDF',
  'upload.dropHere': 'اسحب وأفلت ملف PDF هنا',
  'upload.or': 'أو',
  'upload.browse': 'تصفّح الملفات',
  'upload.maxSize': 'الحد الأقصى لحجم الملف: 9 ميغابايت',
  'upload.onlyPdf': 'يُقبل ملفات PDF فقط',
  'upload.selected': 'الملف المحدد',
  'upload.remove': 'إزالة',

  'lang.source': 'اللغة المصدر',
  'lang.target': 'اللغة الهدف',

  'action.translate': 'ترجم الملف',
  'action.translating': 'جاري الترجمة…',
  'action.download': 'تحميل الملف المترجم',
  'action.startOver': 'ترجمة ملف آخر',

  'progress.uploading': 'جاري رفع الملف…',
  'progress.extracting': 'استخراج النص…',
  'progress.translating': 'جاري الترجمة…',
  'progress.generating': 'إنشاء الملف المترجم…',
  'progress.ready': 'جاهز للتحميل',

  'error.tooLarge': 'يجب أن يكون حجم ملف PDF 9 ميغابايت أو أقل.',
  'error.badType': 'يُقبل ملفات PDF فقط.',
  'error.noFile': 'يرجى اختيار ملف PDF أولاً.',
  'error.emptyPdf': 'يبدو أن هذا الملف فارغ أو لا يحتوي على نص قابل للقراءة.',
  'error.extract': 'تعذّر قراءة النص من هذا الملف. قد يكون صورة ممسوحة ضوئياً.',
  'error.translate': 'فشلت الترجمة. حاول مرة أخرى.',
  'error.generate': 'تعذّر إنشاء الملف المترجم. حاول مرة أخرى.',
  'error.server': 'حدث خطأ من جانبنا. حاول مرة أخرى.',
  'error.sameLanguage': 'يجب أن تكون اللغتان المصدر والهدف مختلفتين.',

  'features.title': 'كل ما تحتاجه لترجمة PDF',
  'features.subtitle': 'أداة مركّزة تتقن وظيفة واحدة.',
  'features.pdf.title': 'PDF يدخل، PDF يخرج',
  'features.pdf.desc': 'ارفع ملف PDF واحصل على ملف PDF مترجم — دون نسخ ولصق.',
  'features.fast.title': 'معالجة سريعة',
  'features.fast.desc': 'خط معالجة محسّن ينجز الترجمة في ثوانٍ.',
  'features.size.title': 'حد أقصى 9 ميغا',
  'features.size.desc': 'مصمم للمستندات حتى 9 ميغا للحفاظ على الأداء.',
  'features.format.title': 'تنسيق نظيف',
  'features.format.desc': 'الصفحات تبقى مقروءة بتنسيق يحاكي الأصل.',
  'features.bilingual.title': 'واجهة عربية وإنجليزية',
  'features.bilingual.desc': 'دعم أصلي لـ RTL مع تجربة ثنائية اللغة متقنة.',
  'features.private.title': 'خصوصية افتراضية',
  'features.private.desc': 'تتم معالجة الملفات في الذاكرة وتُحذف بعد الترجمة.',

  'safety.title': 'ملاحظة عن الاستخدام المسؤول',
  'safety.item1': 'ارفع فقط الملفات التي يحق لك ترجمتها. احترم حقوق النشر والخصوصية.',
  'safety.item2': 'لا نحتفظ بالملفات المرفوعة بشكل دائم — تُستخدم فقط أثناء المعالجة.',
  'safety.item3': 'تُحذف الملفات المؤقتة فور تسليم الملف المترجم.',

  'footer.rights': 'جميع الحقوق محفوظة.',
  'footer.made': 'صُنع بعناية للقرّاء في كل مكان.',
};

const DICTS: Record<UiLocale, Dict> = { en, ar };

export function t(locale: UiLocale, key: string): string {
  return DICTS[locale][key] ?? DICTS.en[key] ?? key;
}

export type Translator = (key: string) => string;

export function makeT(locale: UiLocale): Translator {
  return (key) => t(locale, key);
}
