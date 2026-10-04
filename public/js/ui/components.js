// قطع واجهة بتتكرر بأكثر من صفحة
import { $, esc, money, img, sizeLabel } from '../utils.js';
import { sizesOf, inStock, stockOf } from '../store/catalog.js';
import { priceOf, bxgyFor } from '../store/pricing.js';
import { quickSize } from '../store/recommend.js';
import { favorites } from '../store/favorites.js';
import { icon } from './icons.js';

export const productUrl = (p) => `product.html?id=${p.id}`;

// زر القلب (المفضلة) — نفس الزر بكل مكان، والحالة محفوظة
export function favButton(p, cls = '') {
  const on = favorites.has(p.id);
  return `<button type="button" class="icon-btn fav-btn ${cls} ${on ? 'on' : ''}" data-fav="${p.id}"
    aria-pressed="${on}" aria-label="${on ? 'شيلي من المفضلة' : 'أضيفي للمفضلة'}">${icon('heart')}</button>`;
}

// السعر: الحالي + القديم مشطوب (إذا في خصم)
export function priceTag(p, { save = false, cls = '' } = {}) {
  const { price, old } = priceOf(p);
  return `
    <div class="price ${old ? 'price--sale' : ''} ${cls}">
      <b>${money(price)}</b>
      ${old ? `<s>${money(old)}</s>` : ''}
      ${old && save ? `<span class="save">وفّري ${money(old - price)}</span>` : ''}
    </div>`;
}

export function badges(p) {
  const { pct } = priceOf(p);
  const deal = bxgyFor(p)[0];
  return `
    <div class="badges">
      ${p.isNew ? '<span class="badge badge--new">جديد</span>' : ''}
      ${pct ? `<span class="badge badge--sale">خصم ${pct}%</span>` : ''}
      ${deal ? `<span class="badge badge--deal">${deal.buy}+${deal.get} مجاناً</span>` : ''}
      ${inStock(p) ? '' : '<span class="badge badge--out">نفذت الكمية</span>'}
    </div>`;
}

export function productCard(p) {
  const url = productUrl(p);
  return `
    <article class="card">
      <a href="${url}" class="card__img">
        <img src="${img(p.images[0], 500)}" alt="${esc(p.name)}" loading="lazy">
        ${p.images[1] ? `<img class="card__alt" src="${img(p.images[1], 500)}" alt="" loading="lazy">` : ''}
        ${badges(p)}
        ${favButton(p, 'card__fav')}
      </a>
      <div class="card__body">
        <a href="${url}" class="card__title">${esc(p.name)}</a>
        <div class="chips">
          ${sizesOf(p).map((s) => `<span class="${stockOf(p, s) ? '' : 'off'}">${s === 'one' ? 'مقاس واحد' : s}</span>`).join('')}
        </div>
        ${priceTag(p)}
        <a href="${url}" class="btn btn--ghost btn--sm">${inStock(p) ? 'اختاري المقاس' : 'شوفي التفاصيل'}</a>
      </div>
    </article>`;
}

export const productGrid = (products) => products.map(productCard).join('');

// سطر اقتراح صغير مع زر إضافة سريعة
export function suggestRow(p, cartLines) {
  const size = quickSize(p, cartLines);
  const { price, old } = priceOf(p);
  return `
    <div class="suggest__row">
      <a href="${productUrl(p)}" class="suggest__img"><img src="${img(p.images[0], 120)}" alt=""></a>
      <div class="suggest__info">
        <a href="${productUrl(p)}">${esc(p.name)}</a>
        <small>${sizeLabel(size)} · <b>${money(price)}</b>${old ? ` <s>${money(old)}</s>` : ''}</small>
      </div>
      <button type="button" class="suggest__add" data-quick-add="${p.id}" data-size="${size}">+ أضيفي</button>
    </div>`;
}

export function suggestBox(title, products, cartLines) {
  if (!products.length) return '';
  return `
    <div class="suggest">
      <p class="suggest__title">${esc(title)}</p>
      ${products.map((p) => suggestRow(p, cartLines)).join('')}
    </div>`;
}

// زر + / − للكمية
export const qtyControl = (value, { plus, minus, cls = '' }) => `
  <div class="qty ${cls}">
    <button type="button" ${plus} aria-label="زيادة">+</button>
    <span>${value}</span>
    <button type="button" ${minus} aria-label="نقصان">−</button>
  </div>`;

// ===== عدّاد تنازلي =====
const UNITS = [['d', 'يوم'], ['h', 'ساعة'], ['m', 'دقيقة'], ['s', 'ثانية']];

export const countdownHTML = (cls = '') => `
  <div class="countdown ${cls}" aria-label="الوقت المتبقي للعرض">
    ${UNITS.map(([k, label]) => `<div class="countdown__unit"><b data-u="${k}">00</b><span>${label}</span></div>`).join('')}
  </div>`;

export function startCountdown(root, endsAt, onEnd) {
  if (!root) return;
  const end = Date.parse(endsAt);
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
    UNITS.forEach(([k]) => { $(`[data-u="${k}"]`, root).textContent = String(v[k]).padStart(2, '0'); });
    if (!s) { clearInterval(timer); onEnd?.(); }
  };
  const timer = setInterval(tick, 1000);
  tick();
}

// ===== رسالة صغيرة أسفل الشاشة =====
let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}
