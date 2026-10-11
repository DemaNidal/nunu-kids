// صفحة تتبع الطلب: طلبات هالجهاز بتبين لحالها، ومن جهاز تاني برقم الطلب والجوال
import { STORE } from '../config.js';
import { $, esc, money, img, sizeLabel, addWorkDays, formatDay, piecesLabel } from '../utils.js';
import { myOrders, lookupOrder, hasSavedOrders } from '../store/tracking.js';
import { mountLayout } from '../ui/layout.js';
import { whatsappUrl } from '../ui/footer.js';
import { icon } from '../ui/icons.js';

mountLayout();

// الحالات بكلام الزبونة
const STEPS = [
  { key: 'new', title: 'استلمنا طلبك', text: 'رح نتواصل معك لتأكيده' },
  { key: 'confirmed', title: 'تأكد الطلب', text: 'عم نجهّزه ونغلّفه' },
  { key: 'shipped', title: 'مع المندوب', text: 'بالطريق إلك' },
  { key: 'delivered', title: 'وصلك', text: 'نتمنى يعجبك ♡' },
];
const NOW = {
  new: 'استلمنا طلبك وبنتواصل معك قريباً لتأكيده',
  confirmed: 'تأكد طلبك وعم نجهّزه',
  shipped: 'طلبك مع المندوب وبالطريق إلك',
  delivered: 'وصلك الطلب — ألف مبروك ♡',
  cancelled: 'انلغى هالطلب',
};

let orders = [];

const fmt = (iso, opts) => new Intl.DateTimeFormat('ar-u-nu-latn', opts).format(new Date(iso));
const dayTime = (iso) => fmt(iso, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });

function eta(o) {
  if (!['new', 'confirmed', 'shipped'].includes(o.status)) return '';
  const { min, max } = STORE.deliveryDays;
  const from = new Date(o.createdAt);
  return `متوقع يوصلك بين <b>${formatDay(addWorkDays(from, min))}</b> و<b>${formatDay(addWorkDays(from, max))}</b>`;
}

function stepsHTML(o) {
  if (o.status === 'cancelled') {
    return `<p class="tsteps-cancel">${icon('x', 'ic--sm')} انلغى هالطلب${o.history.at(-1) ? ` · ${dayTime(o.history.at(-1).at)}` : ''}</p>`;
  }
  const at = STEPS.findIndex((s) => s.key === o.status);
  return `<ol class="tsteps">${STEPS.map((s, i) => {
    const h = o.history.find((x) => x.status === s.key);
    return `
      <li class="${i < at ? 'done' : i === at ? 'now' : ''}">
        <span class="tsteps__dot">${i <= at ? icon('check') : ''}</span>
        <div><b>${s.title}</b><small>${h ? dayTime(h.at) : s.text}</small></div>
      </li>`;
  }).join('')}</ol>`;
}

const itemHTML = (i) => `
  <li class="titem">
    <span class="titem__img">${i.image ? `<img src="${img(i.image, 120)}" alt="" loading="lazy">` : ''}</span>
    <span class="titem__name"><b>${esc(i.name)}</b><small>${sizeLabel(i.size)}${i.color ? ` · ${esc(i.color)}` : ''} · × ${i.qty}</small></span>
    <span class="titem__price">${money(i.unit * i.qty)}</span>
  </li>`;

function orderHTML(o, open) {
  const count = o.items.reduce((s, i) => s + i.qty, 0);
  const help = STORE.whatsapp ? whatsappUrl(`مرحبا، بدي أسأل عن طلبي رقم ${o.id}`) : 'info.html#contact';
  return `
    <details class="torder torder--${o.status}" id="${o.id}"${open ? ' open' : ''}>
      <summary>
        <span class="torder__head">
          <b dir="ltr">${o.id}</b>
          <small>${fmt(o.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })} · ${piecesLabel(count)} · ${money(o.total)}</small>
        </span>
        <span class="torder__now">${NOW[o.status]}</span>
        <svg class="ic ic--sm torder__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </summary>
      <div class="torder__body">
        ${eta(o) ? `<p class="torder__eta">${icon('truck', 'ic--sm')} <span>${eta(o)}</span></p>` : ''}
        ${stepsHTML(o)}
        <ul class="titems">${o.items.map(itemHTML).join('')}</ul>
        <div class="tsum">
          <div><span>المجموع الفرعي</span><span>${money(o.subtotal)}</span></div>
          ${o.discounts.map((d) => `<div class="tsum__disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
          ${o.coupon?.amount ? `<div class="tsum__disc"><span>كوبون <bdi dir="ltr">${esc(o.coupon.code)}</bdi></span><span>− ${money(o.coupon.amount)}</span></div>` : ''}
          <div><span>التوصيل (${esc(o.customer.zone)})</span><span>${o.shipping ? money(o.shipping) : 'مجاني'}</span></div>
          <div class="tsum__total"><span>${o.status === 'delivered' ? 'دفعتي' : 'بتدفعي عند الاستلام'}</span><b>${money(o.total)}</b></div>
        </div>
        <p class="torder__to">${icon('pin', 'ic--sm')} ${esc(o.customer.name)} · ${esc([o.customer.area, o.customer.city].filter(Boolean).join('، '))} · <bdi dir="ltr">${esc(o.customer.phone)}</bdi></p>
        <a href="${help}" class="btn btn--ghost btn--sm torder__help"${STORE.whatsapp ? ' target="_blank" rel="noopener"' : ''}>${icon('wa', 'ic--sm')} سؤال عن هالطلب</a>
      </div>
    </details>`;
}

function render() {
  const wanted = decodeURIComponent(location.hash.slice(1));
  const has = orders.length > 0;
  $('#myOrders').innerHTML = has
    ? orders.map((o, i) => orderHTML(o, wanted ? o.id === wanted : i === 0)).join('')
    : '';
  $('#trackIntro').textContent = has
    ? 'هاي الطلبات اللي عملتيها من هالجهاز. اضغطي على أي طلب لتشوفي التفاصيل.'
    : 'ما في طلبات محفوظة على هالجهاز — اكتبي رقم الطلب والجوال تحت.';
  $('#findTitle').textContent = has ? 'طلبتي من جهاز تاني؟' : 'عندك رقم طلب؟';
  if (wanted) document.getElementById(wanted)?.scrollIntoView({ block: 'start' });
}

// ===== البحث برقم الطلب والجوال =====
$('#findForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const number = form.number.value.trim().toUpperCase().replace(/\s+/g, '');
  const phone = form.phone.value.trim();
  const err = $('#findErr');
  if (!/^NK-?\d{6}$/.test(number)) { err.textContent = 'رقم الطلب بيبلش بـ NK ووراه 6 أرقام (متل NK-100001)'; return form.number.focus(); }
  if (phone.replace(/[^\d]/g, '').length < 9) { err.textContent = 'اكتبي رقم الجوال اللي طلبتي فيه'; return form.phone.focus(); }
  err.textContent = '';
  const btn = form.querySelector('button');
  btn.disabled = true;
  try {
    const order = await lookupOrder(number, phone);
    orders = [order, ...orders.filter((o) => o.id !== order.id)];
    history.replaceState(null, '', `#${order.id}`);
    render();
    form.reset();
  } catch (er) {
    err.textContent = er.message;
  } finally {
    btn.disabled = false;
  }
});

// ===== التشغيل =====
if (hasSavedOrders()) {
  $('#myOrders').innerHTML = '<p class="track__loading">عم نجيب طلباتك…</p>';
  try { orders = await myOrders(); } catch (er) { $('#myOrders').innerHTML = `<p class="track__loading">${esc(er.message)}</p>`; }
}
render();
window.addEventListener('hashchange', render);
