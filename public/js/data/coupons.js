// كوبونات الخصم — الأدمن بيضيفها ويوقفها من لوحة التحكم
// ⚠️ أمثلة تجريبية — لاحقاً من قاعدة البيانات
//
// type:     'percent' خصم نسبة | 'fixed' خصم مبلغ | 'shipping' توصيل مجاني
// minTotal: أقل مجموع للطلب (بعد العروض) عشان يشتغل الكوبون — 0 = بدون حد
// maxUses:  كم مرة بينستعمل بالمجموع — null = بدون حد. used: كم مرة انستعمل لهلأ

export const COUPONS = [
  { id: 'c1', code: 'NUNU10', active: true, type: 'percent', value: 10, minTotal: 150, maxUses: null, used: 7, startsAt: null, endsAt: null, note: 'كوبون للمتابعين على إنستغرام' },
  { id: 'c2', code: 'WELCOME15', active: true, type: 'fixed', value: 15, minTotal: 100, maxUses: 100, used: 23, startsAt: null, endsAt: null, note: 'أول طلب' },
  { id: 'c3', code: 'FREESHIP', active: false, type: 'shipping', value: 0, minTotal: 200, maxUses: null, used: 0, startsAt: null, endsAt: null, note: '' },
];
