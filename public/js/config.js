// إعدادات المتجر العامة — لاحقاً بتتعدل من لوحة الأدمن

export const STORE = {
  name: 'NUNU KIDS',
  currency: '₪',
  freeShippingOver: 200, // 0 = بدون توصيل مجاني
  whatsapp: '', // رقم دولي بدون + (مثلاً 970591234567)
  facebook: '',
  instagram: '',
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
