// تحويل البيانات بين قاعدة البيانات والشكل اللي بتستعمله صفحات المتجر ولوحة الأدمن
// (نفس شكل الملفات القديمة بـ public/js/data، عشان الصفحات ما تتغير)

export const PRODUCT_INCLUDE = {
  sizes: true,
  bundleItems: { orderBy: { position: 'asc' } },
};

const SIZE_ORDER = ['0-3', '3-6', '6-9', '9-12', 'one'];

export function productOut(p) {
  const stock = {};
  [...p.sizes]
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
    .forEach((s) => { stock[s.size] = s.qty; });
  const out = {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    images: p.images,
    colors: p.colors,
    isNew: p.isNew,
    visible: p.visible,
    stock,
  };
  if (p.material) out.material = p.material;
  if (p.category === 'bundles') {
    out.featured = p.featured;
    out.items = p.bundleItems.map((it) => (it.productId ? { id: it.productId, qty: it.qty, ...(it.name ? { name: it.name } : {}) } : { name: it.name, qty: it.qty }));
  }
  return out;
}

// منتج من النموذج ← بيانات Prisma (بدون المقاسات وقطع البكج، بينحفظوا لحال)
export function productIn(p) {
  return {
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description || '',
    material: p.material || null,
    images: p.images,
    colors: p.colors || [],
    isNew: !!p.isNew,
    visible: p.visible !== false,
    featured: p.category === 'bundles' && !!p.featured,
  };
}

export const offerOut = (o) => ({
  id: o.id,
  active: o.active,
  label: o.label,
  title: o.title,
  type: o.type,
  ...(o.type === 'bxgy' ? { buy: o.buy, get: o.get } : { value: o.value }),
  target: { kind: o.targetKind, ids: o.targetIds },
  banner: o.banner,
  startsAt: o.startsAt?.toISOString() ?? null,
  endsAt: o.endsAt?.toISOString() ?? null,
});

export const offerIn = (o) => ({
  active: !!o.active,
  label: o.label || 'عرض خاص',
  title: o.title,
  type: o.type,
  value: o.type === 'bxgy' ? null : o.value,
  buy: o.type === 'bxgy' ? o.buy : null,
  get: o.type === 'bxgy' ? o.get : null,
  targetKind: o.target.kind,
  targetIds: o.target.kind === 'all' ? [] : o.target.ids,
  banner: !!o.banner,
  startsAt: o.startsAt ? new Date(o.startsAt) : null,
  endsAt: o.endsAt ? new Date(o.endsAt) : null,
});

export const couponOut = (c) => ({
  id: c.id,
  code: c.code,
  active: c.active,
  type: c.type,
  value: c.value,
  minTotal: c.minTotal,
  maxUses: c.maxUses,
  used: c.used,
  note: c.note,
  startsAt: c.startsAt?.toISOString() ?? null,
  endsAt: c.endsAt?.toISOString() ?? null,
});

export const couponIn = (c) => ({
  code: c.code,
  active: !!c.active,
  type: c.type,
  value: c.type === 'shipping' ? 0 : c.value,
  minTotal: c.minTotal || 0,
  maxUses: c.maxUses ?? null,
  note: c.note || '',
  startsAt: c.startsAt ? new Date(c.startsAt) : null,
  endsAt: c.endsAt ? new Date(c.endsAt) : null,
});

// الكوبون كما بتشوفه الزبونة بعد ما تكتبه (بدون عدد الاستعمال والملاحظة)
export const couponPublic = (c) => ({
  code: c.code, active: true, type: c.type, value: c.value, minTotal: c.minTotal,
  startsAt: c.startsAt?.toISOString() ?? null, endsAt: c.endsAt?.toISOString() ?? null,
});

export const ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  history: { orderBy: { at: 'asc' } },
};

// اللي بتشوفه الزبونة بصفحة التتبع: بدون ملاحظة الأدمن، والجوال مخفي جزئياً
export const trackOut = (o) => ({
  id: o.number,
  createdAt: o.createdAt.toISOString(),
  status: o.status,
  customer: { name: o.name, phone: `${o.phone.slice(0, 3)} •••• ${o.phone.slice(-3)}`, zone: o.zone, area: o.area, city: o.city },
  items: o.items.map((i) => ({ id: i.productId, name: i.name, size: i.size, color: i.color, qty: i.qty, unit: i.unit, image: i.image })),
  subtotal: o.subtotal,
  discounts: o.discounts,
  coupon: o.couponCode ? { code: o.couponCode, amount: o.couponAmount } : null,
  shipping: o.shipping,
  total: o.total,
  history: o.history.map((h) => ({ status: h.status, at: h.at.toISOString() })),
});

export const orderOut = (o) => ({
  id: o.number,
  createdAt: o.createdAt.toISOString(),
  status: o.status,
  payment: o.payment,
  customer: { name: o.name, phone: o.phone, whatsappOk: o.whatsappOk, zone: o.zone, area: o.area, city: o.city, address: o.address, notes: o.notes },
  items: o.items.map((i) => ({ id: i.productId, name: i.name, size: i.size, color: i.color, qty: i.qty, unit: i.unit, image: i.image })),
  subtotal: o.subtotal,
  discounts: o.discounts,
  coupon: o.couponCode ? { code: o.couponCode, amount: o.couponAmount } : null,
  shipping: o.shipping,
  total: o.total,
  note: o.adminNote,
  history: o.history.map((h) => ({ status: h.status, at: h.at.toISOString() })),
});
