// البحث والفلترة والترتيب (منطق بس، بدون HTML)
import { CATEGORIES, SIZES } from '../config.js';
import { allProducts, sizesOf, stockOf, inStock, bundleItems } from './catalog.js';
import { priceOf, bxgyFor } from './pricing.js';

// شرائح السعر بالفلتر
export const PRICE_RANGES = [
  { id: 'u30', label: 'أقل من 30 ₪', min: 0, max: 29 },
  { id: '30-60', label: '30 – 60 ₪', min: 30, max: 60 },
  { id: '60-150', label: '60 – 150 ₪', min: 61, max: 150 },
  { id: 'o150', label: 'أكثر من 150 ₪', min: 151, max: Infinity },
];

export const SORTS = {
  featured: (a, b) => Number(b.isNew || 0) - Number(a.isNew || 0),
  new: (a, b) => b.id - a.id,
  'price-asc': (a, b) => priceOf(a).price - priceOf(b).price,
  'price-desc': (a, b) => priceOf(b).price - priceOf(a).price,
  discount: (a, b) => priceOf(b).pct - priceOf(a).pct,
};

// توحيد الكتابة العربية للبحث: أ/إ/آ = ا، ة = ه، ى = ي، وبدون تشكيل
const normalize = (s) => String(s || '')
  .toLowerCase()
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .trim();

const matchesQuery = (p, q) => {
  if (!q) return true;
  const text = normalize([p.name, p.description, CATEGORIES[p.category], ...bundleItems(p).map((i) => i.name)].join(' '));
  return normalize(q).split(/\s+/).every((word) => text.includes(word));
};

export const isOnSale = (p) => Boolean(priceOf(p).old || bxgyFor(p).length);

/** @param {object} f الفلاتر: { cat, sizes:Set, colors:Set, price, sale, stock, q } */
export function filterProducts(f) {
  const range = PRICE_RANGES.find((r) => r.id === f.price);
  return allProducts().filter((p) =>
    (f.cat === 'all' || p.category === f.cat) &&
    (!f.sizes.size || [...f.sizes].some((s) => stockOf(p, s) > 0)) &&
    (!f.colors.size || (p.colors || []).some((c) => f.colors.has(c.name))) &&
    (!range || (priceOf(p).price >= range.min && priceOf(p).price <= range.max)) &&
    (!f.sale || isOnSale(p)) &&
    (!f.stock || inStock(p)) &&
    matchesQuery(p, f.q));
}

export const sortProducts = (list, sort) => [...list].sort(SORTS[sort] || SORTS.featured);

// كل المقاسات المتوفرة بالمتجر، بالترتيب
export const allSizes = () => Object.keys(SIZES).filter((s) => allProducts().some((p) => sizesOf(p).includes(s)));

// كل الألوان (بدون تكرار)
export function allColors() {
  const map = new Map();
  allProducts().forEach((p) => (p.colors || []).forEach((c) => map.set(c.name, c.hex)));
  return [...map].map(([name, hex]) => ({ name, hex }));
}
