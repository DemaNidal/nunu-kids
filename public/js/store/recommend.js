// الاقتراحات الذكية — المرحلة الأولى (قواعد).
// لاحقاً، مع السيرفر وبيانات الطلبات، منبدّل scoreProduct بنموذج ذكاء اصطناعي
// من غير ما يتغير أي إشي برا هاد الملف.
import { allProducts, isBundle, inStock, stockOf, firstInStockSize, findProduct } from './catalog.js';
import { priceOf, bxgyFor } from './pricing.js';
import { behavior } from './behavior.js';

// القطع اللي بتكمّل بعض
const COMPLEMENTS = {
  underwear: ['accessories', 'clothes'],
  clothes: ['accessories', 'underwear'],
  accessories: ['underwear', 'clothes'],
  bundles: ['accessories'],
};

function scoreProduct(p, ctx) {
  const price = priceOf(p).price;
  let score = 0;

  if (ctx.size) score += stockOf(p, ctx.size) > 0 ? 3 : ('one' in p.stock ? 0 : -3);
  if (ctx.similarTo?.category === p.category) score += 3;
  if (ctx.cartCategories.some((c) => COMPLEMENTS[c]?.includes(p.category))) score += 2;
  score += Math.min(3, behavior.interestIn(p.category) * 0.5);
  if (behavior.hasViewed(p.id)) score += 1;
  if (priceOf(p).old || bxgyFor(p).length) score += 1;
  if (p.isNew) score += 0.5;
  if (ctx.gap) score += price >= ctx.gap ? 3 - Math.min(2, (price - ctx.gap) / 30) : -1;
  if (ctx.maxPrice && price > ctx.maxPrice) score -= 4;

  return score;
}

/**
 * @param {object} o
 * @param {number[]} [o.exclude]   منتجات ما بدنا نقترحها
 * @param {object}  [o.similarTo] منتج بدنا مشابه إله
 * @param {object[]} [o.cart]     أسطر السلة
 * @param {number}  [o.gap]       المبلغ الناقص للتوصيل المجاني
 * @param {number}  [o.maxPrice]
 * @param {number}  [o.limit]
 */
export function recommend({ exclude = [], similarTo = null, cart = [], gap = 0, maxPrice = 0, limit = 4 } = {}) {
  const skip = new Set([...exclude, ...cart.map((l) => l.id)]);
  const ctx = {
    size: behavior.preferredSize(cart),
    similarTo,
    cartCategories: [...new Set(cart.map((l) => findProduct(l.id)?.category).filter(Boolean))],
    gap: Math.max(0, gap),
    maxPrice,
  };
  return allProducts()
    .filter((p) => !skip.has(p.id) && !isBundle(p) && inStock(p))
    .map((p) => ({ p, score: scoreProduct(p, ctx) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

// مقاس مناسب للإضافة السريعة (بدون فتح صفحة المنتج)
export function quickSize(p, cart = []) {
  const preferred = behavior.preferredSize(cart);
  return preferred && stockOf(p, preferred) > 0 ? preferred : firstInStockSize(p);
}
