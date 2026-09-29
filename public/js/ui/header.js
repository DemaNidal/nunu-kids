// شريط الإعلانات + الهيدر + القائمة
import { STORE } from '../config.js';
import { $, $$, esc, money } from '../utils.js';
import { liveOffers } from '../store/pricing.js';
import { icon } from './icons.js';

const NAV_LINKS = [
  { href: 'index.html#new', text: 'وصل حديثاً' },
  { href: 'index.html#ages', text: 'حسب العمر' },
  { href: 'index.html#bundles', text: 'بكجات تجهيز البيبي' },
  { href: 'index.html#types', text: 'ملابس داخلية' },
  { href: 'index.html#types', text: 'أواعي' },
  { href: 'index.html#types', text: 'مستلزمات البيبي' },
];

// رسائل ثابتة + عناوين العروض الفعّالة
export const promoMessages = () => [
  ...(STORE.freeShippingOver ? [`توصيل مجاني للطلبات فوق ${money(STORE.freeShippingOver)}`] : []),
  'الدفع نقداً عند الاستلام',
  ...liveOffers().map((o) => o.title),
];

export function headerHTML() {
  const hasOffers = liveOffers().length > 0;
  return `
    <div class="announce" aria-live="polite"><span id="announceText"></span></div>
    <header class="header">
      <div class="container header__row">
        <button class="icon-btn only-mobile" id="menuBtn" aria-label="القائمة">${icon('menu')}</button>
        <a href="index.html" class="logo" aria-label="${STORE.name} الرئيسية"><img src="assets/logo.png" alt="${STORE.name}"></a>
        <form class="search only-desktop" role="search" onsubmit="return false">
          ${icon('search')}
          <input type="search" placeholder="دوّري على بدلة، طاقية، بكج...">
        </form>
        <div class="header__actions">
          <a href="#" class="track-link only-desktop">${icon('truck')} تتبع طلبي</a>
          <button class="icon-btn cart-btn" id="cartBtn" aria-label="السلة">
            ${icon('bag')}<span class="cart-count" id="cartCount">0</span>
          </button>
        </div>
      </div>
      <nav class="nav" id="nav">
        <div class="container nav__row">
          ${NAV_LINKS.map((l) => `<a href="${l.href}">${esc(l.text)}</a>`).join('')}
          ${hasOffers ? '<a href="index.html#offers" class="nav__sale">العروض</a>' : ''}
          <a href="#" class="only-mobile">تتبع طلبي</a>
        </div>
      </nav>
    </header>`;
}

export function initHeader() {
  const nav = $('#nav');
  $('#menuBtn').addEventListener('click', () => nav.classList.toggle('open'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  rotateAnnouncements();
}

function rotateAnnouncements() {
  const el = $('#announceText');
  const messages = promoMessages();
  let i = 0;
  el.textContent = messages[0];
  if (messages.length < 2) return;
  setInterval(() => {
    el.style.opacity = 0;
    setTimeout(() => {
      i = (i + 1) % messages.length;
      el.textContent = messages[i];
      el.style.opacity = 1;
    }, 400);
  }, 4000);
}
