// كوبونات الخصم بصفحة الدفع. الكود بيتفحص بالسيرفر (قائمة الكوبونات مش ظاهرة للزبائن)،
// ولما تتغير السلة بنعيد فحص الشروط هون. الفحص النهائي بيصير بالسيرفر وقت الطلب.
import { money } from '../utils.js';
import { couponError, couponDiscount, normalizeCode } from './pricing-core.js';

export { couponDiscount, normalizeCode };

/** @returns {Promise<{ ok: true, coupon } | { ok: false, error: string }>} */
export async function checkCoupon(code, total) {
  try {
    const res = await fetch('/api/coupons/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: normalizeCode(code), total }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'ما قدرنا نتأكد من الكوبون هلأ — جربي كمان شوي' };
  }
}

// لما يتغير مجموع السلة: الكوبون لسا بيشتغل؟ ('' = آه)
export const recheckCoupon = (c, total) => couponError(c, total, Date.now(), money);

// وصف قصير للكوبون: "خصم 10%" / "خصم 15 ₪" / "توصيل مجاني"
export const couponLabel = (c) =>
  c.type === 'percent' ? `خصم ${c.value}%` : c.type === 'fixed' ? `خصم ${money(c.value)}` : 'توصيل مجاني';
