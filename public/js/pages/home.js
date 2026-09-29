// الصفحة الرئيسية — أجزاء العروض بتظهر بس إذا في عرض فعّال
import { $, esc, img, ltr, money } from '../utils.js';
import { SIZES } from '../config.js';
import { HERO_PHOTOS, AGE_GROUPS, TYPE_TILES, TRUST_POINTS, REVIEWS } from '../data/content.js';
import { items, bundles } from '../store/catalog.js';
import { liveOffers, priceOf } from '../store/pricing.js';
import { cart } from '../store/cart.js';
import { behavior } from '../store/behavior.js';
import { recommend } from '../store/recommend.js';
import { mountLayout } from '../ui/layout.js';
import { promoMessages } from '../ui/header.js';
import { icon, garment } from '../ui/icons.js';
import { productGrid, productUrl, priceTag, countdownHTML, startCountdown } from '../ui/components.js';

mountLayout();

// ===== البانر الرئيسي =====
function renderHero() {
  $('#heroPhotos').innerHTML = HERO_PHOTOS
    .map((p, i) => `<img src="${img(p.id, 700, 900)}" alt="${esc(p.alt)}" ${i > 1 ? 'loading="lazy"' : ''}>`)
    .join('');

  const offer = liveOffers().find((o) => o.hero);
  if (!offer) {
    $('#heroText').innerHTML = `
      <span class="pill">NUNU KIDS</span>
      <h1>كل ما يحتاجه بيبيك</h1>
      <p>ملابس ناعمة من أول يوم لأول سنة</p>
      <div class="hero__cta">
        <a href="#new" class="btn btn--light">تسوقي الجديد</a>
        <a href="#bundles" class="btn btn--outline-light">بكجات تجهيز البيبي</a>
      </div>`;
    return;
  }
  const onBundles = offer.target.kind === 'category' && offer.target.ids.includes('bundles');
  $('#heroText').innerHTML = `
    <span class="pill pill--sale">${esc(offer.label || 'عرض')}</span>
    <h1>جهّزي لبيبيك أحلى استقبال</h1>
    <p>${esc(offer.title)}</p>
    ${offer.endsAt ? countdownHTML('countdown--glass') : ''}
    <div class="hero__cta">
      <a href="${onBundles ? '#bundles' : '#new'}" class="btn btn--light">تسوقي العرض</a>
      <a href="#new" class="btn btn--outline-light">شوفي الجديد</a>
    </div>`;
  if (offer.endsAt) startCountdown($('#heroText .countdown'), offer.endsAt, renderHero);
}

function renderMarquee() {
  const once = ['تسوقي وصل حديثاً', ...promoMessages()]
    .map((m) => `<span>${esc(m)}</span><i>♥</i>`)
    .join('');
  $('#marquee').innerHTML = once + once; // مكرر عشان الحركة تكون متواصلة
}

function renderTrust() {
  $('#trust').innerHTML = TRUST_POINTS.map((t) => `<div>${icon(t.icon)}<span>${esc(t.text)}</span></div>`).join('');
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

function renderPromo() {
  const offer = liveOffers().find((o) => o.banner);
  if (!offer) return;
  $('#promo').hidden = false;
  $('#promo').innerHTML = `
    <div class="promo">
      <div>
        <span class="pill">${esc(offer.label || 'عرض خاص')}</span>
        <h3>${esc(offer.title)}</h3>
        <p>العرض بيتطبق تلقائياً بالسلة</p>
      </div>
      <a href="#new" class="btn btn--light">تسوقي هلأ</a>
    </div>`;
}

function renderTypes() {
  $('#typesGrid').innerHTML = TYPE_TILES
    .map((t) => `<a href="#" class="type">${garment(t.icon)}<span>${esc(t.name)}</span></a>`)
    .join('');
}

function renderReviews() {
  $('#reviewsGrid').innerHTML = REVIEWS.map((r) => `
    <figure class="review">
      <div class="stars">★★★★★</div>
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption>${esc(r.name)}</figcaption>
    </figure>`).join('');
}

renderHero();
renderMarquee();
renderTrust();
renderAges();
$('#newGrid').innerHTML = productGrid(items().filter((p) => p.isNew).slice(0, 8));
renderForYou();
$('#bundleGrid').innerHTML = bundles().map(bundleCard).join('');
renderPromo();
renderTypes();
renderReviews();
