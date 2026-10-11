// طبقة البيانات للوحة الأدمن — كل شي بيمشي عبر السيرفر (/api/admin) لقاعدة البيانات.
// إذا الجلسة خلصت أو مش مسجّلة دخول، بنرجع لصفحة الدخول تلقائياً.

const BASE = '/api/admin';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'nunu-admin', // حماية من طلبات من مواقع تانية
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('ما قدرنا نوصل للسيرفر — تأكدي إنه شغّال');
  }
  if (res.status === 401 && !location.pathname.endsWith('login.html')) {
    const next = location.pathname.split('/').pop() + location.search + location.hash;
    location.href = `login.html?next=${encodeURIComponent(next)}`;
    return new Promise(() => {}); // الصفحة رح تتغير
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'صار خطأ — جربي كمان مرة');
  return data;
}

// ===== الدخول =====
export const login = (username, password) => request('/login', { method: 'POST', body: { username, password } });
export const logout = () => request('/logout', { method: 'POST', body: {} });
export const me = () => request('/me');

// ===== الطلبات =====
// حالات الطلب بالترتيب، و"ملغي" لحالها
export const STATUSES = {
  new: { label: 'جديد', next: 'confirmed', action: 'تأكيد الطلب' },
  confirmed: { label: 'مؤكد', next: 'shipped', action: 'سلّمته للمندوب' },
  shipped: { label: 'مع المندوب', next: 'delivered', action: 'تم التسليم' },
  delivered: { label: 'تم التسليم' },
  cancelled: { label: 'ملغي' },
};
export const FLOW = ['new', 'confirmed', 'shipped', 'delivered'];

export const listOrders = () => request('/orders');
export const getOrder = (id) => request(`/orders/${encodeURIComponent(id)}`).catch(() => null);
// changes: { status } و/أو { note }
export const updateOrder = (id, changes) => request(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });

// ===== المنتجات =====
export const listProducts = () => request('/products');
export const getProduct = (id) => request(`/products/${encodeURIComponent(id)}`).catch(() => null);

// الصور الجديدة (data:) بترتفع للسيرفر أول، وبتنحفظ روابطها بالمنتج
async function uploadImages(images) {
  return Promise.all(images.map(async (src) => (
    src.startsWith('data:') ? (await request('/uploads', { method: 'POST', body: { dataUrl: src } })).url : src
  )));
}

export async function saveProduct(product) {
  const body = { ...product, images: await uploadImages(product.images) };
  return product.id
    ? request(`/products/${product.id}`, { method: 'PUT', body })
    : request('/products', { method: 'POST', body });
}

export const deleteProduct = (id) => request(`/products/${id}`, { method: 'DELETE' });

// ===== العروض والكوبونات =====
function crud(path) {
  return {
    list: () => request(path),
    save: (item) => (item.id
      ? request(`${path}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: item })
      : request(path, { method: 'POST', body: item })),
    remove: (id) => request(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

export const offersApi = crud('/offers');
export const couponsApi = crud('/coupons');

// حالة العرض أو الكوبون حسب التشغيل والتواريخ
export function scheduleState(x, now = Date.now()) {
  if (!x.active) return { key: 'off', label: 'متوقف' };
  if (x.startsAt && now < Date.parse(x.startsAt)) return { key: 'soon', label: 'مجدول' };
  if (x.endsAt && now >= Date.parse(x.endsAt)) return { key: 'ended', label: 'منتهي' };
  if (x.maxUses != null && x.used >= x.maxUses) return { key: 'ended', label: 'خلص استعماله' };
  return { key: 'live', label: 'فعّال' };
}

// ===== إعدادات المتجر =====
export const getSettings = () => request('/settings');
export const saveSettings = (settings) => request('/settings', { method: 'PUT', body: settings });
