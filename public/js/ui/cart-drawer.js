// السلة الجانبية
import { STORE } from '../config.js';
import { $, esc, money, img, sizeLabel } from '../utils.js';
import { cart } from '../store/cart.js';
import { recommend } from '../store/recommend.js';
import { icon } from './icons.js';
import { productUrl, qtyControl, suggestBox } from './components.js';

export function drawerHTML() {
  return `
    <div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" aria-label="السلة">
      <div class="drawer__head">
        <h3>سلتك</h3>
        <button class="icon-btn" id="closeCart" aria-label="إغلاق">${icon('x')}</button>
      </div>
      <div class="ship-bar" id="shipBar">
        <p id="shipMsg"></p>
        <div class="ship-bar__track"><div class="ship-bar__fill" id="shipFill"></div></div>
      </div>
      <div class="drawer__items" id="cartItems"></div>
      <div class="drawer__foot">
        <div id="cartDiscounts"></div>
        <div class="drawer__total"><span>المجموع</span><b id="cartTotal"></b></div>
        <a href="checkout.html" class="btn btn--primary btn--block">إتمام الطلب</a>
        <p class="drawer__note">الدفع نقداً عند الاستلام</p>
      </div>
    </aside>
    <div class="toast" id="toast" role="status"></div>`;
}

// المبلغ الناقص للتوصيل المجاني (0 إذا وصلت أو ما في توصيل مجاني)
export const freeShippingGap = (total) =>
  STORE.freeShippingOver ? Math.max(0, STORE.freeShippingOver - total) : 0;

// اقتراحات بتكمّل الطلب وبتقرّب من التوصيل المجاني
export function cartSuggestions(total, { limit = 2, titles = {} } = {}) {
  const gap = freeShippingGap(total);
  const products = recommend({ cart: cart.lines, gap, maxPrice: 80, limit });
  const { needMore = (g) => `ضيفي ${money(g)} وبيصير التوصيل مجاني`, done = 'بتلبق مع طلبك' } = titles;
  const title = gap ? needMore(gap) : done;
  return suggestBox(title, products, cart.lines);
}

function renderShipping(total) {
  const bar = $('#shipBar');
  bar.hidden = !STORE.freeShippingOver;
  if (bar.hidden) return;
  const gap = freeShippingGap(total);
  $('#shipMsg').innerHTML = gap
    ? `ضايلك <b>${money(gap)}</b> وبيصير التوصيل مجاني`
    : 'مبروك! طلبك صار توصيله مجاني 🎉';
  $('#shipFill').style.width = `${Math.min(100, (total / STORE.freeShippingOver) * 100)}%`;
}

const lineHTML = (r, i) => `
  <div class="line">
    <a href="${productUrl(r.product)}" class="line__img"><img src="${img(r.product.images[0], 150)}" alt=""></a>
    <div>
      <a href="${productUrl(r.product)}" class="line__name">${esc(r.product.name)}</a>
      <div class="line__meta">${sizeLabel(r.size)}${r.color ? ` · ${esc(r.color)}` : ''}</div>
      ${qtyControl(r.qty, { plus: `data-cart-qty="${i}" data-d="1"`, minus: `data-cart-qty="${i}" data-d="-1"` })}
    </div>
    <div class="line__price">${money(r.unit * r.qty)}</div>
  </div>`;

export function renderDrawer() {
  const t = cart.totals();
  $('#cartCount').textContent = t.count;
  $('#cartCount').hidden = !t.count;
  $('#cartTotal').textContent = money(t.total);
  renderShipping(t.total);
  $('#cartDiscounts').innerHTML = t.discounts
    .map((d) => `<div class="drawer__disc"><span>${esc(d.title)}</span><b>− ${money(d.amount)}</b></div>`)
    .join('');
  $('#cartItems').innerHTML = t.rows.length
    ? t.rows.map(lineHTML).join('') + cartSuggestions(t.total)
    : '<p class="empty">سلتك فاضية لسا</p>';
}

export function openDrawer(open = true) {
  $('#drawer').classList.toggle('show', open);
  $('#overlay').classList.toggle('show', open);
}

export function bumpCartCount() {
  const el = $('#cartCount');
  el.classList.remove('bump');
  void el.offsetWidth; // إعادة تشغيل الأنيميشن
  el.classList.add('bump');
}

export function initDrawer() {
  $('#cartBtn').addEventListener('click', () => openDrawer(true));
  $('#closeCart').addEventListener('click', () => openDrawer(false));
  $('#overlay').addEventListener('click', () => openDrawer(false));
  renderDrawer();
}
