// الصفحة الرئيسية — كل أجزاء العروض بتظهر بس إذا في عرض فعّال

// ===== البانر الرئيسي =====
function renderHero() {
  const offer = liveOffers().find((o) => o.hero);
  const target = offer && offer.target.kind === 'category' && offer.target.ids[0] === 'bundles' ? '#bundles' : '#new';
  $('#heroText').innerHTML = offer ? `
    <span class="pill pill--sale">${esc(offer.label || 'عرض')}</span>
    <h1>جهّزي لبيبيك أحلى استقبال</h1>
    <p>${esc(offer.title)}</p>
    ${offer.endsAt ? `
    <div class="countdown" id="countdown" aria-label="الوقت المتبقي للعرض">
      <div><b data-u="d">00</b><span>يوم</span></div>
      <div><b data-u="h">00</b><span>ساعة</span></div>
      <div><b data-u="m">00</b><span>دقيقة</span></div>
      <div><b data-u="s">00</b><span>ثانية</span></div>
    </div>` : ''}
    <div class="hero__cta">
      <a href="${target}" class="btn btn--light">تسوقي العرض</a>
      <a href="#new" class="btn btn--outline-light">شوفي الجديد</a>
    </div>` : `
    <span class="pill">NUNU KIDS</span>
    <h1>كل ما يحتاجه بيبيك</h1>
    <p>ملابس ناعمة من أول يوم لأول سنة</p>
    <div class="hero__cta">
      <a href="#new" class="btn btn--light">تسوقي الجديد</a>
      <a href="#bundles" class="btn btn--outline-light">بكجات تجهيز البيبي</a>
    </div>`;
  if (offer && offer.endsAt) countdown($('#countdown'), offer.endsAt, renderHero);
}
renderHero();

// ===== الشريط المتحرك =====
const marqueeMsgs = ['تسوقي وصل حديثاً', ...liveOffers().map((o) => o.title), 'الدفع عند الاستلام',
  ...(STORE.freeShippingOver ? [`توصيل مجاني فوق ${money(STORE.freeShippingOver)}`] : [])];
const once = marqueeMsgs.map((m) => `<span>${esc(m)}</span><i>♥</i>`).join('');
$('#marquee').innerHTML = once + once;

// ===== وصل حديثاً =====
$('#newGrid').innerHTML = PRODUCTS.filter((p) => p.isNew && p.category !== 'bundles').slice(0, 8).map(productCard).join('');

// ===== مختارات إلك (حسب تصرفات الزبونة) =====
if ((Behavior.data.views || []).length >= 2) {
  const picks = recommend({ cart: Cart.items, similarTo: findProduct(Behavior.data.views[0]) });
  if (picks.length) { $('#forYou').hidden = false; $('#forYouGrid').innerHTML = picks.map(productCard).join(''); }
}

// ===== البكجات =====
$('#bundleGrid').innerHTML = PRODUCTS.filter((p) => p.category === 'bundles').map((b) => {
  const pr = priceOf(b);
  return `
  <article class="bundle ${b.featured ? 'bundle--featured' : ''}">
    ${b.featured ? '<span class="bundle__flag">الأكثر طلباً</span>' : ''}
    <a href="product.html?id=${b.id}" class="bundle__img"><img src="${IMG(b.images[0], 700, 440)}" alt="${esc(b.name)}" loading="lazy"></a>
    <h3><a href="product.html?id=${b.id}">${esc(b.name)}</a></h3>
    <span class="bundle__count">${b.count} قطعة</span>
    <ul>${b.contents.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <div class="price ${pr.old ? 'price--sale' : ''}"><b>${money(pr.price)}</b>${pr.old ? `<s>${money(pr.old)}</s>` : ''}</div>
    ${pr.old ? `<span class="save">وفّري ${money(pr.old - pr.price)}</span>` : '<span class="save save--empty"></span>'}
    <a href="product.html?id=${b.id}" class="btn ${b.featured ? 'btn--primary' : 'btn--ghost'} btn--block">اختاري البكج</a>
  </article>`;
}).join('');

// ===== بانر العرض الثانوي =====
const bannerOffer = liveOffers().find((o) => o.banner);
if (bannerOffer) {
  $('#promo').hidden = false;
  $('#promo').innerHTML = `
    <div class="promo">
      <div>
        <span class="pill">${esc(bannerOffer.label || 'عرض خاص')}</span>
        <h3>${esc(bannerOffer.title)}</h3>
        <p>العرض بيتطبق تلقائياً بالسلة</p>
      </div>
      <a href="#new" class="btn btn--primary">تسوقي هلأ</a>
    </div>`;
}
