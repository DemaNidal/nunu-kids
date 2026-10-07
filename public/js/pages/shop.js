// صفحة كل المنتجات: أقسام + فلاتر + ترتيب + بحث، وكلها محفوظة بالرابط
import { CATEGORIES } from '../config.js';
import { $, $$, esc, sizeLabel, piecesLabel } from '../utils.js';
import { liveOffers } from '../store/pricing.js';
import { filterProducts, sortProducts, allSizes, allColors, PRICE_RANGES, SORTS } from '../store/search.js';
import { mountLayout } from '../ui/layout.js';
import { productGrid } from '../ui/components.js';

mountLayout();

const TABS = { all: 'الكل', ...CATEGORIES };

// ===== الحالة ⇄ الرابط =====
function readURL() {
  const p = new URLSearchParams(location.search);
  return {
    cat: TABS[p.get('cat')] ? p.get('cat') : 'all',
    sizes: new Set(p.getAll('size')),
    colors: new Set(p.getAll('color')),
    price: p.get('price') || '',
    sale: p.get('sale') === '1',
    stock: p.get('stock') === '1',
    sort: SORTS[p.get('sort')] ? p.get('sort') : 'featured',
    q: p.get('q') || '',
  };
}

function writeURL() {
  const p = new URLSearchParams();
  if (state.cat !== 'all') p.set('cat', state.cat);
  state.sizes.forEach((s) => p.append('size', s));
  state.colors.forEach((c) => p.append('color', c));
  if (state.price) p.set('price', state.price);
  if (state.sale) p.set('sale', '1');
  if (state.stock) p.set('stock', '1');
  if (state.sort !== 'featured') p.set('sort', state.sort);
  if (state.q) p.set('q', state.q);
  history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
}

const state = readURL();

// عدد المنتجات لو اخترنا هاد الخيار لحاله بمجموعته (مع باقي الفلاتر)
const countWith = (patch) => filterProducts({ ...state, ...patch }).length;

// ===== التبويبات =====
function renderTabs() {
  $('#tabs').innerHTML = Object.entries(TABS).map(([key, name]) => `
    <button type="button" role="tab" class="shop-tab" data-cat="${key}" aria-selected="${state.cat === key}">
      ${esc(name)} <small>${countWith({ cat: key })}</small>
    </button>`).join('');
}

// ===== مجموعات الفلاتر =====
const checkbox = (group, value, label, checked, count, extra = '') => `
  <label class="check ${count ? '' : 'is-empty'}">
    <input type="checkbox" data-filter="${group}" value="${esc(value)}" ${checked ? 'checked' : ''}>
    ${extra}<span>${label}</span><small>${count}</small>
  </label>`;

function renderFilters() {
  const groups = [];

  groups.push(`
    <fieldset class="fgroup"><legend>العمر</legend>
      ${allSizes().map((s) => checkbox('sizes', s, sizeLabel(s), state.sizes.has(s),
        countWith({ sizes: new Set([s]) }))).join('')}
    </fieldset>`);

  groups.push(`
    <fieldset class="fgroup"><legend>اللون</legend>
      ${allColors().map((c) => checkbox('colors', c.name, esc(c.name), state.colors.has(c.name),
        countWith({ colors: new Set([c.name]) }), `<i class="dot" style="--c:${c.hex}"></i>`)).join('')}
    </fieldset>`);

  groups.push(`
    <fieldset class="fgroup"><legend>السعر</legend>
      ${PRICE_RANGES.map((r) => `
        <label class="check">
          <input type="radio" name="price" data-filter="price" value="${r.id}" ${state.price === r.id ? 'checked' : ''}>
          <span>${r.label}</span><small>${countWith({ price: r.id })}</small>
        </label>`).join('')}
    </fieldset>`);

  groups.push(`
    <fieldset class="fgroup"><legend>أكثر</legend>
      ${liveOffers().length ? checkbox('sale', '1', 'عليها عرض', state.sale, countWith({ sale: true })) : ''}
      ${checkbox('stock', '1', 'المتوفر بس', state.stock, countWith({ stock: true }))}
    </fieldset>`);

  $('#filterGroups').innerHTML = groups.join('');
}

// ===== الفلاتر المختارة (بتنشال بكبسة) =====
function activeChips() {
  const chips = [];
  if (state.q) chips.push(['q', '', `بحث: "${esc(state.q)}"`]);
  state.sizes.forEach((s) => chips.push(['sizes', s, sizeLabel(s)]));
  state.colors.forEach((c) => chips.push(['colors', c, esc(c)]));
  if (state.price) chips.push(['price', '', PRICE_RANGES.find((r) => r.id === state.price)?.label]);
  if (state.sale) chips.push(['sale', '', 'عليها عرض']);
  if (state.stock) chips.push(['stock', '', 'المتوفر بس']);
  return chips;
}

function renderActive() {
  const chips = activeChips();
  $('#activeFilters').innerHTML = chips.length ? `
    ${chips.map(([key, value, label]) => `<button type="button" class="chip" data-remove="${key}" data-value="${esc(value)}">${label} ✕</button>`).join('')}
    <button type="button" class="link-btn" data-clear>امسحي الكل</button>` : '';
  const badge = $('#filterCount');
  badge.textContent = chips.length;
  badge.hidden = !chips.length;
}

// ===== النتائج =====
function renderResults() {
  const list = sortProducts(filterProducts(state), state.sort);
  $('#resultCount').textContent = piecesLabel(list.length);
  $('#showResults').textContent = `عرض النتائج (${list.length})`;
  $('#grid').innerHTML = list.length ? productGrid(list) : `
    <div class="empty-state">
      <p>ما لقينا قطع بهالاختيارات.<br>جربي تشيلي فلتر أو اختاري عمر ثاني.</p>
      <button type="button" class="btn btn--primary" data-clear>امسحي الفلاتر</button>
    </div>`;

  const title = state.q ? `نتائج البحث` : TABS[state.cat] === 'الكل' ? 'كل المنتجات' : TABS[state.cat];
  $('#shopTitle').textContent = title;
  $('#crumbTitle').textContent = title;
  document.title = `${title} | NUNU KIDS`;
}

function render() {
  writeURL();
  renderTabs();
  renderFilters();
  renderActive();
  renderResults();
}

// ===== التفاعل =====
function onFilterChange(e) {
  const input = e.target.closest('[data-filter]');
  if (!input) return;
  const { filter } = input.dataset;
  if (filter === 'sizes' || filter === 'colors') {
    input.checked ? state[filter].add(input.value) : state[filter].delete(input.value);
  } else if (filter === 'price') {
    state.price = input.value;
  } else {
    state[filter] = input.checked;
  }
  render();
}

function removeFilter(key, value) {
  if (key === 'sizes' || key === 'colors') state[key].delete(value);
  else if (key === 'q' || key === 'price') state[key] = '';
  else state[key] = false;
}

function clearAll() {
  Object.assign(state, { sizes: new Set(), colors: new Set(), price: '', sale: false, stock: false, q: '' });
}

const openFilters = (open) => {
  $('#filters').classList.toggle('open', open);
  $('#filtersOverlay').classList.toggle('show', open);
  document.body.classList.toggle('no-scroll', open);
};

$('#filterGroups').addEventListener('change', onFilterChange);
$('#sort').value = state.sort;
$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
$('#openFilters').addEventListener('click', () => openFilters(true));
$$('[data-close-filters]').forEach((el) => el.addEventListener('click', () => openFilters(false)));

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-cat]');
  if (tab) { state.cat = tab.dataset.cat; render(); return; }
  const chip = e.target.closest('[data-remove]');
  if (chip) { removeFilter(chip.dataset.remove, chip.dataset.value); render(); return; }
  if (e.target.closest('[data-clear]')) { clearAll(); render(); }
});

// خانة البحث بالهيدر بتعبي نص البحث الحالي
$$('.search input').forEach((i) => { i.value = state.q; });

render();
