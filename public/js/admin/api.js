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

// ===== الصور =====
// WebP أخف بكتير. سفاري القديم ما بيعرف يعمله، فبنرجع لـ JPG
export function toImageData(canvas) {
  const webp = canvas.toDataURL('image/webp', 0.82);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('ما قدرنا نقرأ الصورة'));
    im.src = src;
  });
}

// من الصورة الكبيرة بنعمل 3 أحجام: 1600 (صفحة المنتج)، 800 (القوائم)، 400 (الصور الصغيرة)
async function imageVariants(dataUrl) {
  const im = await loadImage(dataUrl);
  const variants = {};
  for (const w of [400, 800, 1600]) {
    const scale = Math.min(1, w / im.width); // بالعرض: الـ srcset بيعتمد عالعرض
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(im.width * scale);
    canvas.height = Math.round(im.height * scale);
    canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
    variants[w] = toImageData(canvas);
  }
  return variants;
}

// الصور الجديدة (data:) بترتفع للسيرفر أول (واحدة ورا التانية عشان ما نتقل عالنت)، وبتنحفظ روابطها بالمنتج
async function uploadImages(images) {
  const out = [];
  for (const src of images) {
    out.push(src.startsWith('data:') ? (await request('/uploads', { method: 'POST', body: { variants: await imageVariants(src) } })).url : src);
  }
  return out;
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

// ===== النسخ الاحتياطية =====
export const listBackups = () => request('/backups');
export const runBackup = () => request('/backups', { method: 'POST', body: {} });
export const restoreBackup = ({ name, from, password }) => request('/backups/restore', { method: 'POST', body: { name, from, password } });

// ملف كبير: بنبعته كما هو (مش JSON)
export async function uploadBackup(file) {
  let res;
  try {
    res = await fetch(`${BASE}/backups/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'nunu-admin', 'Content-Type': 'application/octet-stream' },
      body: file,
    });
  } catch {
    throw new Error('ما قدرنا نوصل للسيرفر — تأكدي إنه شغّال');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ما زبط رفع الملف');
  return data;
}
export const backupUrl = (name) => `${BASE}/backups/${encodeURIComponent(name)}`;

// ===== إعدادات المتجر =====
export const getSettings = () => request('/settings');
export const saveSettings = (settings) => request('/settings', { method: 'PUT', body: settings });
