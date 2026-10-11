// لوحة الأدمن: قائمة المنتجات — فلترة حسب القسم، بحث، وتنبيه المخزون القليل
import { $, esc, money, img, sizeLabel } from '../utils.js';
import { CATEGORIES } from '../config.js';
import { listProducts } from './api.js';
import { mountAdmin } from './layout.js';

mountAdmin('products');

const LOW = 2; // مقاس باقي منه هالعدد أو أقل = قرّب يخلص
const state = { products: [], cat: 'all', flag: '', q: '' };

const totalStock = (p) => Object.values(p.stock).reduce((s, n) => s + n, 0);
const isLow = (p) => Object.values(p.stock).some((n) => n <= LOW);
const FLAGS = {
  low: { label: 'قرّب يخلص', test: isLow },
  hidden: { label: 'مخفي من المتجر', test: (p) => p.visible === false },
  isNew: { label: 'وصل حديثاً', test: (p) => p.isNew },
};

function renderTabs() {
  const count = (c) => state.products.filter((p) => c === 'all' || p.category === c).length;
  $('#tabs').innerHTML = [['all', 'الكل'], ...Object.entries(CATEGORIES)].map(([k, label]) => `
    <button type="button" role="tab" data-cat="${k}" aria-selected="${state.cat === k}">${label} <span>${count(k)}</span></button>`).join('');
  $('#chips').innerHTML = Object.entries(FLAGS).map(([k, f]) => `
    <button type="button" class="chip" data-flag="${k}" aria-pressed="${state.flag === k}">${f.label} <span>${state.products.filter(f.test).length}</span></button>`).join('');
}

function filtered() {
  const q = state.q.trim();
  return state.products.filter((p) => (state.cat === 'all' || p.category === state.cat)
    && (!state.flag || FLAGS[state.flag].test(p))
    && (!q || p.name.includes(q)));
}

const stockChips = (p) => Object.entries(p.stock).map(([s, n]) => `
  <span class="sz${n === 0 ? ' sz--out' : n <= LOW ? ' sz--low' : ''}" title="${sizeLabel(s)}">${s === 'one' ? 'مقاس واحد' : s}: <b>${n}</b></span>`).join('');

const rowHTML = (p) => `
  <a href="product-edit.html?id=${p.id}" class="prow${p.visible === false ? ' is-hidden' : ''}">
    <span class="prow__img">${p.images[0] ? `<img src="${img(p.images[0], 120)}" alt="" loading="lazy">` : ''}</span>
    <span class="prow__name">
      <b>${esc(p.name)}</b>
      <small>${CATEGORIES[p.category] || ''}${p.isNew ? ' · <em>جديد</em>' : ''}${p.visible === false ? ' · <em class="off">مخفي</em>' : ''}</small>
    </span>
    <span class="prow__price">${money(p.price)}</span>
    <span class="prow__stock">${stockChips(p)}</span>
    <span class="prow__total">${totalStock(p)} <small>بالمخزن</small></span>
  </a>`;

function renderList() {
  const list = filtered();
  $('#products').innerHTML = list.length
    ? list.map(rowHTML).join('')
    : `<div class="adm-empty">${state.q ? 'ما في منتج بهاد الاسم' : 'ما في منتجات هون'}</div>`;
}

function renderSummary() {
  const low = state.products.filter(isLow).length;
  $('#summary').textContent = `${state.products.length} منتج${low ? ` · ${low} قرّبوا يخلصوا` : ''}`;
}

document.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (cat) { state.cat = cat.dataset.cat; renderTabs(); renderList(); return; }
  const flag = e.target.closest('[data-flag]');
  if (flag) { state.flag = state.flag === flag.dataset.flag ? '' : flag.dataset.flag; renderTabs(); renderList(); }
});
$('#search').addEventListener('input', (e) => { state.q = e.target.value; renderList(); });

state.products = await listProducts();
renderSummary();
renderTabs();
renderList();
