// منطق مشترك لكل الصفحات: تركيب الهيدر والفوتر، السلة، شريط الإعلانات
document.body.insertAdjacentHTML('afterbegin', SITE_TOP);
document.body.insertAdjacentHTML('beforeend', SITE_BOTTOM);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ===== السلة =====
// كل سطر: { id, size, color, qty }
const Cart = {
  items: (() => { try { return JSON.parse(localStorage.getItem('nunu_cart')) || []; } catch (e) { return []; } })()
    .filter((l) => l && findProduct(l.id) && l.size),
  save() { try { localStorage.setItem('nunu_cart', JSON.stringify(this.items)); } catch (e) {} },
  add(id, size, color = '', qty = 1) {
    const line = this.items.find((l) => l.id === id && l.size === size && l.color === color);
    line ? (line.qty += qty) : this.items.push({ id, size, color, qty });
    Behavior.track('add', { id }); Behavior.track('size', { size });
    this.save(); renderCart(); bumpCount();
  },
  change(i, d) {
    this.items[i].qty += d;
    if (this.items[i].qty <= 0) this.items.splice(i, 1);
    this.save(); renderCart();
  },
};

function renderCart() {
  const t = cartTotals(Cart.items);
  $('#cartCount').textContent = t.count;
  $('#cartTotal').textContent = money(t.total);

  const ship = STORE.freeShippingOver;
  const bar = $('.ship-bar');
  bar.hidden = !ship;
  if (ship) {
    const left = ship - t.total;
    $('#shipMsg').innerHTML = left > 0 ? `ضايلك <b>${money(left)}</b> وبيصير التوصيل مجاني` : 'مبروك! طلبك صار توصيله مجاني 🎉';
    $('#shipFill').style.width = `${Math.min(100, (t.total / ship) * 100)}%`;
  }

  $('#cartDiscounts').innerHTML = t.discounts.map((d) =>
    `<div class="drawer__disc"><span>${esc(d.title)}</span><b>− ${money(d.amount)}</b></div>`).join('');

  $('#cartItems').innerHTML = t.lines.length ? t.lines.map((l, i) => `
    <div class="line">
      <a href="product.html?id=${l.p.id}" class="line__img"><img src="${IMG(l.p.images[0], 150)}" alt=""></a>
      <div>
        <a href="product.html?id=${l.p.id}" class="line__name">${esc(l.p.name)}</a>
        <div class="line__meta">${SIZE_LABELS[l.size] || l.size}${l.color ? ` · ${esc(l.color)}` : ''}</div>
        <div class="qty">
          <button data-cart-qty="${i}" data-d="1" aria-label="زيادة">+</button>
          <span>${l.qty}</span>
          <button data-cart-qty="${i}" data-d="-1" aria-label="نقصان">−</button>
        </div>
      </div>
      <div class="line__price">${money(l.unit * l.qty)}</div>
    </div>`).join('') + cartSuggestions(t) : '<p class="empty">سلتك فاضية لسا</p>';
}

// اقتراح خفيف بالسلة: قطع بتكمّل الطلب (وبتقرّب من التوصيل المجاني)
function cartSuggestions(t) {
  const gap = STORE.freeShippingOver ? STORE.freeShippingOver - t.total : 0;
  const recs = recommend({ cart: Cart.items, gap: gap > 0 ? gap : 0, maxPrice: 80, limit: 2 });
  if (!recs.length) return '';
  return `
    <div class="suggest">
      <p class="suggest__title">${gap > 0 ? `ضيفي ${money(gap)} وبيصير التوصيل مجاني` : 'بتلبق مع طلبك'}</p>
      ${recs.map((p) => suggestRow(p)).join('')}
    </div>`;
}

function suggestRow(p) {
  const pr = priceOf(p);
  const size = quickSize(p, Cart.items);
  return `
    <div class="suggest__row">
      <a href="product.html?id=${p.id}" class="suggest__img"><img src="${IMG(p.images[0], 120)}" alt=""></a>
      <div class="suggest__info">
        <a href="product.html?id=${p.id}">${esc(p.name)}</a>
        <small>${SIZE_LABELS[size] || ''} · <b>${money(pr.price)}</b>${pr.old ? ` <s>${money(pr.old)}</s>` : ''}</small>
      </div>
      <button class="suggest__add" data-quick-add="${p.id}" data-size="${size}" aria-label="أضيفي ${esc(p.name)}">+ أضيفي</button>
    </div>`;
}

function bumpCount() {
  const c = $('#cartCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

const openCart = (open) => { $('#drawer').classList.toggle('show', open); $('#overlay').classList.toggle('show', open); };

document.addEventListener('click', (e) => {
  const qa = e.target.closest('[data-quick-add]');
  if (qa) {
    const p = findProduct(qa.dataset.quickAdd);
    Cart.add(p.id, qa.dataset.size, p.colors?.[0]?.name || '');
    toast(`انضاف ${p.name}`);
    return;
  }
  const q = e.target.closest('[data-cart-qty]');
  if (q) Cart.change(+q.dataset.cartQty, +q.dataset.d);
  const fav = e.target.closest('[data-fav]');
  if (fav) { e.preventDefault(); fav.classList.toggle('on'); }
});
$('#cartBtn').onclick = () => openCart(true);
$('#closeCart').onclick = () => openCart(false);
$('#overlay').onclick = () => openCart(false);
$('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
$$('#nav a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));
renderCart();
// رابط "العروض" بالقائمة بيظهر بس إذا في عروض فعّالة
if (!liveOffers().length) $$('.nav__sale').forEach((a) => a.remove());

// ===== شريط الإعلانات: رسائل ثابتة + العروض الفعّالة =====
const ANNOUNCEMENTS = [
  ...(STORE.freeShippingOver ? [`توصيل مجاني للطلبات فوق ${money(STORE.freeShippingOver)}`] : []),
  'الدفع نقداً عند الاستلام',
  ...liveOffers().map((o) => o.title),
];
(() => {
  const el = $('#announce span');
  let i = 0;
  el.textContent = ANNOUNCEMENTS[0];
  if (ANNOUNCEMENTS.length < 2) return;
  setInterval(() => {
    el.style.opacity = 0;
    setTimeout(() => { i = (i + 1) % ANNOUNCEMENTS.length; el.textContent = ANNOUNCEMENTS[i]; el.style.opacity = 1; }, 400);
  }, 4000);
})();

// ===== بطاقة منتج (مشتركة بين الصفحات) =====
function productCard(p) {
  const pr = priceOf(p);
  const deal = bxgyFor(p)[0];
  const out = !inStock(p);
  return `
  <article class="card">
    <a href="product.html?id=${p.id}" class="card__img">
      <img src="${IMG(p.images[0], 500)}" alt="${esc(p.name)}" loading="lazy">
      <div class="card__badges">
        ${p.isNew ? '<span class="badge badge--new">جديد</span>' : ''}
        ${pr.pct ? `<span class="badge badge--sale">خصم ${pr.pct}%</span>` : ''}
        ${deal ? `<span class="badge badge--deal">${deal.buy}+${deal.get} مجاناً</span>` : ''}
        ${out ? '<span class="badge badge--out">نفذت الكمية</span>' : ''}
      </div>
      <button class="icon-btn card__fav" aria-label="أضيفي للمفضلة" data-fav><svg class="ic"><use href="#i-heart"/></svg></button>
    </a>
    <div class="card__body">
      <a href="product.html?id=${p.id}" class="card__title">${esc(p.name)}</a>
      <div class="sizes">${sizesOf(p).map((s) => `<span class="${p.stock[s] ? '' : 'off'}">${s === 'one' ? 'مقاس واحد' : s}</span>`).join('')}</div>
      <div class="price ${pr.old ? 'price--sale' : ''}"><b>${money(pr.price)}</b>${pr.old ? `<s>${money(pr.old)}</s>` : ''}</div>
      <a href="product.html?id=${p.id}" class="btn btn--primary">${out ? 'شوفي التفاصيل' : 'اختاري المقاس'}</a>
    </div>
  </article>`;
}

// عدّاد تنازلي لعنصر فيه [data-u="d|h|m|s"]
function countdown(root, endsAt, onEnd) {
  const end = Date.parse(endsAt);
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
    for (const k in v) { const el = $(`[data-u="${k}"]`, root); if (el) el.textContent = String(v[k]).padStart(2, '0'); }
    if (!s) { clearInterval(timer); onEnd && onEnd(); }
  };
  const timer = setInterval(tick, 1000); tick();
}
