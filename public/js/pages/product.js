// صفحة المنتج (ونفس الصفحة للبكج)
import { CATEGORIES } from '../config.js';
import { $, $$, esc, img, ltr, money, sizeLabel, queryParam } from '../utils.js';
import { SIZE_GUIDE } from '../data/content.js';
import { findProduct, isBundle, sizesOf, stockOf, inStock, bundles } from '../store/catalog.js';
import { priceOf, bxgyFor } from '../store/pricing.js';
import { cart } from '../store/cart.js';
import { behavior } from '../store/behavior.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { openDrawer } from '../ui/cart-drawer.js';
import { icon } from '../ui/icons.js';
import { badges, favButton, priceTag, productGrid, productUrl, qtyControl, countdownHTML, startCountdown, toast } from '../ui/components.js';

mountLayout();

const product = findProduct(queryParam('id'));
const state = { size: null, color: null, qty: 1 };

// ===== أجزاء الصفحة =====
const crumbsHTML = (p) => `
  <a href="index.html">الرئيسية</a><span>/</span>
  <a href="index.html#${isBundle(p) ? 'bundles' : 'types'}">${CATEGORIES[p.category]}</a><span>/</span>
  <b>${esc(p.name)}</b>`;

const galleryHTML = (p) => `
  <div class="gallery">
    <div class="gallery__main" id="gMain">
      ${p.images.map((id, i) => `<img src="${img(id, 900)}" alt="${esc(p.name)} صورة ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('')}
    </div>
    ${p.images.length > 1 ? `
      <div class="gallery__thumbs">
        ${p.images.map((id, i) => `<button type="button" data-img="${i}" class="${i ? '' : 'on'}" aria-label="صورة ${i + 1}"><img src="${img(id, 160)}" alt=""></button>`).join('')}
      </div>` : ''}
    ${badges(p)}
  </div>`;

function offersHTML(p) {
  const { offer } = priceOf(p);
  const timer = offer?.endsAt ? `
    <div class="offer-box" id="offerTimer">
      <span>العرض بينتهي خلال</span>
      ${countdownHTML('countdown--mini')}
    </div>` : '';
  const deals = bxgyFor(p).map((o) => `
    <div class="offer-box offer-box--deal">
      ${icon('gift')}
      <div><b>${esc(o.title)}</b><small>العرض بيتطبق تلقائياً بالسلة</small></div>
    </div>`).join('');
  return timer + deals;
}

const contentsHTML = (p) => !isBundle(p) ? '' : `
  <div class="contents">
    <h3>شو بيحتوي البكج؟</h3>
    <ul class="hearts">${p.contents.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  </div>`;

const colorsHTML = (p) => !p.colors?.length ? '' : `
  <div class="opt">
    <div class="opt__head"><span>اللون: <b id="colorName">${esc(state.color)}</b></span></div>
    <div class="swatches">
      ${p.colors.map((c) => `<button type="button" class="swatch ${c.name === state.color ? 'on' : ''}" data-color="${esc(c.name)}" style="--c:${c.hex}" aria-label="${esc(c.name)}"></button>`).join('')}
    </div>
  </div>`;

const sizesHTML = (p) => `
  <div class="opt">
    <div class="opt__head">
      <span>المقاس (عمر البيبي)</span>
      <button type="button" class="link-btn" id="openGuide">دليل المقاسات</button>
    </div>
    <div class="size-btns" id="sizeBtns">
      ${sizesOf(p).map((s) => `<button type="button" data-size="${s}" class="${state.size === s ? 'on' : ''}" ${stockOf(p, s) ? '' : 'disabled'}>${sizeLabel(s)}</button>`).join('')}
    </div>
    <p class="opt__msg" id="sizeMsg" aria-live="polite"></p>
  </div>`;

const addLabel = (p) => (inStock(p) ? 'أضيفي للسلة' : 'نفذت الكمية');

const buyHTML = (p) => `
  <div class="buy">
    ${qtyControl(1, { plus: 'data-qty="1"', minus: 'data-qty="-1"', cls: 'qty--lg' })}
    <button type="button" class="btn btn--primary" data-add-to-cart ${inStock(p) ? '' : 'disabled'}>${addLabel(p)}</button>
    ${favButton(p, 'fav-btn--box')}
  </div>`;

const PERKS = [
  ['cash', 'الدفع نقداً عند الاستلام'],
  ['truck', 'التوصيل خلال 2–4 أيام عمل'],
  ['swap', 'تبديل المقاس خلال 7 أيام'],
];

const detailsHTML = (p) => `
  <ul class="perks">${PERKS.map(([i, t]) => `<li>${icon(i)} ${t}</li>`).join('')}</ul>
  <div class="acc">
    <details open><summary>الوصف</summary><p>${esc(p.description)}</p></details>
    ${p.material ? `<details><summary>الخامة والعناية</summary><p>${esc(p.material)}</p></details>` : ''}
    <details><summary>التوصيل والتبديل</summary><p>بنوصل لكل المناطق والدفع عند الاستلام. إذا المقاس ما زبط، بتقدري تبدليه خلال 7 أيام بشرط تكون القطعة بحالتها الأصلية وعليها التيكيت.</p></details>
  </div>`;

const buyBarHTML = (p) => `
  ${priceTag(p, { cls: 'buybar__price' })}
  <button type="button" class="btn btn--primary" data-add-to-cart ${inStock(p) ? '' : 'disabled'}>${addLabel(p)}</button>`;

const sizeGuideRows = () => SIZE_GUIDE.map((r) =>
  `<tr><td>${sizeLabel(r.size)}</td><td>${ltr(r.weight)} كغ</td><td>${ltr(r.height)} سم</td></tr>`).join('');

// ===== التفاعل =====
function setMessage(text, kind = '') {
  const el = $('#sizeMsg');
  el.textContent = text;
  el.className = `opt__msg ${kind ? `opt__msg--${kind}` : ''}`;
}

function showStock() {
  if (!state.size) return setMessage('');
  const n = stockOf(product, state.size);
  if (n <= 3) setMessage(`باقي ${n} ${n === 1 ? 'قطعة' : 'قطع'} بس من هاد المقاس`, 'low');
  else setMessage('متوفر', 'ok');
}

function setQty(n) {
  const max = state.size ? stockOf(product, state.size) : 10;
  state.qty = Math.max(1, Math.min(n, max));
  $('.buy .qty span').textContent = state.qty;
}

function selectSize(size) {
  state.size = size;
  behavior.choseSize(size);
  $$('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === size));
  $('#sizeBtns').classList.remove('error');
  setQty(state.qty);
  showStock();
}

function selectColor(name) {
  state.color = name;
  $$('[data-color]').forEach((b) => b.classList.toggle('on', b.dataset.color === name));
  $('#colorName').textContent = name;
}

function addToCart() {
  if (!state.size) {
    $('#sizeBtns').classList.add('error');
    $('#sizeBtns').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return setMessage('اختاري المقاس أول', 'err');
  }
  const stock = stockOf(product, state.size);
  const inCart = cart.qtyOf(product.id, state.size);
  if (inCart + state.qty > stock) {
    return setMessage(`ما في أكثر من ${stock} قطع من هاد المقاس، وعندك ${inCart} بالسلة`, 'err');
  }
  cart.add(product.id, state.size, state.color || '', state.qty);
  toast('انضافت للسلة');
  openDrawer(true);
}

function initGallery() {
  const main = $('#gMain');
  const thumbs = $$('.gallery__thumbs button');
  const mark = (i) => thumbs.forEach((b, j) => b.classList.toggle('on', j === i));
  thumbs.forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.img);
    main.scrollTo({ left: -i * main.clientWidth, behavior: 'smooth' }); // RTL: الاتجاه سالب
    mark(i);
  }));
  main.addEventListener('scroll', () => mark(Math.round(Math.abs(main.scrollLeft) / main.clientWidth)), { passive: true });
}

function bindEvents() {
  initGallery();
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-size], [data-color], [data-qty], [data-add-to-cart]');
    if (!t || t.disabled) return;
    if (t.dataset.size) selectSize(t.dataset.size);
    else if (t.dataset.color) selectColor(t.dataset.color);
    else if (t.dataset.qty) setQty(state.qty + Number(t.dataset.qty));
    else addToCart();
  });

  const guide = $('#sizeGuide');
  $('#openGuide').addEventListener('click', () => guide.showModal());
  guide.addEventListener('click', (e) => {
    if (e.target === guide || e.target.closest('[data-close]')) guide.close();
  });
}

// ===== المقترحات =====
function renderExtras(p) {
  $('#relatedGrid').innerHTML = productGrid(recommend({ exclude: [p.id], similarTo: p, cart: cart.lines }));

  const recent = behavior.recentlyViewed([p.id]).slice(0, 4);
  if (recent.length >= 2) {
    $('#recent').hidden = false;
    $('#recentGrid').innerHTML = productGrid(recent);
  }

  if (isBundle(p)) return;
  const b = bundles().find((x) => x.featured) || bundles()[0];
  const { price, old } = priceOf(b);
  $('#upsell').hidden = false;
  $('#upsell').innerHTML = `
    <div class="container">
      <a href="${productUrl(b)}" class="upsell">
        <img src="${img(b.images[0], 500, 360)}" alt="${esc(b.name)}" loading="lazy">
        <div>
          <span class="pill pill--sale">وفّري أكثر</span>
          <h3>بتجهزي للبيبي؟ جربي ${esc(b.name)}</h3>
          <p>${b.count} قطعة بطلب واحد${old ? `، ووفّري ${money(old - price)}` : ''}</p>
          ${priceTag(b)}
        </div>
      </a>
    </div>`;
}

// ===== التشغيل =====
function render(p) {
  const sizes = sizesOf(p);
  if (sizes.length === 1 && stockOf(p, sizes[0])) state.size = sizes[0];
  state.color = p.colors?.[0]?.name || null;

  document.title = `${p.name} | NUNU KIDS`;
  $('#crumbs').innerHTML = crumbsHTML(p);
  $('#pdp').innerHTML = `
    ${galleryHTML(p)}
    <div class="info">
      <h1>${esc(p.name)}</h1>
      ${isBundle(p) ? `<p class="info__sub">${p.count} قطعة، مغلفة ومرتبة كهدية</p>` : ''}
      ${priceTag(p, { save: true, cls: 'price--xl' })}
      ${offersHTML(p)}
      ${contentsHTML(p)}
      ${colorsHTML(p)}
      ${sizesHTML(p)}
      ${buyHTML(p)}
      ${detailsHTML(p)}
    </div>`;
  $('#buybar').innerHTML = buyBarHTML(p);
  $('#sizeGuideBody').innerHTML = sizeGuideRows();

  const { offer } = priceOf(p);
  if (offer?.endsAt) startCountdown($('#offerTimer .countdown'), offer.endsAt, () => location.reload());
  bindEvents();
  showStock();
  renderExtras(p);
  behavior.viewed(p);
}

function renderNotFound() {
  $('#pdp').innerHTML = `
    <div class="notfound">
      <h1>المنتج مش موجود</h1>
      <p>يمكن انحذف أو الرابط غلط.</p>
      <a href="index.html" class="btn btn--primary">ارجعي للرئيسية</a>
    </div>`;
  $('#related').hidden = true;
  $('#buybar').remove();
}

if (product) render(product);
else renderNotFound();
