// الصفحة الرئيسية — أجزاء العروض بتظهر بس إذا في عرض فعّال
import { $, esc, img, ltr, money } from '../utils.js';
import { SIZES, CATEGORIES } from '../config.js';
import { HERO_SLIDES, OFFER_SLIDE_PHOTOS, AGE_GROUPS, TRUST_POINTS, REVIEWS } from '../data/content.js';
import { items, bundles } from '../store/catalog.js';
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
    eyebrow: offer.label || 'عرض خاص',
    title: offer.title,
    text: 'العرض لفترة محدودة، والخصم بيتطبق تلقائياً.',
    cta: { label: 'تسوقي العرض', href: onBundles ? '#bundles' : '#new' },
    endsAt: offer.endsAt,
    ...OFFER_SLIDE_PHOTOS,
  }, ...HERO_SLIDES];
}

const slideHTML = (s, i) => `
  <article class="slide" aria-roledescription="شريحة" aria-label="${i + 1}">
    <div class="container slide__inner">
      <div class="slide__photo"><img src="${img(s.photo, 640)}" alt="" ${i ? 'loading="lazy"' : ''}></div>
      <div class="slide__text">
        <span class="slide__hearts" aria-hidden="true">♡♡</span>
        <span class="eyebrow">${esc(s.eyebrow)}</span>
        ${i ? `<h2>${esc(s.title)}</h2>` : `<h1>${esc(s.title)}</h1>`}
        <p>${esc(s.text)}</p>
        ${s.endsAt ? countdownHTML('countdown--hero') : ''}
        <a href="${s.cta.href}" class="btn btn--ghost">${esc(s.cta.label)}</a>
      </div>
      <div class="slide__polaroid"><img src="${img(s.polaroid, 420, 500)}" alt="" loading="lazy"></div>
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
    .map(([key, name]) => `<a href="${key === 'bundles' ? '#bundles' : '#new'}" class="tile tile--${key}"><span>${esc(name)}</span></a>`)
    .join('');
}

function renderAges() {
  $('#agesGrid').innerHTML = AGE_GROUPS.map((a) => {
    const size = SIZES[a.size];
    return `
      <a href="#" class="age">
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

function bundleCard(b) {
  const { price, old } = priceOf(b);
  return `
    <article class="bundle ${b.featured ? 'bundle--featured' : ''}">
      ${b.featured ? '<span class="bundle__flag">الأكثر طلباً</span>' : ''}
      <a href="${productUrl(b)}" class="bundle__img"><img src="${img(b.images[0], 700, 440)}" alt="${esc(b.name)}" loading="lazy"></a>
      <h3><a href="${productUrl(b)}">${esc(b.name)}</a></h3>
      <span class="bundle__count">${b.count} قطعة</span>
      <ul class="hearts">${b.contents.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      ${priceTag(b, { cls: 'price--lg' })}
      <span class="save ${old ? '' : 'save--empty'}">${old ? `وفّري ${money(old - price)}` : ''}</span>
      <a href="${productUrl(b)}" class="btn ${b.featured ? 'btn--primary' : 'btn--ghost'} btn--block">اختاري البكج</a>
    </article>`;
}

const renderBundles = () => { $('#bundleGrid').innerHTML = bundles().map(bundleCard).join(''); };

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
