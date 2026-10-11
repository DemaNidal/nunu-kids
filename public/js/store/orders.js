import { rememberOrder } from './tracking.js';

// إرسال الطلب للسيرفر. السيرفر بيحسب الأسعار والخصومات والتوصيل من جديد،
// بيتأكد من المخزون والكوبون، وبيحفظ الطلب بقاعدة البيانات.

/**
 * @param {{ customer, items: {id, size, color, qty}[], couponCode?: string }} payload
 * @returns {Promise<object>} الطلب كما انحفظ
 */
export async function placeOrder(payload) {
  let res;
  try {
    res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('ما قدرنا نوصل للسيرفر — تأكدي من الإنترنت وجربي كمان مرة');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'صار خطأ وما انبعت الطلب — جربي كمان مرة');
  rememberOrder(data.order.id, data.trackToken); // عشان يبين بصفحة "تتبع طلبي" على هالجهاز
  return data.order;
}
