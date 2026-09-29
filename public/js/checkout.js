// صفحة إتمام الطلب — الدفع عند الاستلام
const form = $('#coForm');
let zoneId = null;

// نحفظ معلومات الزبونة عشان ما تعيد تكتبها بالطلب الجاي
const SAVED_KEY = 'nunu_customer';
const saved = (() => { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || {}; } catch (e) { return {}; } })();

function shippingFee(total) {
  const zone = STORE.shippingZones.find((z) => z.id === zoneId);
  if (!zone) return null;
  if (STORE.freeShippingOver && total >= STORE.freeShippingOver) return 0;
  return zone.fee;
}

// ===== المناطق =====
$('#zones').innerHTML = STORE.shippingZones.map((z) => `
  <label class="zone">
    <input type="radio" name="zone" value="${z.id}">
    <span class="zone__name">${esc(z.name)}</span>
    <span class="zone__meta">${money(z.fee)} · ${esc(z.days)}</span>
  </label>`).join('');
$$('input[name="zone"]').forEach((r) => r.addEventListener('change', () => {
  zoneId = r.value; $('#zoneErr').textContent = ''; saveDraft(); renderSummary();
}));

// تعبئة من الطلب السابق
['name', 'phone', 'city', 'address'].forEach((k) => { if (saved[k]) form.elements[k].value = saved[k]; });
if (saved.zone && STORE.shippingZones.some((z) => z.id === saved.zone)) {
  zoneId = saved.zone;
  $(`input[name="zone"][value="${zoneId}"]`).checked = true;
}
const saveDraft = () => {
  const d = { zone: zoneId };
  ['name', 'phone', 'city', 'address'].forEach((k) => (d[k] = form.elements[k].value.trim()));
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(d)); } catch (e) {}
};
form.addEventListener('input', (e) => {
  const f = e.target.closest('.field');
  if (f) { f.classList.remove('has-err'); $('.field__err', f).textContent = ''; }
  saveDraft();
});

// ===== الملخص =====
function renderSummary() {
  const t = cartTotals(Cart.items);
  if (!t.lines.length) return renderEmpty();
  const fee = shippingFee(t.total);
  const grand = t.total + (fee || 0);
  const gap = STORE.freeShippingOver ? STORE.freeShippingOver - t.total : 0;
  const recs = recommend({ cart: Cart.items, gap: gap > 0 ? gap : 0, maxPrice: 80, limit: 2 });

  $('#summary').innerHTML = `
    <div class="co-card co-card--sum">
      <h2>ملخص الطلب <small>(${t.count} ${t.count === 1 ? 'قطعة' : 'قطع'})</small></h2>
      <div class="sum-lines">
        ${t.lines.map((l, i) => `
          <div class="sum-line">
            <div class="sum-line__img"><img src="${IMG(l.p.images[0], 120)}" alt=""><span>${l.qty}</span></div>
            <div class="sum-line__info">
              <b>${esc(l.p.name)}</b>
              <small>${SIZE_LABELS[l.size] || ''}${l.color ? ` · ${esc(l.color)}` : ''}</small>
              <div class="qty qty--sm">
                <button type="button" data-cart-qty="${i}" data-d="1" aria-label="زيادة">+</button>
                <span>${l.qty}</span>
                <button type="button" data-cart-qty="${i}" data-d="-1" aria-label="نقصان">−</button>
              </div>
            </div>
            <span class="sum-line__price">${money(l.unit * l.qty)}</span>
          </div>`).join('')}
      </div>

      ${recs.length ? `
      <div class="suggest suggest--co">
        <p class="suggest__title">${gap > 0 ? `ضايلك ${money(gap)} على التوصيل المجاني، بتحبي تضيفي؟` : 'ناس كتير بتضيف معه'}</p>
        ${recs.map(suggestRow).join('')}
      </div>` : ''}

      <div class="sum-rows">
        <div><span>المجموع الفرعي</span><span>${money(t.subtotal)}</span></div>
        ${t.discounts.map((d) => `<div class="sum-disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
        <div><span>التوصيل</span><span>${fee === null ? '<em>اختاري المنطقة</em>' : fee === 0 ? '<b class="free">مجاني</b>' : money(fee)}</span></div>
        <div class="sum-total"><span>المجموع الكلي</span><b>${money(grand)}</b></div>
      </div>

      <button type="submit" form="coForm" class="btn btn--primary btn--block co-submit">تأكيد الطلب · ${money(grand)}</button>
      <p class="co-note"><svg class="ic ic--sm"><use href="#i-cash"/></svg> بتدفعي ${money(grand)} نقداً لما يوصلك الطلب</p>
      <ul class="co-trust">
        <li><svg class="ic ic--sm"><use href="#i-swap"/></svg> تبديل المقاس خلال 7 أيام</li>
        <li><svg class="ic ic--sm"><use href="#i-truck"/></svg> ${zoneId ? `التوصيل خلال ${esc(STORE.shippingZones.find((z) => z.id === zoneId).days)}` : 'توصيل لكل المناطق'}</li>
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
  $('#coBar').remove();
}

// أي تغيير بالسلة (من الملخص أو السلة الجانبية) بيحدّث الصفحة
const baseRenderCart = renderCart;
renderCart = function () { baseRenderCart(); if ($('#summary')) renderSummary(); };
renderSummary();

// ===== التحقق من المعلومات =====
const normalizePhone = (v) => v.replace(/[\s\-()]/g, '').replace(/^\+?(970|972)/, '0');
const RULES = {
  name: (v) => (v.trim().length < 3 ? 'اكتبي الاسم الكامل' : ''),
  phone: (v) => (/^05\d{8}$/.test(normalizePhone(v)) ? '' : 'الرقم لازم يكون 10 أرقام ويبلش بـ 05'),
  city: (v) => (v.trim().length < 2 ? 'اكتبي المدينة أو القرية' : ''),
  address: (v) => (v.trim().length < 4 ? 'اكتبي العنوان بالتفصيل عشان يوصلك المندوب' : ''),
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  for (const [k, rule] of Object.entries(RULES)) {
    const input = form.elements[k];
    const msg = rule(input.value);
    const f = input.closest('.field');
    f.classList.toggle('has-err', !!msg);
    $('.field__err', f).textContent = msg;
    if (msg && !first) first = input;
  }
  if (!zoneId) {
    $('#zoneErr').textContent = 'اختاري منطقة التوصيل';
    first = first || $('#zones input');
  }
  if (first) { first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

  // تأكد من المخزون
  const t = cartTotals(Cart.items);
  const short = t.lines.find((l) => (l.p.stock[l.size] || 0) < l.qty);
  if (short) { toast(`ما في كمية كافية من ${short.p.name} (${SIZE_LABELS[short.size]})`); return; }

  placeOrder(t);
});

function placeOrder(t) {
  const fee = shippingFee(t.total) || 0;
  const zone = STORE.shippingZones.find((z) => z.id === zoneId);
  const order = {
    id: `NK-${String(Date.now()).slice(-6)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    payment: 'cod',
    customer: {
      name: form.elements.name.value.trim(),
      phone: normalizePhone(form.elements.phone.value),
      zone: zone.name,
      city: form.elements.city.value.trim(),
      address: form.elements.address.value.trim(),
      notes: form.elements.notes.value.trim(),
    },
    items: t.lines.map((l) => ({ id: l.p.id, name: l.p.name, size: l.size, color: l.color, qty: l.qty, unit: l.unit })),
    subtotal: t.subtotal,
    discounts: t.discounts,
    shipping: fee,
    total: t.total + fee,
  };

  // مؤقتاً بنحفظ الطلب بالمتصفح. بخطوة السيرفر ولوحة الأدمن رح ينبعت للسيرفر.
  try {
    const orders = JSON.parse(localStorage.getItem('nunu_orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('nunu_orders', JSON.stringify(orders));
  } catch (e) {}
  Cart.items = []; Cart.save(); renderCart = baseRenderCart; renderCart();
  renderSuccess(order);
}

function renderSuccess(o) {
  window.scrollTo({ top: 0 });
  $('#coBar').remove();
  const wa = STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`مرحبا، بدي أأكد طلبي رقم ${o.id}`)}` : '';
  $('#checkout').innerHTML = `
    <div class="co-done">
      <div class="co-done__icon"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h1>شكراً ${esc(o.customer.name.split(' ')[0])}! وصلنا طلبك</h1>
      <p>رقم الطلب: <b class="order-no">${o.id}</b></p>
      <p class="co-done__sub">رح نتصل فيكِ على <bdi dir="ltr">${esc(o.customer.phone)}</bdi> خلال 24 ساعة لتأكيد الطلب.</p>

      <div class="co-card co-done__card">
        ${o.items.map((i) => `<div class="done-row"><span>${esc(i.name)} <small>${SIZE_LABELS[i.size] || ''} × ${i.qty}</small></span><span>${money(i.unit * i.qty)}</span></div>`).join('')}
        ${o.discounts.map((d) => `<div class="done-row sum-disc"><span>${esc(d.title)}</span><span>− ${money(d.amount)}</span></div>`).join('')}
        <div class="done-row"><span>التوصيل (${esc(o.customer.zone)})</span><span>${o.shipping ? money(o.shipping) : 'مجاني'}</span></div>
        <div class="done-row sum-total"><span>بتدفعي عند الاستلام</span><b>${money(o.total)}</b></div>
      </div>

      <div class="co-done__cta">
        <a href="track.html?order=${o.id}" class="btn btn--primary">تتبعي طلبك</a>
        ${wa ? `<a href="${wa}" class="btn btn--ghost" target="_blank" rel="noopener">أكدي عبر واتساب</a>` : ''}
        <a href="index.html" class="btn btn--ghost">كمّلي التسوق</a>
      </div>
    </div>`;
}
