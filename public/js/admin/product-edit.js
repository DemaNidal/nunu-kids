// لوحة الأدمن: إضافة / تعديل منتج (وبكج)
import { $, $$, esc, money, img, sizeLabel, queryParam, piecesLabel } from '../utils.js';
import { CATEGORIES, SIZES } from '../config.js';
import { listProducts, getProduct, saveProduct, deleteProduct } from './api.js';
import { mountAdmin, adminToast } from './layout.js';

mountAdmin('products');

const form = $('#pform');
const EMPTY = { name: '', category: 'clothes', price: '', description: '', material: '', images: [], stock: {}, colors: [], items: [], isNew: true, visible: true, featured: false };
let draft = structuredClone(EMPTY);
let allProducts = [];
let dirty = false;

const isBundle = () => draft.category === 'bundles';
const markDirty = () => { dirty = true; $('#dirty').hidden = false; };

// ===== الصور =====
// الصورة بتتصغّر لـ 1000px قبل ما تنحفظ (عشان ما تكون تقيلة). لاحقاً بترفع على Cloudinary.
function resizeImage(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, max / Math.max(im.width, im.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(im.width * scale);
      canvas.height = Math.round(im.height * scale);
      canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    im.onerror = () => reject(new Error('ما قدرنا نقرأ الصورة'));
    im.src = url;
  });
}

function renderImages() {
  $('#images').innerHTML = draft.images.map((src, i) => `
    <figure class="pimg${i === 0 ? ' pimg--main' : ''}">
      <img src="${img(src, 300)}" alt="">
      ${i === 0 ? '<figcaption>الرئيسية</figcaption>' : ''}
      <div class="pimg__tools">
        ${i > 0 ? `<button type="button" data-img-move="${i}" data-d="-1" aria-label="قدّم الصورة">›</button>` : ''}
        ${i < draft.images.length - 1 ? `<button type="button" data-img-move="${i}" data-d="1" aria-label="أخّر الصورة">‹</button>` : ''}
        <button type="button" data-img-del="${i}" aria-label="احذف الصورة">✕</button>
      </div>
    </figure>`).join('');
}

// ===== المقاسات =====
function renderSizes() {
  $('#sizes').innerHTML = Object.keys(SIZES).map((s) => {
    const on = s in draft.stock;
    return `
      <label class="psize${on ? ' on' : ''}">
        <input type="checkbox" data-size-on="${s}" ${on ? 'checked' : ''}>
        <span class="psize__name">${s === 'one' ? 'مقاس واحد' : sizeLabel(s)}</span>
        <input type="number" min="0" step="1" inputmode="numeric" data-size-qty="${s}" value="${on ? draft.stock[s] : ''}" ${on ? '' : 'disabled'} aria-label="الكمية من ${s === 'one' ? 'مقاس واحد' : s}" placeholder="الكمية">
      </label>`;
  }).join('');
}

// ===== الألوان =====
function renderColors() {
  $('#colors').innerHTML = draft.colors.map((c, i) => `
    <div class="pcolor">
      <input type="color" value="${esc(c.hex)}" data-color-hex="${i}" aria-label="اللون">
      <input type="text" value="${esc(c.name)}" data-color-name="${i}" placeholder="اسم اللون (مثلاً: وردي)" maxlength="20">
      <button type="button" class="icon-btn" data-color-del="${i}" aria-label="احذف اللون">✕</button>
    </div>`).join('') || '<p class="muted-note">بدون ألوان (مثلاً القطعة بلون واحد)</p>';
}

// ===== قطع البكج =====
const pieceOptions = (selected) => allProducts
  .filter((p) => p.category !== 'bundles')
  .map((p) => `<option value="${p.id}" ${Number(selected) === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

function renderBundle() {
  $('#bundleCard').hidden = !isBundle();
  $('#colorsCard').hidden = isBundle();
  $('#featuredRow').hidden = !isBundle();
  if (!isBundle()) return;
  $('#bundleItems').innerHTML = draft.items.map((it, i) => `
    <div class="pbitem">
      <select data-bi-id="${i}" aria-label="القطعة">
        <option value="">قطعة مش موجودة بالمتجر…</option>
        ${pieceOptions(it.id)}
      </select>
      ${it.id ? '' : `<input type="text" data-bi-name="${i}" value="${esc(it.name || '')}" placeholder="اسم القطعة" maxlength="40">`}
      <input type="number" min="1" step="1" data-bi-qty="${i}" value="${it.qty}" aria-label="العدد">
      <button type="button" class="icon-btn" data-bi-del="${i}" aria-label="احذف القطعة">✕</button>
    </div>`).join('') || '<p class="muted-note">ضيفي القطع اللي جوا البكج</p>';

  const count = draft.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const worth = draft.items.reduce((s, it) => s + (allProducts.find((p) => p.id === Number(it.id))?.price || 0) * (Number(it.qty) || 0), 0);
  const price = Number(draft.price) || 0;
  $('#bundleSum').innerHTML = count
    ? `${piecesLabel(count)}${worth ? ` · سعرهم لحال <b>${money(worth)}</b>${price && worth > price ? ` · الزبونة بتوفّر <b>${money(worth - price)}</b>` : ''}` : ''}`
    : '';
}

// ===== المعاينة =====
function renderPreview() {
  const cover = draft.images[0];
  const total = Object.values(draft.stock).reduce((s, n) => s + (Number(n) || 0), 0);
  $('#preview').innerHTML = `
    <h2 class="ocard__title">معاينة بالمتجر</h2>
    <div class="pprev">
      <span class="pprev__img">${cover ? `<img src="${img(cover, 400)}" alt="">` : '<span>بدون صورة</span>'}${draft.isNew ? '<em>جديد</em>' : ''}</span>
      <b>${esc(draft.name) || 'اسم المنتج'}</b>
      <span>${draft.price ? money(draft.price) : '— ₪'}</span>
    </div>
    <p class="muted-note">${total ? `${total} قطعة بالمخزن` : 'ما في كمية بالمخزن'}${draft.visible ? '' : ' · مخفي من المتجر'}</p>`;
}

function renderAll() {
  renderImages();
  renderSizes();
  renderColors();
  renderBundle();
  renderPreview();
}

// ===== تعبئة النموذج =====
function fillForm() {
  $('#category').innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  ['name', 'category', 'price', 'description', 'material'].forEach((k) => { form.elements[k].value = draft[k] ?? ''; });
  form.elements.visible.checked = draft.visible !== false;
  form.elements.isNew.checked = !!draft.isNew;
  form.elements.featured.checked = !!draft.featured;
}

// ===== التحقق =====
function setErr(el, msg) { el.textContent = msg; return !!msg; }

function validate() {
  const errs = [
    setErr(form.elements.name.closest('.fld').querySelector('.fld__err'), draft.name.trim().length < 2 ? 'اكتبي اسم المنتج' : ''),
    setErr(form.elements.price.closest('.fld').querySelector('.fld__err'), !(Number(draft.price) > 0) ? 'اكتبي السعر' : ''),
    setErr($('#imagesErr'), draft.images.length ? '' : 'ضيفي صورة وحدة عالأقل'),
    setErr($('#sizesErr'), Object.keys(draft.stock).length ? '' : 'اختاري مقاس واحد عالأقل'),
  ];
  if (isBundle() && !draft.items.length) { adminToast('ضيفي القطع اللي جوا البكج'); errs.push(true); }
  return !errs.some(Boolean);
}

// ===== الحفظ =====
function cleaned() {
  const p = {
    ...draft,
    name: draft.name.trim(),
    price: Number(draft.price),
    description: draft.description.trim(),
    material: draft.material.trim(),
    stock: Object.fromEntries(Object.entries(draft.stock).map(([s, n]) => [s, Math.max(0, Number(n) || 0)])),
    colors: isBundle() ? [] : draft.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex })),
  };
  if (isBundle()) p.items = draft.items.map((it) => (it.id ? { id: Number(it.id), qty: Number(it.qty) || 1 } : { name: (it.name || '').trim(), qty: Number(it.qty) || 1 })).filter((it) => it.id || it.name);
  else { delete p.items; delete p.featured; }
  if (!p.material) delete p.material;
  return p;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) { $('.fld__err:not(:empty)')?.closest('.ocard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  try {
    const saved = await saveProduct(cleaned());
    draft = structuredClone(saved);
    dirty = false;
    $('#dirty').hidden = true;
    history.replaceState(null, '', `?id=${saved.id}`);
    setHeader();
    adminToast('انحفظ المنتج ♡');
  } catch (err) {
    adminToast(err.message);
  }
});

$('#deleteBtn').addEventListener('click', async () => {
  if (!confirm(`أكيد بدك تحذفي "${draft.name}"؟ ما في رجعة.\n(إذا بدك تخبيه بس، شيلي "ظاهر بالمتجر")`)) return;
  await deleteProduct(draft.id);
  dirty = false;
  location.href = 'products.html';
});

// ===== الأحداث =====
form.addEventListener('input', (e) => {
  const t = e.target;
  if (t.name in EMPTY && t.type !== 'checkbox') draft[t.name] = t.value;
  if (t.dataset.sizeQty) draft.stock[t.dataset.sizeQty] = t.value;
  if (t.dataset.colorName !== undefined) draft.colors[t.dataset.colorName].name = t.value;
  if (t.dataset.colorHex !== undefined) draft.colors[t.dataset.colorHex].hex = t.value;
  if (t.dataset.biName !== undefined) draft.items[t.dataset.biName].name = t.value;
  if (t.dataset.biQty !== undefined) { draft.items[t.dataset.biQty].qty = t.value; renderBundle(); restoreFocus(t); }
  markDirty();
  renderPreview();
  if (t.name === 'price') renderBundle();
});

// بعد إعادة الرسم، ارجعي للخانة اللي كنتي فيها
function restoreFocus(t) {
  const sel = [...t.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}="${a.value}"]`).join('');
  const el = sel && form.querySelector(sel);
  if (el) { el.focus(); if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); }
}

form.addEventListener('change', (e) => {
  const t = e.target;
  if (t.type === 'checkbox' && t.name in EMPTY) { draft[t.name] = t.checked; markDirty(); renderPreview(); }
  if (t.name === 'category') { draft.category = t.value; if (isBundle() && !draft.items.length) draft.items = [{ id: '', name: '', qty: 1 }]; renderBundle(); }
  if (t.dataset.sizeOn) {
    const s = t.dataset.sizeOn;
    if (t.checked) {
      // "مقاس واحد" ما بيجتمع مع مقاسات الأعمار
      if (s === 'one') draft.stock = {};
      else delete draft.stock.one;
      draft.stock[s] = draft.stock[s] ?? 0;
    } else delete draft.stock[s];
    renderSizes();
    if (t.checked) $(`[data-size-qty="${s}"]`).focus();
    markDirty();
    renderPreview();
  }
  if (t.dataset.biId !== undefined) {
    const it = draft.items[t.dataset.biId];
    it.id = t.value ? Number(t.value) : '';
    if (it.id) delete it.name;
    renderBundle();
    markDirty();
  }
});

form.addEventListener('click', (e) => {
  const move = e.target.closest('[data-img-move]');
  if (move) {
    const i = Number(move.dataset.imgMove); const j = i + Number(move.dataset.d);
    [draft.images[i], draft.images[j]] = [draft.images[j], draft.images[i]];
    renderImages(); renderPreview(); markDirty();
    return;
  }
  const del = e.target.closest('[data-img-del]');
  if (del) { draft.images.splice(Number(del.dataset.imgDel), 1); renderImages(); renderPreview(); markDirty(); return; }
  const cdel = e.target.closest('[data-color-del]');
  if (cdel) { draft.colors.splice(Number(cdel.dataset.colorDel), 1); renderColors(); markDirty(); return; }
  const bdel = e.target.closest('[data-bi-del]');
  if (bdel) { draft.items.splice(Number(bdel.dataset.biDel), 1); renderBundle(); markDirty(); }
});

$('#addColor').addEventListener('click', () => { draft.colors.push({ name: '', hex: '#E5D0C7' }); renderColors(); $$('[data-color-name]').at(-1).focus(); markDirty(); });
$('#addBundleItem').addEventListener('click', () => { draft.items.push({ id: '', name: '', qty: 1 }); renderBundle(); markDirty(); });

$('#imageInput').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  for (const f of files) {
    try { draft.images.push(await resizeImage(f)); } catch (err) { adminToast(err.message); }
  }
  renderImages(); renderPreview(); markDirty();
  $('#imagesErr').textContent = '';
});

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// ===== التشغيل =====
function setHeader() {
  const editing = !!draft.id;
  $('#formTitle').textContent = editing ? draft.name : 'إضافة منتج';
  $('#formEyebrow').textContent = editing ? `تعديل · ${CATEGORIES[draft.category]}` : 'منتج جديد';
  document.title = `${editing ? draft.name : 'منتج جديد'} | لوحة تحكم NUNU KIDS`;
  $('#deleteBtn').hidden = !editing;
  $('#viewInShop').hidden = !editing;
  $('#viewInShop').href = `../product.html?id=${draft.id}`;
}

allProducts = await listProducts();
const id = queryParam('id');
if (id) {
  const p = await getProduct(id);
  if (p) draft = { ...structuredClone(EMPTY), ...structuredClone(p), items: structuredClone(p.items || []) };
  else adminToast('المنتج مش موجود — عم تضيفي منتج جديد');
}
fillForm();
setHeader();
renderAll();
