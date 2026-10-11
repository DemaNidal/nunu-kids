// لوحة الأدمن: إعدادات المتجر — التواصل، التوصيل، التبديل، والشريط اللي فوق
import { $, $$, esc } from '../utils.js';
import { DEFAULT_STORE } from '../config.js';
import { getSettings, saveSettings } from './api.js';
import { mountAdmin, adminToast } from './layout.js';

mountAdmin('settings');

const form = $('#sform');
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
let s = null;
let dirty = false;
const markDirty = () => { dirty = true; $('#dirty').hidden = false; };

// رقم واتساب: 0599123456 ← 970599123456. الأرقام اللي بتبلش بـ 05 بنفترض إنها فلسطينية (970)
function normalizeWhatsapp(v) {
  const d = String(v).replace(/[^\d]/g, '').replace(/^00/, '');
  if (!d) return '';
  if (/^05\d{8}$/.test(d)) return `970${d.slice(1)}`;
  return d;
}
const validWhatsapp = (d) => !d || /^(970|972)5\d{8}$/.test(d);
const validUrl = (u) => !u || /^https:\/\/[^\s]+\.[^\s]+/.test(u);

// ===== المناطق =====
function renderZones() {
  $('#zones').innerHTML = `
    <div class="zones-ed__head" aria-hidden="true"><span>المنطقة</span><span>السعر (₪)</span><span>المدة</span><span></span></div>
    ${s.shippingZones.map((z, i) => `
      <div class="zones-ed__row">
        <input data-z="${i}" data-k="name" value="${esc(z.name)}" placeholder="اسم المنطقة" aria-label="اسم المنطقة" maxlength="30">
        <input data-z="${i}" data-k="fee" type="number" min="0" value="${z.fee}" aria-label="سعر التوصيل">
        <input data-z="${i}" data-k="days" value="${esc(z.days)}" placeholder="2–4 أيام" aria-label="مدة التوصيل" maxlength="20">
        <button type="button" class="icon-btn" data-z-del="${i}" aria-label="احذف المنطقة" ${s.shippingZones.length < 2 ? 'disabled' : ''}>✕</button>
      </div>`).join('')}`;
}

function renderWeekend() {
  $('#weekend').innerHTML = DAYS.map((d, i) => `
    <label class="check"><input type="checkbox" name="weekend" value="${i}" ${s.weekend.includes(i) ? 'checked' : ''}> ${d}</label>`).join('');
}

function renderAnnouncement() {
  $('#annPreview').innerHTML = s.announcement
    ? `<span>بيبين هيك:</span><div class="announce-demo">${esc(s.announcement)}</div>`
    : '<span>الشريط مخفي</span>';
}

function waHint() {
  const d = normalizeWhatsapp(form.elements.whatsapp.value);
  $('#waHint').innerHTML = d && validWhatsapp(d)
    ? `بينحفظ هيك: <bdi dir="ltr">+${d}</bdi> — الزبونة بتفتح واتساب عليه مباشرة`
    : 'اكتبيه متل ما بتكتبيه عادي، وإحنا منحوّله للصيغة الدولية';
}

function fill() {
  form.elements.whatsapp.value = s.whatsapp;
  form.elements.instagram.value = s.instagram;
  form.elements.facebook.value = s.facebook;
  form.elements.deliveryMin.value = s.deliveryDays.min;
  form.elements.deliveryMax.value = s.deliveryDays.max;
  form.elements.freeShippingOver.value = s.freeShippingOver || '';
  form.elements.exchangeDays.value = s.exchangeDays;
  form.elements.announcement.value = s.announcement;
  renderZones();
  renderWeekend();
  renderAnnouncement();
  waHint();
}

// ===== الحفظ =====
function err(name, msg) {
  const el = form.elements[name]?.closest('.fld')?.querySelector('.fld__err');
  if (el) el.textContent = msg;
  return !!msg;
}

function collect() {
  const num = (n, d = 0) => (form.elements[n].value === '' ? d : Number(form.elements[n].value));
  return {
    ...s,
    whatsapp: normalizeWhatsapp(form.elements.whatsapp.value),
    instagram: form.elements.instagram.value.trim(),
    facebook: form.elements.facebook.value.trim(),
    deliveryDays: { min: num('deliveryMin', 1), max: num('deliveryMax', 1) },
    weekend: $$('[name="weekend"]:checked').map((i) => Number(i.value)),
    freeShippingOver: num('freeShippingOver', 0),
    exchangeDays: num('exchangeDays', 0),
    announcement: form.elements.announcement.value.trim(),
    shippingZones: s.shippingZones.map((z) => ({ ...z, name: z.name.trim(), fee: Number(z.fee) || 0, days: z.days.trim() })),
  };
}

function validate(next) {
  const bad = [
    err('whatsapp', validWhatsapp(next.whatsapp) ? '' : 'الرقم مش واضح — لازم يكون رقم جوال (مثلاً 0599123456)'),
    err('instagram', validUrl(next.instagram) ? '' : 'الرابط لازم يبلش بـ https://'),
    err('facebook', validUrl(next.facebook) ? '' : 'الرابط لازم يبلش بـ https://'),
    err('deliveryMax', next.deliveryDays.min > next.deliveryDays.max ? 'الحد الأعلى لازم يكون أكبر من الأقل' : ''),
  ];
  const zErr = next.shippingZones.some((z) => !z.name) ? 'كل منطقة لازم إلها اسم' : '';
  $('#zonesErr').textContent = zErr;
  bad.push(!!zErr);
  if (next.weekend.length > 5) { adminToast('لازم يضل يومين توصيل عالأقل'); bad.push(true); }
  return !bad.some(Boolean);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const next = collect();
  if (!validate(next)) { $('.fld__err:not(:empty)')?.closest('.ocard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  try {
    s = await saveSettings(next);
    dirty = false;
    $('#dirty').hidden = true;
    fill();
    adminToast('انحفظت الإعدادات ♡');
  } catch (er) { adminToast(er.message); }
});

// ===== الأحداث =====
form.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.z !== undefined) s.shippingZones[t.dataset.z][t.dataset.k] = t.value;
  if (t.name === 'announcement') { s.announcement = t.value.trim(); renderAnnouncement(); }
  if (t.name === 'whatsapp') waHint();
  markDirty();
});
form.addEventListener('change', markDirty);

form.addEventListener('click', (e) => {
  const del = e.target.closest('[data-z-del]');
  if (del) { s.shippingZones.splice(Number(del.dataset.zDel), 1); renderZones(); markDirty(); }
});

$('#addZone').addEventListener('click', () => {
  s.shippingZones.push({ id: `z${Date.now().toString(36)}`, name: '', fee: 20, days: '2–4 أيام' });
  renderZones();
  $$('#zones [data-k="name"]').at(-1).focus();
  markDirty();
});

$('#resetBtn').addEventListener('click', async () => {
  if (!confirm('بدك ترجّعي كل الإعدادات للقيم الأساسية؟')) return;
  s = await saveSettings(structuredClone(DEFAULT_STORE));
  fill();
  dirty = false;
  $('#dirty').hidden = true;
  adminToast('رجعت الإعدادات الأساسية');
});

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

s = await getSettings();
fill();
