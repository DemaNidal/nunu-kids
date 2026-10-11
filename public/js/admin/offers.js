// لوحة الأدمن: العروض (خصم نسبة / مبلغ / اشتري وخدي) وكوبونات الخصم
import { $, $$, esc, money, img, copyText } from '../utils.js';
import { CATEGORIES } from '../config.js';
import { icon } from '../ui/icons.js';
import { offersApi, couponsApi, listProducts, scheduleState } from './api.js';
import { mountAdmin, adminToast } from './layout.js';
import { couponLabel, normalizeCode } from '../store/coupons.js';

mountAdmin('offers');

const state = { tab: location.hash === '#coupons' ? 'coupons' : 'offers', offers: [], coupons: [], products: [], draft: null };
const HINTS = {
  offers: 'العروض بتنطبق لحالها عالأسعار بالمتجر — ما بتحتاج كود. لما ما يكون في عرض فعّال، كل إشي متعلق بالعروض بيختفي من المتجر.',
  coupons: 'الكوبون كود بتكتبه الزبونة بصفحة الدفع (مثلاً بتعطيه للمتابعين على إنستغرام). بينضاف فوق العروض.',
};

// ===== تواريخ =====
// خانة التاريخ بتشتغل على يوم كامل: البداية من أول اليوم، والنهاية لآخره
const toDateInput = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '');
const fromStart = (v) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);
const fromEnd = (v) => (v ? new Date(`${v}T23:59:59`).toISOString() : null);
const day = (iso) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long' }).format(new Date(iso));

function periodText(x) {
  if (x.startsAt && x.endsAt) return `من ${day(x.startsAt)} لـ ${day(x.endsAt)}`;
  if (x.endsAt) return `لحد ${day(x.endsAt)}`;
  if (x.startsAt) return `من ${day(x.startsAt)}`;
  return 'بدون تاريخ انتهاء';
}

// ===== وصف العرض بجملة =====
function targetText(o) {
  const { kind, ids = [] } = o.target;
  if (kind === 'all') return 'على كل المتجر';
  if (kind === 'category') return `على ${ids.map((c) => CATEGORIES[c]).join(' و')}`;
  const names = ids.map((id) => state.products.find((p) => p.id === id)?.name).filter(Boolean);
  return names.length <= 2 ? `على ${names.join(' و') || 'منتجات مختارة'}` : `على ${names.length} منتجات`;
}

function offerSentence(o) {
  const what = o.type === 'percent' ? `خصم ${o.value || 0}%` : o.type === 'fixed' ? `خصم ${money(o.value || 0)} عالقطعة` : `اشتري ${o.buy || 0} وخدي ${o.get || 0} مجاناً`;
  return `${what} ${targetText(o)}`;
}

function couponSentence(c) {
  return [couponLabel(c), c.minTotal ? `للطلبات من ${money(c.minTotal)}` : 'لأي طلب'].join(' · ');
}

// ===== القائمة =====
const stPill = (x) => { const s = scheduleState(x); return `<span class="st st--sch-${s.key}">${s.label}</span>`; };

const switchHTML = (x, kind) => `
  <label class="toggle toggle--sm" title="${x.active ? 'وقّفي' : 'شغّلي'}">
    <input type="checkbox" data-toggle="${kind}:${x.id}" ${x.active ? 'checked' : ''} aria-label="${x.active ? 'شغّال' : 'متوقف'}"><span></span>
  </label>`;

const offerCard = (o) => `
  <article class="ofc">
    <div class="ofc__main" data-edit="offers:${o.id}" role="button" tabindex="0">
      <span class="ofc__badge ofc__badge--${o.type}">${o.type === 'bxgy' ? `${o.buy}+${o.get}` : o.type === 'percent' ? `${o.value}%` : `−${o.value}`}</span>
      <div><b>${esc(o.title)}</b><small>${esc(offerSentence(o))} · ${periodText(o)}${o.banner ? ' · بانر بالرئيسية' : ''}</small></div>
    </div>
    <div class="ofc__side">${stPill(o)}${switchHTML(o, 'offers')}</div>
  </article>`;

const couponCard = (c) => `
  <article class="ofc">
    <div class="ofc__main" data-edit="coupons:${c.id}" role="button" tabindex="0">
      <span class="ofc__code" dir="ltr">${esc(c.code)}</span>
      <div><b>${esc(couponSentence(c))}</b><small>استُعمل ${c.used || 0}${c.maxUses != null ? ` من ${c.maxUses}` : ''} مرة · ${periodText(c)}${c.note ? ` · ${esc(c.note)}` : ''}</small></div>
    </div>
    <div class="ofc__side">
      ${stPill(c)}
      <button type="button" class="icon-btn" data-copy="${esc(c.code)}" aria-label="انسخي الكود">${icon('link')}</button>
      ${switchHTML(c, 'coupons')}
    </div>
  </article>`;

function renderList() {
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === state.tab));
  $('#offersCount').textContent = state.offers.length;
  $('#couponsCount').textContent = state.coupons.length;
  $('#tabHint').textContent = HINTS[state.tab];
  $('#addBtn').textContent = state.tab === 'offers' ? '+ عرض جديد' : '+ كوبون جديد';
  const live = state.offers.filter((o) => scheduleState(o).key === 'live').length;
  $('#summary').textContent = !live ? 'ما في عروض شغّالة هلأ' : live === 1 ? 'عرض واحد شغّال هلأ' : live === 2 ? 'عرضين شغّالين هلأ' : `${live} عروض شغّالة هلأ`;
  const list = state[state.tab];
  $('#list').innerHTML = list.length
    ? list.map(state.tab === 'offers' ? offerCard : couponCard).join('')
    : `<div class="adm-empty">${state.tab === 'offers' ? 'ما في عروض لسا' : 'ما في كوبونات لسا'}</div>`;
}

// ===== نموذج العرض =====
const NEW_OFFER = () => ({ id: '', active: true, label: 'عرض خاص', title: '', type: 'percent', value: 10, buy: 3, get: 1, target: { kind: 'all', ids: [] }, startsAt: null, endsAt: null, banner: false });
const NEW_COUPON = () => ({ id: '', code: '', active: true, type: 'percent', value: 10, minTotal: 0, maxUses: null, used: 0, startsAt: null, endsAt: null, note: '' });

const radio = (name, value, current, label, sub = '') => `
  <label class="rcard${value === current ? ' on' : ''}"><input type="radio" name="${name}" value="${value}" ${value === current ? 'checked' : ''}><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</label>`;

function productPicker(ids) {
  const items = state.products.filter((p) => p.visible !== false);
  return `
    <input type="search" class="pick__search" placeholder="دوّري على منتج" data-pick-search aria-label="بحث بالمنتجات">
    <div class="pick">${items.map((p) => `
      <label class="pick__item" data-name="${esc(p.name)}">
        <input type="checkbox" name="pid" value="${p.id}" ${ids.includes(p.id) ? 'checked' : ''}>
        <img src="${img(p.images[0], 80)}" alt=""><span>${esc(p.name)}</span><small>${money(p.price)}</small>
      </label>`).join('')}</div>`;
}

function offerFormHTML(o) {
  const t = o.target;
  return `
    <div class="fld-group">
      <label class="fld"><span>عنوان العرض (بيشوفه الزبون) *</span><input name="title" value="${esc(o.title)}" maxlength="70" placeholder="مثلاً: خصم 20% على كل البكجات"><small class="fld__err"></small></label>
      <label class="fld"><span>الشارة القصيرة</span><input name="label" value="${esc(o.label)}" maxlength="20" placeholder="عرض خاص / عرض الأسبوع"></label>
    </div>

    <h3 class="fh">نوع العرض</h3>
    <div class="rcards">
      ${radio('type', 'percent', o.type, 'خصم نسبة', 'مثلاً 20%')}
      ${radio('type', 'fixed', o.type, 'خصم مبلغ', 'مثلاً 10 ₪ عالقطعة')}
      ${radio('type', 'bxgy', o.type, 'اشتري وخدي', 'مثلاً 3 + 1 مجاناً')}
    </div>
    ${o.type === 'bxgy' ? `
      <div class="fld-row">
        <label class="fld"><span>اشتري</span><input name="buy" type="number" min="1" value="${o.buy}"></label>
        <label class="fld"><span>وخدي مجاناً</span><input name="get" type="number" min="1" value="${o.get}"></label>
      </div>
      <p class="muted-note">القطع المجانية هي الأرخص بالطلب.</p>` : `
      <label class="fld fld--short"><span>${o.type === 'percent' ? 'النسبة (%)' : 'المبلغ (₪) عن كل قطعة'}</span><input name="value" type="number" min="1" ${o.type === 'percent' ? 'max="90"' : ''} value="${o.value}"><small class="fld__err"></small></label>`}

    <h3 class="fh">بيطبّق على</h3>
    <div class="rcards">
      ${radio('kind', 'all', t.kind, 'كل المتجر')}
      ${radio('kind', 'category', t.kind, 'أقسام')}
      ${radio('kind', 'products', t.kind, 'منتجات معيّنة')}
    </div>
    ${t.kind === 'category' ? `<div class="checks">${Object.entries(CATEGORIES).map(([k, v]) => `
      <label class="check"><input type="checkbox" name="cat" value="${k}" ${t.ids.includes(k) ? 'checked' : ''}> ${v}</label>`).join('')}</div>` : ''}
    ${t.kind === 'products' ? productPicker(t.ids) : ''}
    <small class="fld__err" id="targetErr"></small>

    <h3 class="fh">المدة</h3>
    <div class="fld-row">
      <label class="fld"><span>بيبلش</span><input name="startsAt" type="date" value="${toDateInput(o.startsAt)}"></label>
      <label class="fld"><span>بيخلص (آخر يوم)</span><input name="endsAt" type="date" value="${toDateInput(o.endsAt)}"></label>
    </div>
    <p class="muted-note">فاضي = بيبلش هلأ وما إله نهاية. إذا في تاريخ نهاية، بيبين عدّاد تنازلي بصفحة المنتج.</p>

    <label class="toggle"><input type="checkbox" name="banner" ${o.banner ? 'checked' : ''}><span></span> إظهاره كبانر بالصفحة الرئيسية</label>
    <label class="toggle"><input type="checkbox" name="active" ${o.active ? 'checked' : ''}><span></span> شغّال</label>

    <p class="sentence" id="sentence">${esc(offerSentence(o))} · ${periodText(o)}</p>`;
}

function couponFormHTML(c) {
  return `
    <label class="fld"><span>الكود *</span>
      <div class="code-row"><input name="code" dir="ltr" value="${esc(c.code)}" maxlength="20" placeholder="NUNU10" autocapitalize="characters"><button type="button" class="btn btn--sm btn--ghost" data-gen-code>اقتراح كود</button></div>
      <small class="fld__err"></small>
    </label>

    <h3 class="fh">نوع الخصم</h3>
    <div class="rcards">
      ${radio('type', 'percent', c.type, 'نسبة', 'من مجموع الطلب')}
      ${radio('type', 'fixed', c.type, 'مبلغ', 'من مجموع الطلب')}
      ${radio('type', 'shipping', c.type, 'توصيل مجاني')}
    </div>
    ${c.type === 'shipping' ? '' : `<label class="fld fld--short"><span>${c.type === 'percent' ? 'النسبة (%)' : 'المبلغ (₪)'}</span><input name="value" type="number" min="1" ${c.type === 'percent' ? 'max="90"' : ''} value="${c.value}"><small class="fld__err"></small></label>`}

    <div class="fld-row">
      <label class="fld"><span>أقل مجموع للطلب (₪)</span><input name="minTotal" type="number" min="0" value="${c.minTotal || ''}" placeholder="بدون حد"></label>
      <label class="fld"><span>عدد مرات الاستعمال</span><input name="maxUses" type="number" min="1" value="${c.maxUses ?? ''}" placeholder="بدون حد"></label>
    </div>
    <div class="fld-row">
      <label class="fld"><span>بيبلش</span><input name="startsAt" type="date" value="${toDateInput(c.startsAt)}"></label>
      <label class="fld"><span>بيخلص (آخر يوم)</span><input name="endsAt" type="date" value="${toDateInput(c.endsAt)}"></label>
    </div>
    <label class="fld"><span>ملاحظة إلك</span><input name="note" value="${esc(c.note)}" maxlength="60" placeholder="مثلاً: للمؤثرة فلانة"></label>
    <label class="toggle"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}><span></span> شغّال</label>
    ${c.id ? `<p class="muted-note">انستعمل ${c.used || 0} مرة لهلأ.</p>` : ''}
    <p class="sentence" id="sentence">${esc(couponSentence(c))} · ${periodText(c)}</p>`;
}

function renderForm() {
  const kind = state.draftKind;
  const x = state.draft;
  $('#od').innerHTML = `
    <header class="od__head">
      <div><h2>${x.id ? 'تعديل' : 'إضافة'} ${kind === 'offers' ? 'عرض' : 'كوبون'}</h2></div>
      <button type="button" class="icon-btn" data-close aria-label="إغلاق">${icon('x')}</button>
    </header>
    <form class="od__body ofform" id="ofForm" novalidate>${kind === 'offers' ? offerFormHTML(x) : couponFormHTML(x)}</form>
    <footer class="od__foot">
      ${x.id ? '<button type="button" class="btn btn--sm od__cancel" data-delete>حذف</button>' : ''}
      <button type="submit" form="ofForm" class="btn btn--primary btn--sm">حفظ</button>
    </footer>`;
}

// قراءة النموذج للمسودة (بدون ما نخسر شي إذا انرسم من جديد)
function readForm() {
  const f = $('#ofForm');
  if (!f) return;
  const x = state.draft;
  const val = (n) => f.elements[n]?.value;
  const num = (n) => (val(n) === '' || val(n) == null ? null : Number(val(n)));
  ['title', 'label', 'note'].forEach((n) => { if (f.elements[n]) x[n] = val(n); });
  if (f.elements.code) x.code = normalizeCode(val('code'));
  if (f.elements.type) x.type = f.querySelector('[name="type"]:checked').value;
  ['value', 'buy', 'get'].forEach((n) => { if (f.elements[n]) x[n] = num(n) ?? 0; });
  if (f.elements.minTotal) x.minTotal = num('minTotal') || 0;
  if (f.elements.maxUses) x.maxUses = num('maxUses');
  x.startsAt = fromStart(val('startsAt'));
  x.endsAt = fromEnd(val('endsAt'));
  x.active = f.elements.active.checked;
  if (f.elements.banner) x.banner = f.elements.banner.checked;
  if (state.draftKind === 'offers') {
    const kind = f.querySelector('[name="kind"]:checked').value;
    // لما يتغير نوع الهدف، الخانات الجديدة لسا ما انرسمت فبتطلع ids فاضية — هيك المطلوب
    const ids = kind === 'category' ? $$('[name="cat"]:checked', f).map((i) => i.value)
      : kind === 'products' ? $$('[name="pid"]:checked', f).map((i) => Number(i.value)) : [];
    x.target = { kind, ids };
  }
}

function openForm(kind, item) {
  state.draftKind = kind;
  state.draft = structuredClone(item);
  renderForm();
  $('#od').classList.add('open');
  $('#odScrim').classList.add('show');
  document.body.classList.add('adm-lock');
  $('#od input:not([type="hidden"])')?.focus({ preventScroll: true });
}

function closeForm() {
  $('#od').classList.remove('open');
  $('#odScrim').classList.remove('show');
  document.body.classList.remove('adm-lock');
  state.draft = null;
}

function validate() {
  const x = state.draft;
  const f = $('#ofForm');
  const err = (name, msg) => { const el = f.elements[name]?.closest('.fld')?.querySelector('.fld__err'); if (el) el.textContent = msg; return !!msg; };
  const bad = [];
  if (state.draftKind === 'offers') {
    bad.push(err('title', x.title.trim().length < 3 ? 'اكتبي عنوان للعرض' : ''));
    if (x.type !== 'bxgy') bad.push(err('value', !(x.value > 0) || (x.type === 'percent' && x.value > 90) ? 'اكتبي قيمة صحيحة' : ''));
    const tErr = x.target.kind !== 'all' && !x.target.ids.length ? 'اختاري عالأقل قسم أو منتج' : '';
    $('#targetErr').textContent = tErr;
    bad.push(!!tErr);
  } else {
    const taken = state.coupons.some((c) => c.code === x.code && c.id !== x.id);
    bad.push(err('code', !/^[A-Z0-9]{3,20}$/.test(x.code) ? 'الكود من 3 لـ 20 حرف أو رقم إنجليزي' : taken ? 'في كوبون بنفس الكود' : ''));
    if (x.type !== 'shipping') bad.push(err('value', !(x.value > 0) || (x.type === 'percent' && x.value > 90) ? 'اكتبي قيمة صحيحة' : ''));
  }
  if (x.startsAt && x.endsAt && x.endsAt < x.startsAt) { adminToast('تاريخ النهاية قبل البداية'); bad.push(true); }
  return !bad.some(Boolean);
}

async function save(e) {
  e.preventDefault();
  readForm();
  if (!validate()) return;
  const api = state.draftKind === 'offers' ? offersApi : couponsApi;
  const x = { ...state.draft };
  if (state.draftKind === 'offers') {
    x.title = x.title.trim();
    if (x.type === 'bxgy') delete x.value; else { delete x.buy; delete x.get; }
  }
  try {
    await api.save(x);
    await reload();
    closeForm();
    adminToast('انحفظ ♡');
  } catch (err) { adminToast(err.message); }
}

async function reload() {
  [state.offers, state.coupons] = await Promise.all([offersApi.list(), couponsApi.list()]);
  renderList();
}

// ===== الأحداث =====
document.addEventListener('click', async (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { state.tab = tab.dataset.tab; history.replaceState(null, '', state.tab === 'coupons' ? '#coupons' : location.pathname); renderList(); return; }
  if (e.target.closest('#addBtn')) return openForm(state.tab, state.tab === 'offers' ? NEW_OFFER() : NEW_COUPON());
  const edit = e.target.closest('[data-edit]');
  if (edit) { const [kind, id] = edit.dataset.edit.split(':'); return openForm(kind, state[kind].find((x) => x.id === id)); }
  if (e.target.closest('[data-close]') || e.target.id === 'odScrim') return closeForm();
  const copy = e.target.closest('[data-copy]');
  if (copy) return adminToast(await copyText(copy.dataset.copy) ? `انتسخ الكود ${copy.dataset.copy}` : 'ما قدرنا ننسخ — انسخيه بإيدك');
  if (e.target.closest('[data-gen-code]')) {
    const code = `NUNU${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    $('#ofForm').elements.code.value = code;
    readForm(); $('#sentence').textContent = `${couponSentence(state.draft)} · ${periodText(state.draft)}`;
    return;
  }
  if (e.target.closest('[data-delete]')) {
    if (!confirm('أكيد بدك تحذفي؟ (إذا بدك توقفيه بس، شيلي "شغّال")')) return;
    await (state.draftKind === 'offers' ? offersApi : couponsApi).remove(state.draft.id);
    closeForm(); await reload(); adminToast('انحذف');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.draft) closeForm();
  const edit = e.target.closest?.('[data-edit]');
  if (edit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); edit.click(); }
});

// تشغيل / إيقاف سريع من القائمة
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.dataset.toggle) {
    const [kind, id] = t.dataset.toggle.split(':');
    const api = kind === 'offers' ? offersApi : couponsApi;
    const item = state[kind].find((x) => x.id === id);
    await api.save({ ...item, active: t.checked });
    await reload();
    adminToast(t.checked ? 'اشتغل' : 'توقف');
    return;
  }
  if (!t.closest('#ofForm')) return;
  readForm();
  // تغيير النوع أو الهدف بيغيّر الخانات اللي تحت
  if (['type', 'kind'].includes(t.name)) { renderForm(); return; }
  $('#sentence').textContent = `${state.draftKind === 'offers' ? offerSentence(state.draft) : couponSentence(state.draft)} · ${periodText(state.draft)}`;
});

document.addEventListener('input', (e) => {
  if (e.target.matches('[data-pick-search]')) {
    const q = e.target.value.trim();
    $$('.pick__item').forEach((el) => { el.hidden = q && !el.dataset.name.includes(q); });
    return;
  }
  if (e.target.closest('#ofForm') && e.target.type !== 'search') {
    readForm();
    $('#sentence').textContent = `${state.draftKind === 'offers' ? offerSentence(state.draft) : couponSentence(state.draft)} · ${periodText(state.draft)}`;
  }
});

document.addEventListener('submit', (e) => { if (e.target.id === 'ofForm') save(e); });

// ===== التشغيل =====
state.products = await listProducts();
await reload();
