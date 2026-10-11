// بيانات المتجر من السيرفر: المنتجات الظاهرة، العروض الشغّالة، والإعدادات — مرة وحدة لكل صفحة.
// باقي الملفات (catalog، pricing، config) بتستنى هاد الملف قبل ما تشتغل (top-level await).
// إذا السيرفر مش شغّال (مثلاً فتحتي الصفحة كملف)، منرجع للأمثلة الموجودة بالمشروع عشان الصفحة تضل تفتح.

async function load() {
  try {
    const res = await fetch('/api/store', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    return { ...(await res.json()), offline: false };
  } catch {
    const [{ PRODUCTS }, { OFFERS }] = await Promise.all([import('../data/products.js'), import('../data/offers.js')]);
    return { products: PRODUCTS, offers: OFFERS, settings: {}, offline: true };
  }
}

export const REMOTE = await load();
