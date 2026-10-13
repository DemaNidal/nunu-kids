// الصفحة الرئيسية — أجزاء العروض بتظهر بس إذا في عرض فعّال
import { $, esc, img, srcset, ltr, money, piecesLabel, daysLabel, exchangeText } from '../utils.js';
import { STORE, SIZES, CATEGORIES } from '../config.js';
import { HERO, AGE_GROUPS, REVIEWS } from '../data/content.js';
import { items, bundles, bundleItems, bundleCount } from '../store/catalog.js';
import { liveOffers } from '../store/pricing.js';
import { cart } from '../store/cart.js';
import { behavior } from '../store/behavior.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { icon } from '../ui/icons.js';
import { productGrid, productUrl, priceTag } from '../ui/components.js';

mountLayout();

// ===== البانر الرئيسي: الشعار + نص، صورة الأواعي الكبيرة، وتحت كروت الأقسام =====
function renderHero() {
  $('#heroInner').innerHTML = `
    <div class="hero__text">
      <img class="hero__logo" src="assets/logo.png" alt="" width="150" height="90">
      <h1>${esc(HERO.title).replace('\n', '<br>')}</h1>
      <p>${esc(HERO.text)}</p>
      <a href="${HERO.cta.href}" class="btn btn--primary hero__btn">${esc(HERO.cta.label)}</a>
    </div>
    <div class="hero__photo">
      <img src="${HERO.image}" alt="لفّة مولود مع طاقية بلون أخضر ناعم" width="1100" height="968" fetchpriority="high">
    </div>`;
  $('#heroCats').innerHTML = HERO.cats.map((c) => `
    <a href="shop.html?cat=${c.cat}" class="hero-cat">
      <img src="${img(c.photo, 360, 280)}" alt="" loading="lazy">
      <span>${esc(c.label || CATEGORIES[c.cat])}</span>
    </a>`).join('');
}

// كرت ملوّن: أيقونة بالزاوية، وتحت عنوان ونص (متل كروت Banny&Me)
const colorCardHTML = (c) => `
  <${c.href ? `a href="${c.href}"` : 'div'} class="c-card c-card--${c.tone}">
    <span class="c-card__ic">${icon(c.icon)}</span>
    <h3>${esc(c.title)}</h3>
    <p>${esc(c.text)}</p>
    ${c.href ? '<span class="c-card__more">التفاصيل</span>' : ''}
  </${c.href ? 'a' : 'div'}>`;

// ليش نونو كيدز — نصوص التوصيل والتبديل من الإعدادات عشان تضل متطابقة مع صفحة المعلومات والسلة
function renderWhy() {
  const minFee = Math.min(...STORE.shippingZones.map((z) => z.fee));
  const { min, max } = STORE.deliveryDays;
  $('#whyCards').innerHTML = [
    { icon: 'leaf', tone: 'sand', title: 'قطن ناعم 100%', text: 'خامات لطيفة بتتنفس، ما بتهيّج بشرة المولود الحساسة.' },
    { icon: 'cash', tone: 'deep', title: 'الدفع عند الاستلام', text: 'بتدفعي نقداً للمندوب لما يوصلك الطلب وتشوفيه بعينك.', href: 'info.html#shipping' },
    { icon: 'truck', tone: 'rose', title: 'توصيل لكل المناطق', text: `خلال ${min}–${max} أيام عمل، والتوصيل من ${money(minFee)}.`, href: 'info.html#shipping' },
    { icon: 'swap', tone: 'pink', title: exchangeText(), text: `إذا المقاس ما زبط، منبدله خلال ${daysLabel(STORE.exchangeDays)} من الاستلام.`, href: 'info.html#exchange' },
  ].map(colorCardHTML).join('');
}

function renderAges() {
  $('#agesGrid').innerHTML = AGE_GROUPS.map((a) => {
    const size = SIZES[a.size];
    return `
      <a href="shop.html?size=${a.size}" class="age">
        <div class="age__img">
          <img src="${img(a.photo, 400, 520)}" alt="بيبي عمر ${ltr(size.range)} ${size.unit}" loading="lazy">
          ${a.tag ? `<small>${esc(a.tag)}</small>` : ''}
        </div>
        <b>${size.range.replace('–', ' – ')}</b><span>${size.unit}</span>
      </a>`;
  }).join('');
}

// الأحدث أول: آخر منتج انضاف بيطلع بأول الصف
const renderNew = () => { $('#newGrid').innerHTML = productGrid(items().filter((p) => p.isNew).sort((a, b) => b.id - a.id).slice(0, 4)); };

function renderForYou() {
  if (behavior.viewCount() < 2) return;
  const picks = recommend({ cart: cart.lines, similarTo: behavior.lastViewed() });
  if (!picks.length) return;
  $('#forYou').hidden = false;
  $('#forYouGrid').innerHTML = productGrid(picks);
}

// البكجات بصفوف متناوبة: صورة بجهة ونص بالجهة التانية (وعالجوال الصورة بتطلع لطرف الشاشة بشكل نص دائرة)
// تحت الوصف صور 3 قطع من البكج، والباقي "+N"
const THUMBS = 3;

function bundleRowHTML(b) {
  const list = bundleItems(b);
  const shown = list.filter((it) => it.product).slice(0, THUMBS);
  const rest = list.length - shown.length;
  const url = productUrl(b);
  return `
    <article class="bundle-row">
      <a href="${url}" class="bundle-row__img" tabindex="-1" aria-hidden="true">
        <img src="${img(b.images[0], 900, 700)}"${srcset(b.images[0], '(max-width: 860px) 100vw, 50vw')} alt="" loading="lazy">
        ${b.featured ? '<span class="bundle-row__flag">الأكثر طلباً</span>' : ''}
      </a>
      <div class="bundle-row__text">
        <h3><a href="${url}">${esc(b.name)}</a></h3>
        <small class="bundle-row__count">${piecesLabel(bundleCount(b))}</small>
        <p>${esc(b.description)}</p>
        <span class="bundle-row__items">
          ${shown.map((it) => `<span title="${esc(it.label)}"><img src="${img(it.product.images[0], 160)}" alt="${esc(it.label)}" loading="lazy"></span>`).join('')}
          ${rest > 0 ? `<span class="bundle-row__more">+${rest}</span>` : ''}
        </span>
        ${priceTag(b)}
        <a href="${url}" class="btn bundle-row__btn">التفاصيل</a>
      </div>
    </article>`;
}

function renderBundles() {
  $('#bundleGrid').innerHTML = bundles().map(bundleRowHTML).join('');
}

function renderPromo() {
  const offer = liveOffers().find((o) => o.banner);
  if (!offer) return;
  $('#promo').hidden = false;
  $('#promo').innerHTML = `
    <div class="promo">
      <div>
        <span class="eyebrow">${esc(offer.label || 'عرض خاص')}</span>
        <h3>${esc(offer.title)}</h3>
        <p>العرض بيتطبق تلقائياً بالسلة</p>
      </div>
      <a href="#new" class="btn btn--light">تسوقي هلأ</a>
    </div>`;
}

function renderReviews() {
  $('#reviewsGrid').innerHTML = REVIEWS.map((r) => `
    <figure class="review">
      <div class="stars">★★★★★</div>
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption>${esc(r.name)}</figcaption>
    </figure>`).join('');
}

// كل قسم لحاله: إذا قسم واحد صار فيه خطأ، باقي الصفحة بتضل تظهر
[renderHero, renderNew, renderBundles, renderAges, renderForYou, renderPromo, renderWhy, renderReviews]
  .forEach((render) => {
    try { render(); } catch (err) { console.error(`خطأ بقسم ${render.name}:`, err); }
  });
