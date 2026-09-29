// العروض — اختيارية بالكامل. الأدمن بيضيفها ويشغّلها ويطفّيها.
// إذا ما في عرض فعّال، كل عناصر العروض بالموقع بتختفي لحالها.
//
// type:   'percent' خصم نسبة | 'fixed' خصم مبلغ | 'bxgy' اشتري X وخذي Y
// target: { kind: 'all' } | { kind: 'category', ids: [...] } | { kind: 'products', ids: [...] }
// hero:   بيظهر بالبانر الرئيسي (مع عداد إذا إله endsAt)
// banner: بيظهر كبانر بالصفحة الرئيسية

export const OFFERS = [
  {
    id: 'o1', active: true, label: 'عرض الأسبوع', title: 'خصم 20% على كل بكجات تجهيز المولود',
    type: 'percent', value: 20, target: { kind: 'category', ids: ['bundles'] },
    startsAt: null, endsAt: '2026-10-09T23:59:00', hero: true,
  },
  {
    id: 'o2', active: true, label: 'عرض خاص', title: 'اشتري 3 قطع داخلي والرابعة علينا',
    type: 'bxgy', buy: 3, get: 1, target: { kind: 'category', ids: ['underwear'] },
    startsAt: null, endsAt: null, banner: true,
  },
  {
    id: 'o3', active: true, label: 'خصم', title: 'خصم 20% على أوفرول النوم والكلسات',
    type: 'percent', value: 20, target: { kind: 'products', ids: [2, 4] },
    startsAt: null, endsAt: null,
  },
];
