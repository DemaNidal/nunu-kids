// الصفحة الرئيسية — أجزاء العروض بتظهر بس إذا في عرض فعّال
import { $, esc, img, ltr, piecesLabel } from '../utils.js';
import { SIZES, CATEGORIES } from '../config.js';
import { HERO_SLIDES, OFFER_SLIDE_PHOTO, AGE_GROUPS, TRUST_POINTS, REVIEWS } from '../data/content.js';
import { items, bundles, bundleItems, bundleCount } from '../store/catalog.js';
import { liveOffers, priceOf } from '../store/pricing.js';
import { cart } from '../store/cart.js';
import { behavior } from '../store/behavior.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { initSlider } from '../ui/slider.js';
import { icon } from '../ui/icons.js';
import { productGrid, productUrl, priceTag, countdownHTML, startCountdown } from '../ui/components.js';

mountLayout();

// ===== البانر الرئيسي (سلايدر) =====
// العرض الفعّال (إذا في) بيصير أول شريحة، ومعه عدّاد
function heroSlides() {
  const offer = liveOffers().find((o) => o.hero);
  if (!offer) return HERO_SLIDES;
  const onBundles = offer.target.kind === 'category' && offer.target.ids.includes('bundles');
  return [{
    kicker: 'لفترة محدودة',
    eyebrow: offer.label || 'عرض خاص',
    title: offer.title,
    text: 'الخصم بيتطبق تلقائياً على السعر، وبتدفعي عند الاستلام.',
    cta: { label: 'تسوقي العرض', href: onBundles ? '#bundles' : '#new' },
    endsAt: offer.endsAt,
    photo: OFFER_SLIDE_PHOTO,
  }, ...HERO_SLIDES];
}

const titleHTML = (s, i) => {
  const t = esc(s.title).replace('\n', '<br>');
  return i ? `<h2>${t}</h2>` : `<h1>${t}</h1>`; // عنوان h1 وحيد بالصفحة
};

// شريحة: صورة وحدة كبيرة بإطار ناعم، وجنبها نص فخم ومساحة فاضية
const slideHTML = (s, i) => `
  <article class="slide" aria-roledescription="شريحة" aria-label="${i + 1}">
    <div class="container slide__inner">
      <div class="slide__frame"><img src="${img(s.photo, 900, 820)}" alt="" ${i ? 'loading="lazy"' : ''}></div>
      <div class="slide__text">
        ${s.kicker ? `<span class="slide__kicker">${esc(s.kicker)}</span>` : ''}
        <span class="slide__script">${esc(s.eyebrow)}</span>
        ${titleHTML(s, i)}
        <span class="slide__rule" aria-hidden="true"></span>
        <p>${esc(s.text)}</p>
        ${s.endsAt ? countdownHTML('countdown--hero') : ''}
        <a href="${s.cta.href}" class="btn btn--primary">${esc(s.cta.label)}</a>
      </div>
    </div>
  </article>`;

function renderHero() {
  const slides = heroSlides();
  $('#heroSlides').innerHTML = slides.map(slideHTML).join('');
  slides.forEach((s, i) => {
    if (s.endsAt) startCountdown($(`#heroSlides .slide:nth-child(${i + 1}) .countdown`), s.endsAt);
  });
  initSlider($('#offers'));
}

function renderTrust() {
  $('#trust').innerHTML = TRUST_POINTS.map((t) => `
    <div class="trust__item">
      ${icon(t.icon)}
      <div><b>${esc(t.text)}</b><small>${esc(t.desc)}</small></div>
    </div>`).join('');
}

// مربعات الأقسام بإطار، بدرجات اللون الطاغي
function renderTypes() {
  $('#typesGrid').innerHTML = Object.entries(CATEGORIES)
    .map(([key, name]) => `<a href="shop.html?cat=${key}" class="tile tile--${key}"><span>${esc(name)}</span></a>`)
    .join('');
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

const renderNew = () => { $('#newGrid').innerHTML = productGrid(items().filter((p) => p.isNew).slice(0, 8)); };

function renderForYou() {
  if (behavior.viewCount() < 2) return;
  const picks = recommend({ cart: cart.lines, similarTo: behavior.lastViewed() });
  if (!picks.length) return;
  $('#forYou').hidden = false;
  $('#forYouGrid').innerHTML = productGrid(picks);
}

// كرت البكج: صورة البكج كامل، وتحتها صور 3 قطع منه، والباقي "+N"
const THUMBS = 3;

function bundleCardHTML(b) {
  const withPhotos = bundleItems(b).filter((it) => it.product);
  const shown = withPhotos.slice(0, THUMBS);
  const rest = bundleItems(b).length - shown.length;
  return `
    <a href="${productUrl(b)}" class="bundle-card">
      <span class="bundle-card__main">
        <img src="${img(b.images[0], 800, 600)}" alt="${esc(b.name)}" loading="lazy">
        ${b.featured ? '<span class="bundle-card__flag">الأكثر طلباً</span>' : ''}
      </span>
      <span class="bundle-card__items">
        ${shown.map((it) => `<span title="${esc(it.label)}"><img src="${img(it.product.images[0], 200)}" alt="${esc(it.label)}" loading="lazy"></span>`).join('')}
        ${rest > 0 ? `<span class="bundle-card__more">+${rest}</span>` : ''}
      </span>
      <span class="bundle-card__info">
        <h3>${esc(b.name)}</h3>
        <small>${piecesLabel(bundleCount(b))}</small>
      </span>
      ${priceTag(b)}
    </a>`;
}

function renderBundles() {
  $('#bundleGrid').innerHTML = bundles().map(bundleCardHTML).join('');
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
[renderHero, renderTrust, renderNew, renderTypes, renderAges, renderForYou, renderBundles, renderPromo, renderReviews]
  .forEach((render) => {
    try { render(); } catch (err) { console.error(`خطأ بقسم ${render.name}:`, err); }
  });
