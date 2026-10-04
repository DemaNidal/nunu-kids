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

// الصور مؤقتاً من Unsplash — لاحقاً من Cloudinary
export const img = (id, w = 600, h = w) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;

// localStorage آمن (ممكن يكون مقفول بالتصفح الخاص)
export const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* تجاهل */ }
  },
};

export const queryParam = (name) => new URLSearchParams(location.search).get(name);

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
