// لوحة الأدمن: الطلبات — ملخص، فلترة حسب الحالة، بحث، وتفاصيل الطلب مع تغيير الحالة
import { $, esc, money, img, sizeLabel, piecesLabel, phoneDisplay } from '../utils.js';
import { findProduct } from '../store/catalog.js';
import { icon } from '../ui/icons.js';
import { listOrders, getOrder, updateOrder, STATUSES, FLOW } from './api.js';
import { mountAdmin, setNavCount, adminToast } from './layout.js';
import { printLabels } from './print-label.js';

mountAdmin('orders');

const state = { orders: [], status: 'all', q: '' };

// ===== تنسيق =====
const DAY = 24 * 3600 * 1000;
const time = (d) => new Intl.DateTimeFormat('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(d);
const dayMonth = (d) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long' }).format(d);

function when(iso) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d >= today) return `اليوم ${time(d)}`;
  if (d >= today - DAY) return `أمس ${time(d)}`;
  return `${dayMonth(d)} ${time(d)}`;
}

// تحت مراحل الطلب: الساعة بس إذا اليوم، وإلا اليوم والشهر
const shortWhen = (iso) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? time(d) : dayMonth(d);
};

const statusPill = (s) => `<span class="st st--${s}">${STATUSES[s].label}</span>`;
const itemsCount = (o) => o.items.reduce((s, i) => s + i.qty, 0);

// الرقم محفوظ أصلاً بصيغة واتساب (970... أو 972...)
const waPhone = (o) => o.customer.phone;

// ===== الملخص =====
function renderStats() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * DAY;
  const live = state.orders.filter((o) => o.status !== 'cancelled');
  const stats = [
    { label: 'طلبات جديدة', value: state.orders.filter((o) => o.status === 'new').length, hint: 'بستنوا تأكيدك', tone: 'new', filter: 'new' },
    { label: 'طلبات اليوم', value: state.orders.filter((o) => new Date(o.createdAt) >= today).length, hint: 'من الساعة 12 بالليل' },
    { label: 'مع المندوب', value: state.orders.filter((o) => o.status === 'shipped').length, hint: 'بالطريق للزبونة', filter: 'shipped' },
    { label: 'مبيعات آخر 7 أيام', value: money(live.filter((o) => new Date(o.createdAt) >= weekAgo).reduce((s, o) => s + o.total, 0)), hint: 'بدون الطلبات الملغية' },
  ];
  $('#stats').innerHTML = stats.map((s) => `
    <${s.filter ? `button type="button" data-filter="${s.filter}"` : 'div'} class="stat${s.tone ? ` stat--${s.tone}` : ''}">
      <small>${s.label}</small><b>${s.value}</b><span>${s.hint}</span>
    </${s.filter ? 'button' : 'div'}>`).join('');
  setNavCount('orders', stats[0].value);
}

// ===== الفلترة =====
function renderTabs() {
  const count = (s) => (s === 'all' ? state.orders.length : state.orders.filter((o) => o.status === s).length);
  const tabs = ['all', ...FLOW, 'cancelled'];
  $('#tabs').innerHTML = tabs.map((s) => `
    <button type="button" role="tab" data-filter="${s}" aria-selected="${state.status === s}">
      ${s === 'all' ? 'الكل' : STATUSES[s].label} <span>${count(s)}</span>
    </button>`).join('');
}

const normalize = (s) => String(s).toLowerCase().replace(/[\s-]/g, '');

function filtered() {
  const q = normalize(state.q);
  return state.orders.filter((o) => (state.status === 'all' || o.status === state.status)
    && (!q || [o.id, o.customer.name, o.customer.phone, o.customer.city].some((v) => normalize(v).includes(q))));
}

// ===== القائمة =====
const rowHTML = (o) => `
  <button type="button" class="orow" data-open="${o.id}">
    <span class="orow__id">${o.id}${o.sample ? '<em>تجريبي</em>' : ''}</span>
    <span class="orow__who"><b>${esc(o.customer.name)}</b><small>${esc(o.customer.city)} · ${esc(o.customer.zone)}</small></span>
    <span class="orow__items">${piecesLabel(itemsCount(o))}</span>
    <span class="orow__total">${money(o.total)}</span>
    <span class="orow__status">${statusPill(o.status)}</span>
    <span class="orow__when">${when(o.createdAt)}</span>
  </button>`;

function renderList() {
  const list = filtered();
  $('#orders').innerHTML = list.length
    ? `<div class="ohead" aria-hidden="true"><span>رقم الطلب</span><span>الزبونة</span><span>القطع</span><span>المبلغ</span><span>الحالة</span><span>الوقت</span></div>${list.map(rowHTML).join('')}`
    : `<div class="adm-empty">${state.q ? 'ما في طلبات بتطابق البحث' : 'ما في طلبات بهاي الحالة'}</div>`;
}

function renderPrintAll() {
  const n = state.orders.filter((o) => o.status === 'confirmed').length;
  const btn = $('#printConfirmed');
  btn.hidden = !n;
  btn.innerHTML = `${icon('printer', 'ic--sm')} طباعة ملصقات المؤكدة (${n})`;
}

function renderAll() {
  renderPrintAll();
  renderStats();
  renderTabs();
  renderList();
}

// ===== تفاصيل الطلب =====
function stepperHTML(o) {
  if (o.status === 'cancelled') return `<div class="steps steps--cancelled">${icon('x')} الطلب ملغي</div>`;
  const at = FLOW.indexOf(o.status);
  return `<ol class="steps">${FLOW.map((s, i) => {
    const h = o.history.find((x) => x.status === s);
    return `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"><span>${i <= at ? icon('check') : ''}</span><b>${STATUSES[s].label}</b>${h ? `<small>${shortWhen(h.at)}</small>` : ''}</li>`;
  }).join('')}</ol>`;
}

function itemHTML(i) {
  const p = findProduct(i.id);
  return `
    <li class="oitem">
      <span class="oitem__img">${p ? `<img src="${img(p.images[0], 120)}" alt="">` : ''}</span>
      <span class="oitem__name"><b>${esc(i.name)}</b><small>${sizeLabel(i.size)}${i.color ? ` · ${esc(i.color)}` : ''}</small></span>
      <span class="oitem__qty">× ${i.qty}</span>
      <span class="oitem__price">${money(i.unit * i.qty)}</span>
    </li>`;
}

function panelHTML(o) {
  const st = STATUSES[o.status];
  const canCancel = !['delivered', 'cancelled'].includes(o.status);
  const waText = encodeURIComponent(`مرحبا ${o.customer.name.split(' ')[0]}، معك نونو كيدز بخصوص طلبك رقم ${o.id}`);
  return `
    <header class="od__head">
      <div><h2>طلب ${o.id}</h2><small>${when(o.createdAt)}</small></div>
      ${statusPill(o.status)}
      <button type="button" class="icon-btn" data-close aria-label="إغلاق">${icon('x')}</button>
    </header>
    <div class="od__body">
      ${o.sample ? '<p class="od__sample">هاد طلب تجريبي للعرض بس — بيختفي لما نربط قاعدة البيانات.</p>' : ''}
      ${stepperHTML(o)}
      ${st.next || canCancel ? `
        <div class="od__actions">
          ${st.next ? `<button type="button" class="btn btn--primary" data-status="${st.next}">${icon('check', 'ic--sm')} ${st.action}</button>` : ''}
          ${canCancel ? '<button type="button" class="btn od__cancel" data-status="cancelled">إلغاء الطلب</button>' : ''}
        </div>` : ''}

      <button type="button" class="btn btn--sm od__print" data-print="${o.id}">${icon('printer', 'ic--sm')} طباعة ملصق الكيس</button>

      <section class="ocard">
        <h3>الزبونة</h3>
        <p class="ocard__name">${esc(o.customer.name)}</p>
        <p class="ocard__phone"><bdi dir="ltr">${esc(phoneDisplay(o.customer.phone))}</bdi>${o.customer.whatsappOk ? ' <span class="wa-tag">بدها تأكيد واتساب</span>' : ''}</p>
        <div class="ocard__btns">
          <a href="tel:+${esc(o.customer.phone)}" class="btn btn--sm btn--ghost">${icon('phone', 'ic--sm')} اتصال</a>
          <a href="https://wa.me/${waPhone(o)}?text=${waText}" target="_blank" rel="noopener" class="btn btn--sm btn--ghost">${icon('wa', 'ic--sm')} واتساب</a>
        </div>
        <h3>العنوان</h3>
        <p>${esc(o.customer.zone)} · ${esc(o.customer.city)}<br>${o.customer.area ? `${esc(o.customer.area)} — ` : ''}${esc(o.customer.address)}</p>
        ${o.customer.notes ? `<h3>ملاحظة الزبونة</h3><p class="ocard__note">${esc(o.customer.notes)}</p>` : ''}
      </section>

      <section class="ocard">
        <h3>القطع (${itemsCount(o)})</h3>
        <ul class="oitems">${o.items.map(itemHTML).join('')}</ul>
        <div class="osum">
          <div><span>المجموع الفرعي</span><span>${money(o.subtotal)}</span></div>
          ${o.discounts.map((d) => `<div class="osum__disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
          ${o.coupon?.amount ? `<div class="osum__disc"><span>كوبون <bdi dir="ltr">${esc(o.coupon.code)}</bdi></span><span>− ${money(o.coupon.amount)}</span></div>` : ''}
          <div><span>التوصيل (${esc(o.customer.zone)})</span><span>${o.shipping ? money(o.shipping) : 'مجاني'}</span></div>
          <div class="osum__total"><span>بتدفع عند الاستلام</span><b>${money(o.total)}</b></div>
        </div>
      </section>

      <section class="ocard">
        <h3><label for="adminNote">ملاحظة داخلية</label></h3>
        <textarea id="adminNote" rows="2" placeholder="بتبين إلك بس (مثلاً: اتصلت وما ردت، بتستلم بعد الساعة 5)">${esc(o.note)}</textarea>
      </section>
    </div>`;
}

async function openOrder(id) {
  const o = await getOrder(id);
  if (!o) return closeOrder();
  $('#od').innerHTML = panelHTML(o);
  $('#od').classList.add('open');
  $('#odScrim').classList.add('show');
  document.body.classList.add('adm-lock');
  if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  $('#od [data-close]').focus({ preventScroll: true });
}

function closeOrder() {
  $('#od').classList.remove('open');
  $('#odScrim').classList.remove('show');
  document.body.classList.remove('adm-lock');
  if (location.hash) history.pushState(null, '', location.pathname);
}

async function changeStatus(id, status) {
  if (status === 'cancelled' && !confirm(`أكيد بدك تلغي الطلب ${id}؟`)) return;
  await updateOrder(id, { status });
  state.orders = await listOrders();
  renderAll();
  openOrder(id);
  adminToast(`صار الطلب: ${STATUSES[status].label}`);
}

// ===== الأحداث =====
document.addEventListener('click', (e) => {
  const filter = e.target.closest('[data-filter]');
  if (filter) {
    state.status = filter.dataset.filter;
    renderTabs();
    renderList();
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) return openOrder(open.dataset.open);
  if (e.target.closest('[data-close]') || e.target.id === 'odScrim') return closeOrder();
  const print = e.target.closest('[data-print]');
  if (print) return getOrder(print.dataset.print).then((o) => printLabels([o]));
  if (e.target.closest('#printConfirmed')) return printLabels(state.orders.filter((o) => o.status === 'confirmed'));
  const status = e.target.closest('[data-status]');
  if (status) {
    const id = location.hash.slice(1);
    changeStatus(id, status.dataset.status);
  }
});

// الملاحظة الداخلية بتنحفظ لما تطلعي من الخانة
document.addEventListener('change', async (e) => {
  if (e.target.id !== 'adminNote') return;
  await updateOrder(location.hash.slice(1), { note: e.target.value.trim() });
  adminToast('انحفظت الملاحظة');
});

$('#search').addEventListener('input', (e) => {
  state.q = e.target.value;
  renderList();
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#od').classList.contains('open')) closeOrder(); });
window.addEventListener('popstate', () => (location.hash ? openOrder(location.hash.slice(1)) : closeOrder()));

// ===== التشغيل =====
$('#today').textContent = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
state.orders = await listOrders();
renderAll();
if (location.hash) openOrder(location.hash.slice(1));
