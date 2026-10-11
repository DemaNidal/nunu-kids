// لوحة الأدمن: الرئيسية — ملخص المبيعات، رسم المبيعات اليومية، وشو بدّه انتباهك
import { $, $$, esc, money, img, sizeLabel, piecesLabel } from '../utils.js';
import { sizesOf, stockOf } from '../store/catalog.js';
import { listOrders, listProducts } from './api.js';
import { mountAdmin, setNavCount } from './layout.js';

mountAdmin('home');

const DAY = 24 * 3600 * 1000;
const SHORT_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']; // أسماء قصيرة تحت الأعمدة
const PERIODS = { today: { label: 'اليوم', days: 1 }, week: { label: '7 أيام', days: 7 }, month: { label: '30 يوم', days: 30 } };
const state = { orders: [], products: [], period: 'week' };
const findProduct = (id) => state.products.find((p) => p.id === Number(id));

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmt = (opts) => new Intl.DateTimeFormat('ar-u-nu-latn', opts);
const live = (o) => o.status !== 'cancelled';
const ordersLabel = (n) => (n === 1 ? 'طلب واحد' : n === 2 ? 'طلبين' : n <= 10 ? `${n} طلبات` : `${n} طلب`);

// الطلبات بين تاريخين [from, to)
const inRange = (from, to) => state.orders.filter((o) => { const t = new Date(o.createdAt); return t >= from && t < to; });

function periodRange(key, back = 0) {
  const days = PERIODS[key].days;
  const end = new Date(startOfDay(new Date()).getTime() + DAY - back * days * DAY);
  return [new Date(end.getTime() - days * DAY), end];
}

const summarize = (orders) => {
  const ok = orders.filter(live);
  const sales = ok.reduce((s, o) => s + o.total, 0);
  return {
    sales,
    count: ok.length,
    avg: ok.length ? Math.round(sales / ok.length) : 0,
    pieces: ok.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0),
  };
};

// ===== بطاقات الأرقام =====
function deltaHTML(now, before) {
  if (!before && !now) return '<span class="kpi__delta">ما في بيانات للمقارنة</span>';
  if (!before) return '<span class="kpi__delta up">جديد هالفترة</span>';
  const pct = Math.round(((now - before) / before) * 100);
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : '';
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
  return `<span class="kpi__delta ${cls}" title="مقارنة بالفترة اللي قبلها">${arrow} ${Math.abs(pct)}%</span>`;
}

function renderKpis() {
  const now = summarize(inRange(...periodRange(state.period)));
  const before = summarize(inRange(...periodRange(state.period, 1)));
  const cards = [
    { label: `المبيعات (${PERIODS[state.period].label})`, value: money(now.sales), d: deltaHTML(now.sales, before.sales), hero: true },
    { label: 'عدد الطلبات', value: now.count, d: deltaHTML(now.count, before.count) },
    { label: 'متوسط الطلب', value: money(now.avg), d: deltaHTML(now.avg, before.avg) },
    { label: 'القطع المباعة', value: now.pieces, d: deltaHTML(now.pieces, before.pieces) },
  ];
  $('#kpis').innerHTML = cards.map((c) => `
    <div class="kpi${c.hero ? ' kpi--hero' : ''}"><small>${c.label}</small><b>${c.value}</b>${c.d}${c.hero ? '<span class="kpi__vs">مقارنة بالفترة اللي قبلها</span>' : ''}</div>`).join('');
}

// ===== رسم المبيعات اليومية =====
// أعمدة رفيعة من خط أساس واحد، الأحدث عالشمال (اتجاه القراءة بالعربي)، والرقم بيبين بالمرور أو التركيز
function dailySeries() {
  const days = state.period === 'month' ? 30 : 7;
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, i) => {
    const from = new Date(today.getTime() - (days - 1 - i) * DAY);
    const list = inRange(from, new Date(from.getTime() + DAY)).filter(live);
    return { date: from, sales: list.reduce((s, o) => s + o.total, 0), count: list.length };
  });
}

const niceMax = (v) => {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / 2) * 2 * p;
};

function renderChart() {
  const data = dailySeries();
  const box = $('#salesChart');
  const W = box.clientWidth || 600;
  const H = 220;
  const pad = { top: 12, bottom: 26, left: 8, right: 52 }; // يمين: أرقام المحور
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.sales)));
  const band = plotW / data.length;
  const bw = Math.min(24, band * 0.6);
  const y = (v) => pad.top + plotH - (v / max) * plotH;
  // الأقدم يمين، الأحدث شمال
  const xCenter = (i) => pad.left + plotW - band * (i + 0.5);
  const ticks = [0, max / 2, max];
  const long = data.length > 7;

  const bars = data.map((d, i) => {
    const h = Math.max(0, plotH * (d.sales / max));
    const x = xCenter(i) - bw / 2;
    const top = pad.top + plotH - h;
    const r = Math.min(4, h);
    // طرف علوي مدوّر 4px، والقاعدة مربعة
    const shape = h ? `<path class="bar" d="M${x},${pad.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.top + plotH} Z"/>` : '';
    const label = long ? (i % 5 === 4 || i === data.length - 1 ? fmt({ day: 'numeric' }).format(d.date) : '') : SHORT_DAYS[d.date.getDay()];
    return `
      <g class="col" tabindex="0" data-i="${i}" aria-label="${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d.date)}: ${money(d.sales)}، ${ordersLabel(d.count)}">
        <rect class="hit" x="${xCenter(i) - band / 2}" y="${pad.top}" width="${band}" height="${plotH}"/>
        ${shape}
        ${label ? `<text class="xlab" x="${xCenter(i)}" y="${H - 6}" text-anchor="middle">${label}</text>` : ''}
      </g>`;
  }).join('');

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="المبيعات اليومية">
      <g class="grid">${ticks.map((t) => `
        <line x1="${pad.left}" x2="${pad.left + plotW}" y1="${y(t)}" y2="${y(t)}"/>
        <text x="${W - 4}" y="${y(t) + 4}" text-anchor="end">${t.toLocaleString('en')}</text>`).join('')}
      </g>
      ${bars}
    </svg>
    <div class="chart-tip" id="chartTip" hidden></div>`;

  const tip = $('#chartTip');
  const show = (g) => {
    const d = data[g.dataset.i];
    const top = d.sales ? y(d.sales) : pad.top + plotH;
    tip.innerHTML = `${fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(d.date)}<b>${money(d.sales)}</b>${d.count ? ordersLabel(d.count) : 'ما في طلبات'}`;
    tip.style.left = `${(xCenter(Number(g.dataset.i)) / W) * 100}%`;
    tip.style.top = `${top - 8}px`;
    tip.hidden = false;
  };
  $$('.col', box).forEach((g) => {
    g.addEventListener('mouseenter', () => show(g));
    g.addEventListener('focus', () => show(g));
    g.addEventListener('mouseleave', () => { tip.hidden = true; });
    g.addEventListener('blur', () => { tip.hidden = true; });
  });

  // نفس الأرقام كجدول (لقارئات الشاشة ولمين بدها الأرقام بالزبط)
  $('#salesTable').innerHTML = `
    <summary>عرض الأرقام كجدول</summary>
    <table><thead><tr><th>اليوم</th><th>الطلبات</th><th>المبيعات</th></tr></thead>
    <tbody>${[...data].reverse().map((d) => `<tr><td>${fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(d.date)}</td><td>${d.count}</td><td>${money(d.sales)}</td></tr>`).join('')}</tbody></table>`;
}

// ===== بدها انتباهك =====
function renderAttention() {
  const fresh = state.orders.filter((o) => o.status === 'new');
  const late = state.orders.filter((o) => o.status === 'shipped'
    && Date.now() - new Date(o.history.at(-1).at).getTime() > 3 * DAY);
  const rows = [
    ...fresh.slice(0, 5).map((o) => ({ o, why: 'جديد · بستنى تأكيدك' })),
    ...late.map((o) => ({ o, why: 'مع المندوب من أكتر من 3 أيام' })),
  ];
  setNavCount('orders', fresh.length);
  $('#attentionCount').textContent = fresh.length ? `${fresh.length} جديد` : '';
  $('#attention').innerHTML = rows.length
    ? `<ul class="mini">${rows.map(({ o, why }) => `
        <li><a href="orders.html#${o.id}"><span><b>${esc(o.customer.name)}</b><small>${o.id} · ${why}</small></span><span class="mini__val">${money(o.total)}</span></a></li>`).join('')}</ul>`
    : '<p class="panel-empty">كل الطلبات ماشية تمام ♡</p>';
}

// ===== قرّب يخلص =====
function renderLowStock() {
  const low = state.products.flatMap((p) => sizesOf(p)
    .filter((s) => stockOf(p, s) <= 2)
    .map((s) => ({ p, s, n: stockOf(p, s) })))
    .sort((a, b) => a.n - b.n)
    .slice(0, 6);
  $('#lowStock').innerHTML = low.length
    ? `<ul class="mini">${low.map(({ p, s, n }) => `
        <li><div class="top-item"><img src="${img(p.images[0], 80)}" alt=""><span><b>${esc(p.name)}</b><small>${sizeLabel(s)}</small></span><span class="mini__val low">${n ? `باقي ${n}` : 'خلص'}</span></div></li>`).join('')}</ul>`
    : '<p class="panel-empty">المخزون منيح بكل المقاسات</p>';
}

// ===== الأكثر مبيعاً + المناطق =====
function renderTop() {
  const orders = inRange(...periodRange(state.period)).filter(live);
  const qty = {};
  orders.forEach((o) => o.items.forEach((i) => { qty[i.id] = (qty[i.id] || 0) + i.qty; }));
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top[0]?.[1] || 1;
  $('#topProducts').innerHTML = top.length
    ? `<ul class="mini">${top.map(([id, n]) => {
        const p = findProduct(id);
        return `<li><div class="top-item">${p ? `<img src="${img(p.images[0], 80)}" alt="">` : '<span></span>'}<span><b>${esc(p?.name || id)}</b><div class="hbar-track"><div class="hbar" style="width:${(n / max) * 100}%"></div></div></span><span class="mini__val">${piecesLabel(n)}</span></div></li>`;
      }).join('')}</ul>`
    : '<p class="panel-empty">ما في مبيعات بهاي الفترة</p>';

  const zones = {};
  orders.forEach((o) => { zones[o.customer.zone] = (zones[o.customer.zone] || 0) + 1; });
  const zList = Object.entries(zones).sort((a, b) => b[1] - a[1]);
  const zMax = zList[0]?.[1] || 1;
  $('#zones').innerHTML = zList.length
    ? `<ul class="mini">${zList.map(([z, n]) => `
        <li><div><span><b>${esc(z)}</b><div class="hbar-track"><div class="hbar" style="width:${(n / zMax) * 100}%"></div></div></span><span class="mini__val">${ordersLabel(n)}</span></div></li>`).join('')}</ul>`
    : '<p class="panel-empty">ما في طلبات بهاي الفترة</p>';
}

function renderAll() {
  $$('#period button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.period === state.period));
  $('#chartTitle').textContent = state.period === 'month' ? 'المبيعات اليومية (آخر 30 يوم)' : 'المبيعات اليومية (آخر 7 أيام)';
  renderKpis();
  renderChart();
  renderAttention();
  renderLowStock();
  renderTop();
}

// ===== التشغيل =====
$('#period').innerHTML = Object.entries(PERIODS).map(([k, p]) => `<button type="button" data-period="${k}">${p.label}</button>`).join('');
$('#period').addEventListener('click', (e) => {
  const b = e.target.closest('[data-period]');
  if (!b) return;
  state.period = b.dataset.period;
  renderAll();
});
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderChart, 150); });

$('#today').textContent = fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
[state.orders, state.products] = await Promise.all([listOrders(), listProducts()]);
renderAll();
