// صفحة إتمام الطلب — الدفع عند الاستلام
import { STORE } from '../config.js';
import { $, $$, esc, money, img, sizeLabel, storage, exchangeText, piecesLabel } from '../utils.js';
import { stockOf } from '../store/catalog.js';
import { cart } from '../store/cart.js';
import { createOrder } from '../store/orders.js';
import { mountLayout } from '../ui/layout.js';
import { cartSuggestions } from '../ui/cart-drawer.js';
import { whatsappUrl } from '../ui/footer.js';
import { icon } from '../ui/icons.js';
import { qtyControl, toast } from '../ui/components.js';

mountLayout();

const form = $('#coForm');
const CUSTOMER_KEY = 'nunu_customer'; // بنتذكر معلومات الزبونة للطلب الجاي
const FIELDS = ['name', 'phone', 'city', 'address'];
let zoneId = null;

const CHECKOUT_TITLES = {
  needMore: (gap) => `ضايلك ${money(gap)} على التوصيل المجاني، بتحبي تضيفي؟`,
  done: 'ناس كتير بتضيف معه',
};

const currentZone = () => STORE.shippingZones.find((z) => z.id === zoneId);

// null = لسا ما اختارت منطقة
function shippingFee(total) {
  const zone = currentZone();
  if (!zone) return null;
  return STORE.freeShippingOver && total >= STORE.freeShippingOver ? 0 : zone.fee;
}

// ===== النموذج =====
function renderZones() {
  $('#zones').innerHTML = STORE.shippingZones.map((z) => `
    <label class="zone">
      <input type="radio" name="zone" value="${z.id}">
      <span class="zone__name">${esc(z.name)}</span>
      <span class="zone__meta">${money(z.fee)} · ${esc(z.days)}</span>
    </label>`).join('');
}

function selectZone(id) {
  zoneId = id;
  $('#zoneErr').textContent = '';
  saveCustomer();
  renderSummary();
}

function restoreCustomer() {
  const saved = storage.get(CUSTOMER_KEY, {});
  FIELDS.forEach((k) => { if (saved[k]) form.elements[k].value = saved[k]; });
  const radio = saved.zone && $(`input[name="zone"][value="${saved.zone}"]`);
  if (radio) { radio.checked = true; zoneId = saved.zone; }
}

function saveCustomer() {
  const data = { zone: zoneId };
  FIELDS.forEach((k) => { data[k] = form.elements[k].value.trim(); });
  storage.set(CUSTOMER_KEY, data);
}

// ===== التحقق =====
const normalizePhone = (v) => v.replace(/[\s\-()]/g, '').replace(/^\+?(970|972)/, '0');

const RULES = {
  name: (v) => (v.trim().length < 3 ? 'اكتبي الاسم الكامل' : ''),
  phone: (v) => (/^05\d{8}$/.test(normalizePhone(v)) ? '' : 'الرقم لازم يكون 10 أرقام ويبلش بـ 05'),
  city: (v) => (v.trim().length < 2 ? 'اكتبي المدينة أو القرية' : ''),
  address: (v) => (v.trim().length < 4 ? 'اكتبي العنوان بالتفصيل عشان يوصلك المندوب' : ''),
};

function setFieldError(input, message) {
  const field = input.closest('.field');
  field.classList.toggle('has-err', !!message);
  $('.field__err', field).textContent = message;
}

// بيرجع أول حقل فيه غلط (أو null)
function validate() {
  let first = null;
  for (const [name, rule] of Object.entries(RULES)) {
    const input = form.elements[name];
    const message = rule(input.value);
    setFieldError(input, message);
    if (message && !first) first = input;
  }
  if (!zoneId) {
    $('#zoneErr').textContent = 'اختاري منطقة التوصيل';
    first ||= $('#zones input');
  }
  return first;
}

// ===== الملخص =====
const summaryLine = (r, i) => `
  <div class="sum-line">
    <div class="sum-line__img"><img src="${img(r.product.images[0], 120)}" alt=""><span>${r.qty}</span></div>
    <div class="sum-line__info">
      <b>${esc(r.product.name)}</b>
      <small>${sizeLabel(r.size)}${r.color ? ` · ${esc(r.color)}` : ''}</small>
      ${qtyControl(r.qty, { plus: `data-cart-qty="${i}" data-d="1"`, minus: `data-cart-qty="${i}" data-d="-1"`, cls: 'qty--sm' })}
    </div>
    <span class="sum-line__price">${money(r.unit * r.qty)}</span>
  </div>`;

function feeText(fee) {
  if (fee === null) return '<em>اختاري المنطقة</em>';
  return fee === 0 ? '<b class="free">مجاني</b>' : money(fee);
}

function renderSummary() {
  const t = cart.totals();
  if (!t.rows.length) return renderEmpty();
  const fee = shippingFee(t.total);
  const grand = t.total + (fee || 0);
  const zone = currentZone();

  $('#summary').innerHTML = `
    <div class="co-card">
      <h2>ملخص الطلب <small>(${piecesLabel(t.count)})</small></h2>
      <div class="sum-lines">${t.rows.map(summaryLine).join('')}</div>
      ${cartSuggestions(t.total, { titles: CHECKOUT_TITLES })}
      <div class="sum-rows">
        <div><span>المجموع الفرعي</span><span>${money(t.subtotal)}</span></div>
        ${t.discounts.map((d) => `<div class="sum-disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
        <div><span>التوصيل</span><span>${feeText(fee)}</span></div>
        <div class="sum-total"><span>المجموع الكلي</span><b>${money(grand)}</b></div>
      </div>
      <button type="submit" form="coForm" class="btn btn--primary btn--block co-submit">تأكيد الطلب · ${money(grand)}</button>
      <p class="co-note">${icon('cash', 'ic--sm')} بتدفعي ${money(grand)} نقداً لما يوصلك الطلب</p>
      <ul class="co-trust">
        <li>${icon('swap', 'ic--sm')} ${exchangeText()}</li>
        <li>${icon('truck', 'ic--sm')} ${zone ? `التوصيل خلال ${esc(zone.days)}` : 'توصيل لكل المناطق'}</li>
      </ul>
    </div>`;

  $('#coBar').innerHTML = `
    <div><small>المجموع</small><b>${money(grand)}</b></div>
    <button type="submit" form="coForm" class="btn btn--primary">تأكيد الطلب</button>`;
}

function renderEmpty() {
  $('#checkout').innerHTML = `
    <div class="co-empty">
      <h1>سلتك فاضية</h1>
      <p>ضيفي قطع للسلة وبعدين ارجعي لهون.</p>
      <a href="index.html" class="btn btn--primary">ابدئي التسوق</a>
    </div>`;
  $('#coBar')?.remove();
}

function renderSuccess(order) {
  window.scrollTo({ top: 0 });
  $('#coBar')?.remove();
  const firstName = order.customer.name.split(' ')[0];
  const rows = [
    ...order.items.map((i) => [`${esc(i.name)} <small>${sizeLabel(i.size)} × ${i.qty}</small>`, money(i.unit * i.qty), '']),
    ...order.discounts.map((d) => [esc(d.title), `− ${money(d.amount)}`, 'sum-disc']),
    [`التوصيل (${esc(order.customer.zone)})`, order.shipping ? money(order.shipping) : 'مجاني', ''],
  ];
  $('#checkout').innerHTML = `
    <div class="co-done">
      <div class="co-done__icon">${icon('check')}</div>
      <h1>شكراً ${esc(firstName)}! وصلنا طلبك</h1>
      <p>رقم الطلب: <b class="order-no">${order.id}</b></p>
      <p class="co-done__sub">رح نتصل فيكِ على <bdi dir="ltr">${esc(order.customer.phone)}</bdi> خلال 24 ساعة لتأكيد الطلب.</p>
      <div class="co-card co-done__card">
        ${rows.map(([label, value, cls]) => `<div class="done-row ${cls}"><span>${label}</span><span>${value}</span></div>`).join('')}
        <div class="done-row sum-total"><span>بتدفعي عند الاستلام</span><b>${money(order.total)}</b></div>
      </div>
      <div class="co-done__cta">
        <a href="track.html?order=${order.id}" class="btn btn--primary">تتبعي طلبك</a>
        ${STORE.whatsapp ? `<a href="${whatsappUrl(`مرحبا، بدي أأكد طلبي رقم ${order.id}`)}" class="btn btn--ghost" target="_blank" rel="noopener">أكدي عبر واتساب</a>` : ''}
        <a href="index.html" class="btn btn--ghost">كمّلي التسوق</a>
      </div>
    </div>`;
}

// ===== إرسال الطلب =====
function submit(e) {
  e.preventDefault();
  const invalid = validate();
  if (invalid) {
    invalid.focus();
    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const totals = cart.totals();
  const short = totals.rows.find((r) => stockOf(r.product, r.size) < r.qty);
  if (short) return toast(`ما في كمية كافية من ${short.product.name} (${sizeLabel(short.size)})`);

  const order = createOrder({
    totals,
    shipping: shippingFee(totals.total) || 0,
    customer: {
      name: form.elements.name.value.trim(),
      phone: normalizePhone(form.elements.phone.value),
      zone: currentZone().name,
      city: form.elements.city.value.trim(),
      address: form.elements.address.value.trim(),
      notes: form.elements.notes.value.trim(),
    },
  });
  unsubscribe();
  cart.clear();
  renderSuccess(order);
}

// ===== التشغيل =====
renderZones();
restoreCustomer();
$$('input[name="zone"]').forEach((r) => r.addEventListener('change', () => selectZone(r.value)));
form.addEventListener('input', (e) => {
  if (e.target.name in RULES) setFieldError(e.target, '');
  saveCustomer();
});
form.addEventListener('submit', submit);
const unsubscribe = cart.subscribe(renderSummary);
renderSummary();
