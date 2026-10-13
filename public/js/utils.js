// أدوات صغيرة مشتركة
import { STORE, SIZES } from './config.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const money = (n) => `${n} ${STORE.currency}`;

// بيعرض الأرقام بالترتيب الصحيح (0–3 مش 3–0) جوا النص العربي
export const ltr = (s) => `⁦${s}⁩`;

export const sizeLabel = (key) => {
  const s = SIZES[key];
  if (!s) return key;
  return s.range ? `${ltr(s.range)} ${s.unit}` : s.unit;
};

// الصورة: رقم صورة Unsplash (مؤقت)، أو رابط كامل / صورة مرفوعة (data:) بتنعرض متل ما هي.
// لاحقاً روابط Cloudinary بتنعرض بنفس الطريقة.
// الصور المرفوعة محفوظة بـ 3 أحجام. بنختار أصغر حجم بيطلع واضح (حتى على شاشات الجوال الحادة)
const IMG_SIZES = [400, 800, 1600];
const pickSize = (w) => IMG_SIZES.find((s) => s >= w * 1.5) || IMG_SIZES.at(-1);

// الصورة المرفوعة بحجم معيّن. r2:products/abc.webp ← على Cloudflare R2 · up:abc.webp ← على السيرفر نفسه
const UPLOADED = /^(r2|up):(.+)\.(webp|jpg)$/;
function variant(id, size) {
  const [, where, name, ext] = UPLOADED.exec(id);
  const base = where === 'r2' ? (STORE.imagesUrl || '').replace(/\/$/, '') : '/uploads';
  return `${base}/${name}-${size}.${ext}`;
}

// srcset للصور المرفوعة: المتصفح بيختار الحجم حسب عرض الصورة عالشاشة وحدّة الشاشة.
// sizes = قديش عرض الصورة تقريباً (مثلاً "50vw"). للصور القديمة (روابط) بيرجع فاضي
export function srcset(id, sizes) {
  if (!UPLOADED.test(id)) return '';
  return ` srcset="${IMG_SIZES.map((w) => `${variant(id, w)} ${w}w`).join(', ')}" sizes="${sizes}"`;
}

export function img(id, w = 600, h = w) {
  if (UPLOADED.test(id)) return variant(id, pickSize(w));
  return /^(https?:|data:|blob:|\/)/.test(id)
    ? id
    : `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;
}

// localStorage آمن (ممكن يكون مقفول بالتصفح الخاص)
export const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
};

export const queryParam = (name) => new URLSearchParams(location.search).get(name);

// "يوم واحد" / "يومين" / "3 أيام" / "11 يوم"
export const daysLabel = (n) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوم`);

// "قطعة" / "قطعتين" / "7 قطع" / "22 قطعة"
export const piecesLabel = (n) => (n === 1 ? 'قطعة وحدة' : n === 2 ? 'قطعتين' : n <= 10 ? `${n} قطع` : `${n} قطعة`);

// جملة التبديل الموحّدة بكل الموقع
export const exchangeText = () => `تبديل المقاس خلال ${daysLabel(STORE.exchangeDays)}`;

// أرقام الجوال بالصيغة الدولية متل واتساب: 970 (جوال، أوريدو) أو 972 (أرقام إسرائيلية)
// "972541234567" ← "+972 54 123 4567"
export const phoneDisplay = (p) => {
  const m = /^(970|972)(\d{2})(\d{3})(\d{4})$/.exec(String(p || ''));
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : String(p || '');
};

// نسخ نص: الطريقة الحديثة بتشتغل بس على https أو localhost،
// فإذا مش متاحة (مثلاً فتحتي الموقع من الموبايل على http://192.168...) منستعمل الطريقة القديمة
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* نجرب الطريقة القديمة */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.append(ta);
  ta.select();
  ta.setSelectionRange(0, text.length); // iPhone
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

// تاريخ بعد عدد أيام عمل (بدون أيام العطلة)
export function addWorkDays(from, days) {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (!STORE.weekend.includes(d.getDay())) left--;
  }
  return d;
}

// "الأحد 12 أكتوبر" بأرقام عادية
export const formatDay = (d) =>
  new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
