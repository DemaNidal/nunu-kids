// ============================================================
// الاقتراحات الذكية — المرحلة الأولى
// بنسجّل تصرفات الزبونة (شو شافت، أي مقاسات بتختار، شو ضافت للسلة)
// وبنرتّب المنتجات حسب شو الأنسب إلها. لاحقاً، لما يصير عنا سيرفر
// وبيانات طلبات حقيقية، منبدّل منطق الترتيب هون بنموذج ذكاء اصطناعي
// من غير ما نغير باقي الموقع.
// ============================================================

const Behavior = {
  data: (() => {
    try { return JSON.parse(localStorage.getItem('nunu_behavior')) || {}; } catch (e) { return {}; }
  })(),
  save() { try { localStorage.setItem('nunu_behavior', JSON.stringify(this.data)); } catch (e) {} },
  // view | size | add
  track(type, payload) {
    const d = this.data;
    d.views = d.views || []; d.sizes = d.sizes || {}; d.cats = d.cats || {}; d.adds = d.adds || [];
    if (type === 'view') {
      d.views = [payload.id, ...d.views.filter((x) => x !== payload.id)].slice(0, 20);
      d.cats[payload.category] = (d.cats[payload.category] || 0) + 1;
    }
    if (type === 'size') d.sizes[payload.size] = (d.sizes[payload.size] || 0) + 1;
    if (type === 'add') d.adds = [payload.id, ...d.adds].slice(0, 30);
    this.save();
  },
  // المقاس الأكثر اختياراً (أو من السلة)
  preferredSize(cart = []) {
    const counts = { ...(this.data.sizes || {}) };
    cart.forEach((l) => (counts[l.size] = (counts[l.size] || 0) + 3 * l.qty));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  },
  recentlyViewed(exclude = []) {
    return (this.data.views || []).filter((id) => !exclude.includes(id)).map(findProduct).filter(Boolean);
  },
};

// القطع اللي بتكمّل بعض (مثلاً: اللي بتشتري بدي بتحتاج كلسات وطاقية)
const COMPLEMENTS = {
  underwear: ['accessories', 'clothes'],
  clothes: ['accessories', 'underwear'],
  accessories: ['underwear', 'clothes'],
  bundles: ['accessories'],
};

function scoreProduct(p, ctx) {
  if (!inStock(p)) return -Infinity;
  let s = 0;
  const b = Behavior.data;
  // مقاس الزبونة متوفر بهاد المنتج؟
  if (ctx.size && p.stock[ctx.size] > 0) s += 3;
  if (ctx.size && !(ctx.size in p.stock) && !('one' in p.stock)) s -= 3;
  // نفس القسم (مشابه) أو قسم مكمّل
  if (ctx.similarTo && p.category === ctx.similarTo.category) s += 3;
  if (ctx.complementOf && ctx.complementOf.some((c) => (COMPLEMENTS[c] || []).includes(p.category))) s += 2;
  // اهتمام الزبونة بالقسم
  s += Math.min(3, (b.cats?.[p.category] || 0) * 0.5);
  // شافته قبل وما اشترته
  if ((b.views || []).includes(p.id)) s += 1;
  // عليه عرض
  if (priceOf(p).old || bxgyFor(p).length) s += 1;
  if (p.isNew) s += 0.5;
  // قريب من المبلغ الناقص للتوصيل المجاني
  if (ctx.gap) {
    const price = priceOf(p).price;
    s += price >= ctx.gap ? 3 - Math.min(2, (price - ctx.gap) / 30) : -1;
  }
  if (ctx.maxPrice && priceOf(p).price > ctx.maxPrice) s -= 4;
  return s;
}

function recommend({ exclude = [], similarTo = null, cart = [], gap = 0, maxPrice = 0, limit = 4, bundles = false } = {}) {
  const inCart = cart.map((l) => l.id);
  const ctx = {
    size: Behavior.preferredSize(cart),
    similarTo,
    complementOf: cart.length ? [...new Set(cart.map((l) => findProduct(l.id)?.category))] : null,
    gap, maxPrice,
  };
  return PRODUCTS
    .filter((p) => !exclude.includes(p.id) && !inCart.includes(p.id) && (bundles || p.category !== 'bundles'))
    .map((p) => ({ p, s: scoreProduct(p, ctx) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

// المقاس المناسب لإضافة سريعة (بدون صفحة المنتج)
function quickSize(p, cart) {
  const pref = Behavior.preferredSize(cart);
  if (pref && p.stock[pref] > 0) return pref;
  return sizesOf(p).find((s) => p.stock[s] > 0);
}
