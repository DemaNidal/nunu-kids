// حفظ الطلبات — مؤقتاً بالمتصفح.
// بخطوة السيرفر، createOrder رح تبعت الطلب لـ API وهيك بيوصل للوحة الأدمن.
import { storage } from '../utils.js';

const KEY = 'nunu_orders';

const newOrderId = () => `NK-${String(Date.now()).slice(-6)}`;

export function createOrder({ customer, totals, shipping }) {
  const order = {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    status: 'new',
    payment: 'cod',
    customer,
    items: totals.rows.map((r) => ({
      id: r.product.id, name: r.product.name, size: r.size, color: r.color, qty: r.qty, unit: r.unit,
    })),
    subtotal: totals.subtotal,
    discounts: totals.discounts,
    shipping,
    total: totals.total + shipping,
  };
  storage.set(KEY, [order, ...storage.get(KEY, [])]);
  return order;
}
