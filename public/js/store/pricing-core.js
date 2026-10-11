// حسابات الأسعار والعروض والكوبونات — نفس الملف بيستعمله المتجر والسيرفر،
// عشان الرقم اللي بتشوفه الزبونة يطابق الرقم اللي بينحفظ بالطلب. (بدون أي import)

// عرض شغّال هلأ؟
export const isLive = (o, now = Date.now()) =>
  !!o.active &&
  (!o.startsAt || now >= Date.parse(o.startsAt)) &&
  (!o.endsAt || now < Date.parse(o.endsAt));

export const appliesTo = (offer, p) => {
  const { kind, ids = [] } = offer.target;
  return kind === 'all' ||
    (kind === 'category' && ids.includes(p.category)) ||
    (kind === 'products' && ids.includes(p.id));
};

const discounted = (offer, price) =>
  offer.type === 'percent' ? Math.round(price * (1 - offer.value / 100)) : Math.max(0, price - offer.value);

// سعر المنتج بعد أفضل خصم مباشر عليه (offers = العروض الشغّالة)
export function bestPrice(p, offers) {
  let best = null;
  for (const offer of offers) {
    if (offer.type === 'bxgy' || !appliesTo(offer, p)) continue;
    const price = discounted(offer, p.price);
    if (!best || price < best.price) best = { price, offer };
  }
  if (!best) return { price: p.price, old: null, pct: 0, offer: null };
  return { price: best.price, old: p.price, pct: Math.round((1 - best.price / p.price) * 100), offer: best.offer };
}

// خصومات "اشتري X وخدي Y": القطع الأرخص هي المجانية. lines: [{ product, qty, unit }]
export function bxgyDiscounts(offers, lines) {
  return offers
    .filter((o) => o.type === 'bxgy')
    .map((o) => {
      const units = lines
        .filter((l) => appliesTo(o, l.product))
        .flatMap((l) => Array(l.qty).fill(l.unit))
        .sort((a, b) => a - b);
      const free = Math.floor(units.length / (o.buy + o.get)) * o.get;
      return { title: o.title, amount: units.slice(0, free).reduce((s, u) => s + u, 0) };
    })
    .filter((d) => d.amount > 0);
}

// ===== الكوبونات =====
// بترجع رسالة الخطأ، أو '' إذا الكوبون بيشتغل على هالمجموع
export function couponError(c, total, now = Date.now(), money = (n) => `${n} ₪`) {
  if (!c || !c.active) return 'الكوبون مش صحيح';
  if (c.startsAt && now < Date.parse(c.startsAt)) return 'الكوبون لسا ما بلّش';
  if (c.endsAt && now >= Date.parse(c.endsAt)) return 'الكوبون انتهى';
  if (c.maxUses != null && c.used >= c.maxUses) return 'الكوبون خلص استعماله';
  if (c.minTotal && total < c.minTotal) return `الكوبون بيشتغل على طلبات من ${money(c.minTotal)} (ضايلك ${money(c.minTotal - total)})`;
  return '';
}

// قديش بيخصم الكوبون (التوصيل المجاني بينحسب لحاله)
export function couponDiscount(c, total) {
  if (!c) return { amount: 0, freeShipping: false };
  if (c.type === 'shipping') return { amount: 0, freeShipping: true };
  const amount = c.type === 'percent' ? Math.round(total * c.value / 100) : Math.min(c.value, total);
  return { amount, freeShipping: false };
}

export const normalizeCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');
