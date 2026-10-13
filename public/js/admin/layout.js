// هيكل لوحة الأدمن: قائمة جانبية على الكمبيوتر، وشريط علوي + قائمة منسدلة على الجوال
import { $, esc } from '../utils.js';
import { icon } from '../ui/icons.js';
import { me, logout } from './api.js';

const NAV = [
  { key: 'home', href: 'index.html', icon: 'chart', text: 'الرئيسية' },
  { key: 'orders', href: 'orders.html', icon: 'list', text: 'الطلبات' },
  { key: 'products', href: 'products.html', icon: 'box', text: 'المنتجات' },
  { key: 'offers', href: 'offers.html', icon: 'tag', text: 'العروض والكوبونات' },
  { key: 'settings', href: 'settings.html', icon: 'gear', text: 'إعدادات المتجر' },
  { key: 'backups', href: 'backups.html', icon: 'cloud', text: 'النسخ الاحتياطية' },
];

const navHTML = (active) => NAV.map((n) => n.soon
  ? `<span class="adm-nav__item is-soon">${icon(n.icon)}<span>${esc(n.text)}</span><small>قريباً</small></span>`
  : `<a href="${n.href}" class="adm-nav__item${n.key === active ? ' is-active' : ''}"${n.key === active ? ' aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(n.text)}</span><b class="adm-nav__count" data-count="${n.key}" hidden></b></a>`,
).join('');

export function mountAdmin(active) {
  document.body.insertAdjacentHTML('afterbegin', `
    <aside class="adm-side" id="admSide">
      <a href="index.html" class="adm-logo"><img src="../assets/logo.png" alt="NUNU KIDS"><span>لوحة التحكم</span></a>
      <nav class="adm-nav" aria-label="أقسام لوحة التحكم">${navHTML(active)}</nav>
      <div class="adm-side__foot">
        <a href="../index.html" class="adm-nav__item" target="_blank" rel="noopener">${icon('store')}<span>عرض المتجر</span></a>
        <button type="button" class="adm-nav__item adm-nav__btn" id="logoutBtn">${icon('logout')}<span>تسجيل الخروج</span><small id="admUser"></small></button>
      </div>
    </aside>
    <header class="adm-bar">
      <button class="icon-btn" id="admMenu" aria-label="القائمة" aria-expanded="false" aria-controls="admSide">${icon('list')}</button>
      <img src="../assets/logo-wordmark.webp" alt="NUNU KIDS" class="adm-bar__logo">
      <span class="adm-bar__tag">أدمن</span>
    </header>
    <div class="adm-scrim" id="admScrim"></div>`);

  const side = $('#admSide');
  const btn = $('#admMenu');
  const setOpen = (open) => {
    side.classList.toggle('open', open);
    $('#admScrim').classList.toggle('show', open);
    btn.setAttribute('aria-expanded', open);
  };
  btn.addEventListener('click', () => setOpen(!side.classList.contains('open')));

  // مين مسجّلة دخول (وإذا الجلسة خلصت، api.js بيرجّعنا لصفحة الدخول)
  me().then((u) => { $('#admUser').textContent = u.username; });
  $('#logoutBtn').addEventListener('click', async () => {
    await logout().catch(() => {});
    location.href = 'login.html';
  });
  $('#admScrim').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

// رقم صغير جنب اسم القسم بالقائمة (مثلاً عدد الطلبات الجديدة)
export function setNavCount(key, n) {
  const el = document.querySelector(`[data-count="${key}"]`);
  if (!el) return;
  el.textContent = n;
  el.hidden = !n;
}

export function adminToast(text) {
  let el = $('#admToast');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div class="adm-toast" id="admToast" role="status"></div>');
    el = $('#admToast');
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove('show'), 2600);
}
