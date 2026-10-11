// تتبع الطلبات: مفاتيح الطلبات محفوظة على جهاز الزبونة، والسيرفر بيرجّع حالة كل طلب
import { storage } from '../utils.js';

const KEY = 'nunu_track'; // [{ token, number }]
const MAX = 30;

const saved = () => storage.get(KEY, []).filter((x) => x && x.token && x.number);

// بعد ما ينعمل الطلب أو تلاقيه برقم الطلب والجوال
export function rememberOrder(number, token) {
  if (!token) return;
  const list = [{ number, token }, ...saved().filter((x) => x.number !== number)].slice(0, MAX);
  storage.set(KEY, list);
}

export const hasSavedOrders = () => saved().length > 0;

async function post(path, body) {
  let res;
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('ما قدرنا نوصل للسيرفر — تأكدي من الإنترنت وجربي كمان مرة');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'صار خطأ — جربي كمان مرة');
  return data;
}

// طلبات هالجهاز (الأحدث أول)
export async function myOrders() {
  const list = saved();
  if (!list.length) return [];
  const { orders, dead } = await post('/api/track', { tokens: list.map((x) => x.token) });
  if (dead.length) storage.set(KEY, list.filter((x) => !dead.includes(x.token)));
  return orders;
}

// من جهاز تاني: رقم الطلب + الجوال
export async function lookupOrder(number, phone) {
  const { order, trackToken } = await post('/api/track/lookup', { number, phone });
  rememberOrder(order.id, trackToken);
  return order;
}
