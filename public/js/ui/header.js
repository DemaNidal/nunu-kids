// الشريط اللي فوق + الهيدر + القائمة
import { STORE } from '../config.js';
import { $, $$, esc } from '../utils.js';
import { liveOffers } from '../store/pricing.js';
import { icon } from './icons.js';

const NAV_LINKS = [
  { href: 'index.html', text: 'الرئيسية' },
  { href: 'shop.html', text: 'كل المنتجات' },
  { href: 'shop.html?sort=new', text: 'وصل حديثاً' },
  { href: 'shop.html?cat=bundles', text: 'بكجات تجهيز البيبي' },
  { href: 'shop.html?cat=underwear', text: 'ملابس داخلية' },
  { href: 'shop.html?cat=clothes', text: 'أواعي' },
  { href: 'shop.html?cat=accessories', text: 'مستلزمات البيبي' },
];


// الرابط اللي بيطابق الصفحة الحالية (نفس الملف ونفس الفلاتر) بيتعلّم
const isCurrent = (href) => {
  const url = new URL(href, location.href);
  const here = location.pathname.endsWith('/') ? `${location.pathname}index.html` : location.pathname;
  return url.pathname === here && url.search === location.search;
};

// نفس خانة البحث: بالهيدر على الكمبيوتر، وجوا القائمة على الموبايل
const searchForm = (cls) => `
  <form class="search ${cls}" role="search" action="shop.html" method="get">
    ${icon('search')}
    <input type="search" name="q" placeholder="دوّري على بدلة، طاقية، بكج..." aria-label="بحث" required>
  </form>`;

export function headerHTML() {
  const hasOffers = liveOffers().length > 0;
  return `
    ${STORE.announcement ? `<div class="announce">${esc(STORE.announcement)}</div>` : ''}
    <header class="header">
      <div class="container header__row">
        <button class="icon-btn only-mobile" id="menuBtn" aria-label="القائمة والبحث" aria-expanded="false" aria-controls="nav">${icon('menuSearch')}</button>
        <a href="index.html" class="logo" aria-label="${STORE.name} الرئيسية">
          <picture>
            <source media="(max-width: 859px)" srcset="assets/logo-wordmark.webp">
            <img src="assets/logo.png" alt="${STORE.name}">
          </picture>
        </a>
        ${searchForm('only-desktop')}
        <div class="header__actions">
          <a href="track.html" class="track-link only-desktop"${isCurrent('track.html') ? ' aria-current="page"' : ''}>${icon('truck')} تتبع طلبي</a>
          <a href="favorites.html" class="icon-btn badge-btn" aria-label="المفضلة">
            ${icon('heart')}<span class="count-badge" id="favCount" hidden>0</span>
          </a>
          <button class="icon-btn badge-btn" id="cartBtn" aria-label="السلة">
            ${icon('bag')}<span class="count-badge" id="cartCount">0</span>
          </button>
        </div>
      </div>
      <nav class="nav" id="nav">
        <div class="container nav__row">
          ${searchForm('search--menu only-mobile')}
          ${NAV_LINKS.map((l) => `<a href="${l.href}"${isCurrent(l.href) ? ' aria-current="page"' : ''}>${esc(l.text)}</a>`).join('')}
          ${hasOffers ? '<a href="shop.html?sale=1" class="nav__sale">العروض</a>' : ''}
          <a href="track.html" class="only-mobile"${isCurrent('track.html') ? ' aria-current="page"' : ''}>تتبع طلبي</a>
        </div>
      </nav>
    </header>`;
}

export function initHeader() {
  const nav = $('#nav');
  const btn = $('#menuBtn');
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.innerHTML = icon(open ? 'x' : 'menuSearch');
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false); });
  compactOnScroll();
}

// الهيدر بيصغر شوي لما تنزلي (بفرق بين النزول والطلوع عشان ما يرجف عند الحد)
function compactOnScroll() {
  const header = $('.header');
  const update = () => {
    const y = window.scrollY;
    if (y > 80) header.classList.add('header--compact');
    else if (y < 20) header.classList.remove('header--compact');
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}
