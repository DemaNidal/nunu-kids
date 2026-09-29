// السلة: الأسطر محفوظة بالمتصفح، وأي صفحة بتقدر "تسمع" للتغييرات
import { storage } from '../utils.js';
import { findProduct, stockOf } from './catalog.js';
import { priceOf, bxgyDiscounts } from './pricing.js';

const KEY = 'nunu_cart';
const listeners = new Set();

// كل سطر: { id, size, color, qty }
// عند التحميل: بنشيل المنتجات المحذوفة، وبنقلل الكمية إذا المخزون نزل بعد ما انضافت
let lines = storage.get(KEY, [])
  .filter((l) => l && l.size && findProduct(l.id))
  .map((l) => ({ ...l, qty: Math.min(l.qty, stockOf(findProduct(l.id), l.size)) }))
  .filter((l) => l.qty > 0);

function commit(event) {
  storage.set(KEY, lines);
  listeners.forEach((fn) => fn(event));
}

export const cart = {
  get lines() { return lines; },

  // بترجع false إذا الكمية أكثر من المخزون
  add(id, size, color = '', qty = 1) {
    if (this.qtyOf(id, size) + qty > stockOf(findProduct(id), size)) return false;
    const line = lines.find((l) => l.id === id && l.size === size && l.color === color);
    if (line) line.qty += qty;
    else lines.push({ id, size, color, qty });
    commit({ type: 'add', id, size });
    return true;
  },

  // بترجع false إذا الزيادة أكثر من المخزون
  changeQty(index, delta) {
    const line = lines[index];
    if (!line) return false;
    if (delta > 0 && this.qtyOf(line.id, line.size) + delta > stockOf(findProduct(line.id), line.size)) return false;
    line.qty += delta;
    if (line.qty <= 0) lines.splice(index, 1);
    commit({ type: 'change' });
    return true;
  },

  qtyOf(id, size) {
    return lines.filter((l) => l.id === id && l.size === size).reduce((s, l) => s + l.qty, 0);
  },

  clear() {
    lines = [];
    commit({ type: 'clear' });
  },

  // بترجع دالة لإلغاء الاستماع
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  totals() {
    const rows = lines
      .map((l) => {
        const product = findProduct(l.id);
        return product && { ...l, product, unit: priceOf(product).price };
      })
      .filter(Boolean);
    const subtotal = rows.reduce((s, r) => s + r.unit * r.qty, 0);
    const discounts = bxgyDiscounts(rows);
    const total = subtotal - discounts.reduce((s, d) => s + d.amount, 0);
    const count = rows.reduce((s, r) => s + r.qty, 0);
    return { rows, subtotal, discounts, total, count };
  },
};
