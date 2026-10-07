// إعدادات المتجر العامة — لاحقاً بتتعدل من لوحة الأدمن

export const STORE = {
  name: 'NUNU KIDS',
  currency: '₪',
  freeShippingOver: 0, // 0 = بدون توصيل مجاني. لتفعيله: حطي المبلغ (مثلاً 200)
  whatsapp: '', // رقم دولي بدون + (مثلاً 970591234567)
  facebook: '',
  instagram: '',
  exchangeDays: 2, // مدة تبديل المقاس من يوم الاستلام (ما في إرجاع)
  // مدة التوصيل العامة بأيام العمل (الجمعة عطلة) — لجملة "بيوصلك بين..."
  deliveryDays: { min: 2, max: 4 },
  weekend: [5], // 0 = الأحد ... 5 = الجمعة
  shippingZones: [
    { id: 'wb', name: 'الضفة الغربية', fee: 20, days: '2–4 أيام' },
    { id: 'jer', name: 'القدس', fee: 30, days: '2–3 أيام' },
    { id: 'in', name: 'الداخل', fee: 60, days: '3–5 أيام' },
  ],
};

export const CATEGORIES = {
  underwear: 'ملابس داخلية',
  clothes: 'أواعي وبيجامات',
  accessories: 'مستلزمات وإكسسوارات',
  bundles: 'بكجات تجهيز البيبي',
};

// المقاسات بالترتيب
export const SIZES = {
  '0-3': { range: '0–3', unit: 'أشهر' },
  '3-6': { range: '3–6', unit: 'أشهر' },
  '6-9': { range: '6–9', unit: 'أشهر' },
  '9-12': { range: '9–12', unit: 'شهر' },
  one: { range: '', unit: 'مقاس واحد' },
};
