// صفحة إتمام الطلب — الدفع عند الاستلام
import { STORE } from '../config.js';
import { $, $$, esc, money, img, sizeLabel, storage, exchangeText, piecesLabel, phoneDisplay, copyText } from '../utils.js';
import { stockOf } from '../store/catalog.js';
import { cart } from '../store/cart.js';
import { placeOrder } from '../store/orders.js';
import { checkCoupon, recheckCoupon, couponDiscount, couponLabel, normalizeCode } from '../store/coupons.js';
import { mountLayout } from '../ui/layout.js';
import { cartSuggestions } from '../ui/cart-drawer.js';
import { whatsappUrl } from '../ui/footer.js';
import { icon } from '../ui/icons.js';
import { qtyControl, toast } from '../ui/components.js';

mountLayout();

const form = $('#coForm');
const CUSTOMER_KEY = 'nunu_customer'; // بنتذكر معلومات الزبونة للطلب الجاي
const FIELDS = ['firstName', 'lastName', 'phone', 'prefix', 'area', 'address', 'city'];
let zoneId = null;
let submitting = false; // عشان ضغطتين ورا بعض ما يعملوا طلبين
const coupon = { applied: null, msg: '', open: false }; // الكوبون المطبّق ورسالة الخطأ
let summaryOpen = false; // ملخص الطلب على الجوال مسكّر بالبداية

const CHECKOUT_TITLES = {
  needMore: (gap) => `ضايلك ${money(gap)} على التوصيل المجاني، بتحبي تضيفي؟`,
  done: 'ناس كتير بتضيف معه',
};

const currentZone = () => STORE.shippingZones.find((z) => z.id === zoneId);

// null = لسا ما اختارت منطقة
function shippingFee(total) {
  const zone = currentZone();
  if (!zone) return null;
  if (couponDiscount(coupon.applied, total).freeShipping) return 0;
  return STORE.freeShippingOver && total >= STORE.freeShippingOver ? 0 : zone.fee;
}

// ===== النموذج =====
function renderZones() {
  $('#zones').innerHTML = STORE.shippingZones.map((z) => `
    <label class="zone">
      <input type="radio" name="zone" value="${z.id}">
      <span class="zone__dot" aria-hidden="true"></span>
      <span class="zone__name">${esc(z.name)}<small>${esc(z.days)}</small></span>
      <span class="zone__fee">${money(z.fee)}</span>
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
  // معلومات محفوظة من قبل (لما كان الاسم بخانة وحدة)
  if (saved.name && !saved.firstName) {
    const [first, ...rest] = saved.name.split(' ');
    saved.firstName = first;
    saved.lastName = rest.join(' ');
  }
  FIELDS.forEach((k) => { if (saved[k]) form.elements[k].value = saved[k]; });
  if (saved.prefix) prefixPicked = true;
  if (saved.whatsappOk === false) form.elements.whatsappOk.checked = false;
  // آخر منطقة اختارتها، وإلا أول منطقة بالقائمة (الترتيب من إعدادات المتجر)
  const radio = (saved.zone && $(`input[name="zone"][value="${saved.zone}"]`)) || $('input[name="zone"]');
  if (radio) { radio.checked = true; zoneId = radio.value; }
}

function saveCustomer() {
  const data = { zone: zoneId };
  FIELDS.forEach((k) => { data[k] = form.elements[k].value.trim(); });
  data.whatsappOk = form.elements.whatsappOk.checked;
  storage.set(CUSTOMER_KEY, data);
}

// ===== التحقق =====
// الرقم المحلي بدون المقدمة: "059 912 3456" ← "599123456"
const localDigits = (v) => v.replace(/[^\d]/g, '').replace(/^00/, '').replace(/^(970|972)/, '').replace(/^0/, '');

// المقدمة حسب أول رقمين: جوال وأوريدو 970، الأرقام الإسرائيلية 972 (إلا إذا الزبونة اختارت بإيدها)
let prefixPicked = false;
const PREFIX_BY_START = { 59: '970', 56: '970', 50: '972', 52: '972', 53: '972', 54: '972', 55: '972', 58: '972' };

function guessPrefix() {
  const raw = form.elements.phone.value.replace(/[^\d+]/g, '');
  const typed = /^\+?(970|972)/.exec(raw.replace(/^00/, '+'));
  if (typed) { // لصقت الرقم مع المقدمة: المقدمة بتنحط بالقائمة، والرقم بيضل محلي
    form.elements.prefix.value = typed[1];
    form.elements.phone.value = `0${localDigits(raw)}`;
    prefixPicked = true;
    return;
  }
  if (prefixPicked) return;
  const guess = PREFIX_BY_START[localDigits(raw).slice(0, 2)];
  if (guess) form.elements.prefix.value = guess;
}

// الرقم الكامل متل واتساب: 970599123456
const fullPhone = () => form.elements.prefix.value + localDigits(form.elements.phone.value);

// حروف عربية ومسافات بس (بدون أرقام أو حروف إنجليزية)
const isArabicName = (v) => /^[\u0621-\u064A\u0671-\u06D3\s]+$/.test(v.trim());
const nameRule = (label) => (v) => {
  if (v.trim().length < 2) return `اكتبي ${label}`;
  return isArabicName(v) ? '' : `اكتبي ${label} بالعربي`;
};

const RULES = {
  firstName: nameRule('الاسم الأول'),
  lastName: nameRule('اسم العائلة'),
  phone: (v) => (/^5\d{8}$/.test(localDigits(v)) ? '' : 'اكتبي رقم جوال صحيح (متل 0599 123 456)'),
  area: (v) => (v.trim().length < 2 ? 'اكتبي القرية أو المخيم أو المنطقة' : ''),
  address: (v) => (v.trim().length < 4 ? 'اكتبي العنوان بالتفصيل عشان يوصلك المندوب' : ''),
  city: (v) => (v.trim().length < 2 ? 'اكتبي المدينة' : ''),
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
  // الكوبون بيتأكد من جديد كل ما تتغير السلة (مثلاً نزل المجموع تحت الحد)
  if (coupon.applied) {
    const error = recheckCoupon(coupon.applied, t.total);
    if (error) { coupon.applied = null; coupon.msg = error; coupon.open = true; }
  }
  const { amount: couponAmount } = couponDiscount(coupon.applied, t.total);
  const fee = shippingFee(t.total);
  const grand = t.total - couponAmount + (fee || 0);
  const zone = currentZone();

  $('#summary').classList.toggle('open', summaryOpen);
  $('#summary').innerHTML = `
    <button type="button" class="sum-toggle" data-sum-toggle aria-expanded="${summaryOpen}" aria-controls="sumBody">
      <span>ملخص الطلب <small>(${piecesLabel(t.count)})</small> <svg class="ic ic--sm sum-toggle__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>
      <b>${money(grand)}</b>
    </button>
    <div class="co-card sum-body" id="sumBody">
      <h2>ملخص الطلب <small>(${piecesLabel(t.count)})</small></h2>
      <div class="sum-lines">${t.rows.map(summaryLine).join('')}</div>
      ${cartSuggestions(t.total, { titles: CHECKOUT_TITLES })}
      ${couponHTML()}
      <div class="sum-rows">
        <div><span>المجموع الفرعي</span><span>${money(t.subtotal)}</span></div>
        ${t.discounts.map((d) => `<div class="sum-disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
        ${couponAmount ? `<div class="sum-disc"><span>كوبون <bdi dir="ltr">${esc(coupon.applied.code)}</bdi></span><span>− ${money(couponAmount)}</span></div>` : ''}
        <div><span>التوصيل</span><span>${coupon.applied?.type === 'shipping' && fee === 0 ? '<b class="free">مجاني (كوبون)</b>' : feeText(fee)}</span></div>
        <div class="sum-total"><span>المجموع الكلي</span><b>${money(grand)}</b></div>
      </div>
      <button type="submit" form="coForm" class="btn btn--primary btn--block co-submit">تأكيد الطلب · ${money(grand)}</button>
      <p class="co-note">${icon('cash', 'ic--sm')} بتدفعي ${money(grand)} نقداً لما يوصلك الطلب</p>
      <p class="co-privacy">بتأكيد الطلب، معلوماتك بتنستعمل بس لتوصيل الطلب. <a href="info.html#privacy" target="_blank">سياسة الخصوصية</a></p>
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
    ...(order.coupon?.amount ? [[`كوبون <bdi dir="ltr">${esc(order.coupon.code)}</bdi>`, `− ${money(order.coupon.amount)}`, 'sum-disc']] : []),
    [`التوصيل (${esc(order.customer.zone)})`, order.shipping ? money(order.shipping) : 'مجاني', ''],
  ];
  $('#checkout').innerHTML = `
    <div class="co-done">
      <div class="co-done__icon">${icon('check')}</div>
      <h1>شكراً ${esc(firstName)}! وصلنا طلبك</h1>
      <div class="order-id">
        <span>رقم الطلب:</span>
        <b class="order-no">${order.id}</b>
        <button type="button" class="order-copy" data-copy-order="${order.id}" aria-label="انسخي رقم الطلب">${icon('copy', 'ic--sm')}<span>نسخ</span></button>
      </div>
      <p class="order-id__note">احتفظي برقم الطلب — بتستعمليه لتتبع طلبك من أي جهاز، أو لما تسألينا عنه.</p>
      <p class="co-done__sub">${order.customer.whatsappOk ? 'رح توصلك رسالة واتساب على' : 'رح نتصل فيكِ على'} <bdi dir="ltr">${esc(phoneDisplay(order.customer.phone))}</bdi> خلال 24 ساعة لتأكيد الطلب.</p>
      <div class="co-card co-done__card">
        ${rows.map(([label, value, cls]) => `<div class="done-row ${cls}"><span>${label}</span><span>${value}</span></div>`).join('')}
        <div class="done-row sum-total"><span>بتدفعي عند الاستلام</span><b>${money(order.total)}</b></div>
      </div>
      <div class="co-done__cta">
        <a href="track.html#${order.id}" class="btn btn--primary">تتبعي طلبك</a>
        ${STORE.whatsapp ? `<a href="${whatsappUrl(`مرحبا، بدي أأكد طلبي رقم ${order.id}`)}" class="btn btn--ghost" target="_blank" rel="noopener">أكدي عبر واتساب</a>` : ''}
        <a href="index.html" class="btn btn--ghost">كمّلي التسوق</a>
      </div>
    </div>`;
}

// نسخ رقم الطلب من صفحة الشكر
$('#checkout').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy-order]');
  if (!btn) return;
  if (!await copyText(btn.dataset.copyOrder)) {
    // إذا المتصفح منع النسخ كلياً: بنحدد الرقم عشان تنسخه بإيدها
    getSelection().selectAllChildren(btn.previousElementSibling);
    return toast('حدّدنا الرقم — انسخيه من القائمة');
  }
  btn.classList.add('done');
  btn.querySelector('span').textContent = 'انتسخ';
  toast(`انتسخ رقم الطلب ${btn.dataset.copyOrder}`);
  setTimeout(() => { btn.classList.remove('done'); btn.querySelector('span').textContent = 'نسخ'; }, 2500);
});

// ===== الكوبون =====
function couponHTML() {
  if (coupon.applied) {
    return `
      <div class="coupon coupon--on">
        <span>${icon('check', 'ic--sm')} كوبون <bdi dir="ltr">${esc(coupon.applied.code)}</bdi> · ${couponLabel(coupon.applied)}</span>
        <button type="button" class="link-btn" data-coupon-remove>إزالة</button>
      </div>`;
  }
  return `
    <details class="coupon"${coupon.open ? ' open' : ''}>
      <summary>عندك كوبون خصم؟</summary>
      <div class="coupon__row">
        <input id="couponInput" dir="ltr" autocomplete="off" autocapitalize="characters" placeholder="CODE" aria-label="كود الكوبون">
        <button type="button" class="btn btn--sm btn--ghost" data-coupon-apply>تطبيق</button>
      </div>
      ${coupon.msg ? `<small class="coupon__msg" role="alert">${esc(coupon.msg)}</small>` : ''}
    </details>`;
}

async function applyCoupon() {
  const code = normalizeCode($('#couponInput')?.value);
  if (!code) return;
  const btn = $('[data-coupon-apply]');
  if (btn) btn.disabled = true;
  const check = await checkCoupon(code, cart.totals().total);
  coupon.applied = check.ok ? check.coupon : null;
  coupon.msg = check.ok ? '' : check.error;
  coupon.open = !check.ok;
  renderSummary();
  if (check.ok) toast(`انطبق الكوبون: ${couponLabel(check.coupon)}`);
  else $('#couponInput')?.focus();
}

$('#summary').addEventListener('click', (e) => {
  if (e.target.closest('[data-sum-toggle]')) {
    summaryOpen = !summaryOpen;
    $('#summary').classList.toggle('open', summaryOpen);
    e.target.closest('[data-sum-toggle]').setAttribute('aria-expanded', summaryOpen);
    return;
  }
  if (e.target.closest('[data-coupon-apply]')) applyCoupon();
  if (e.target.closest('[data-coupon-remove]')) { coupon.applied = null; coupon.msg = ''; coupon.open = true; renderSummary(); }
});
$('#summary').addEventListener('keydown', (e) => {
  if (e.target.id === 'couponInput' && e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
});
$('#summary').addEventListener('toggle', (e) => { if (e.target.matches?.('details.coupon')) coupon.open = e.target.open; }, true);

// ===== إرسال الطلب =====
async function submit(e) {
  e.preventDefault();
  if (submitting) return;
  const invalid = validate();
  if (invalid) {
    invalid.focus();
    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const totals = cart.totals();
  const short = totals.rows.find((r) => stockOf(r.product, r.size) < r.qty);
  if (short) return toast(`ما في كمية كافية من ${short.product.name} (${sizeLabel(short.size)})`);

  submitting = true;
  setSubmitting(true);
  try {
    const order = await placeOrder({
      items: cart.lines.map(({ id, size, color, qty }) => ({ id, size, color, qty })),
      couponCode: coupon.applied?.code || null,
      customer: {
        name: `${form.elements.firstName.value.trim()} ${form.elements.lastName.value.trim()}`.replace(/\s+/g, ' '),
        phone: fullPhone(),
        whatsappOk: form.elements.whatsappOk.checked,
        zoneId: zoneId,
        area: form.elements.area.value.trim(),
        address: form.elements.address.value.trim(),
        city: form.elements.city.value.trim(),
        notes: form.elements.notes.value.trim(),
      },
    });
    unsubscribe();
    cart.clear();
    renderSuccess(order);
  } catch (err) {
    submitting = false;
    setSubmitting(false);
    toast(err.message);
  }
}

// زر التأكيد بيصير "عم نبعت…" لحد ما يرد السيرفر
function setSubmitting(on) {
  $$('button[form="coForm"]').forEach((b) => {
    b.disabled = on;
    if (on) { b.dataset.label = b.textContent; b.textContent = 'عم نبعت طلبك…'; } else if (b.dataset.label) b.textContent = b.dataset.label;
  });
}

// ===== التشغيل =====
renderZones();
restoreCustomer();
$$('input[name="zone"]').forEach((r) => r.addEventListener('change', () => selectZone(r.value)));
// خانات الاسم: أي حرف مش عربي (إنجليزي، أرقام، رموز) ما بينكتب أصلاً، وبتطلع ملاحظة صغيرة
const NAME_FIELDS = ['firstName', 'lastName'];
const NOT_ARABIC = /[^\u0621-\u064A\u0671-\u06D3\s]/g;

function keepArabicOnly(input) {
  if (!NOT_ARABIC.test(input.value)) return;
  NOT_ARABIC.lastIndex = 0;
  const pos = input.selectionStart - (input.value.slice(0, input.selectionStart).match(NOT_ARABIC) || []).length;
  input.value = input.value.replace(NOT_ARABIC, '');
  input.setSelectionRange(pos, pos);
  const hint = input.closest('.field').querySelector('.field__err');
  hint.textContent = 'الاسم بالعربي بس — غيّري لغة الكيبورد للعربي';
  clearTimeout(input.hintTimer);
  input.hintTimer = setTimeout(() => { if (hint.textContent.startsWith('الاسم بالعربي بس')) hint.textContent = ''; }, 2500);
}

form.addEventListener('input', (e) => {
  if (NAME_FIELDS.includes(e.target.name)) {
    setFieldError(e.target, '');
    keepArabicOnly(e.target);
    saveCustomer();
    return;
  }
  if (e.target.name in RULES) setFieldError(e.target, '');
  if (e.target.name === 'phone') guessPrefix();
  saveCustomer();
});
form.elements.prefix.addEventListener('change', () => { prefixPicked = true; saveCustomer(); });
form.elements.whatsappOk.addEventListener('change', saveCustomer);

// شرح المقدمة (زر ؟)
$('#phoneHelp').addEventListener('click', () => {
  const tip = $('#phoneTip');
  tip.hidden = !tip.hidden;
  $('#phoneHelp').setAttribute('aria-expanded', !tip.hidden);
});
form.addEventListener('submit', submit);
const unsubscribe = cart.subscribe(renderSummary);
renderSummary();
