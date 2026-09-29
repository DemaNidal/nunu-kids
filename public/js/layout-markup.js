// الهيدر والفوتر والسلة — مشتركين بين كل صفحات المتجر
const SITE_TOP = `<!-- الأيقونات -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-onesie" viewBox="0 0 64 64"><path d="M22 8h20l12 8-5 9-6-3v18c0 6-4 10-8 14h-6c-4-4-8-8-8-14V22l-6 3-5-9z"/><path d="M26 8q6 7 12 0"/><path d="M29 54h6"/></symbol>
  <symbol id="i-sleeper" viewBox="0 0 64 64"><path d="M24 6h16l14 10-4 14-6-2v16l2 14H36l-4-12-4 12H18l2-14V28l-6 2-4-14z"/><path d="M28 6q4 5 8 0M32 12v14"/></symbol>
  <symbol id="i-hat" viewBox="0 0 64 64"><path d="M16 44q0-28 16-28t16 28"/><rect x="13" y="44" width="38" height="9" rx="4"/><circle cx="32" cy="12" r="4"/></symbol>
  <symbol id="i-socks" viewBox="0 0 64 64"><path d="M20 8h12v26l10 8q5 7-2 12H26q-8 0-8-9z"/><path d="M20 15h12"/></symbol>
  <symbol id="i-bib" viewBox="0 0 64 64"><path d="M22 12q10 14 20 0q12 6 12 22a22 22 0 0 1-44 0q0-16 12-22z"/><path d="M26 38q6 5 12 0"/></symbol>
  <symbol id="i-blanket" viewBox="0 0 64 64"><rect x="10" y="14" width="44" height="36" rx="6"/><path d="M10 36h44M22 14v36"/></symbol>
  <symbol id="i-gift" viewBox="0 0 64 64"><rect x="10" y="24" width="44" height="30" rx="4"/><path d="M8 18h48v8H8zM32 18v36M32 18q-12-14-16-4 2 4 16 4q12-14 16-4-2 4-16 4"/></symbol>
  <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
  <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></symbol>
  <symbol id="i-cash" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></symbol>
  <symbol id="i-swap" viewBox="0 0 24 24"><path d="M4 8h14l-3-3M20 16H6l3 3"/></symbol>
  <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15zM5 19l7-7"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></symbol>
  <symbol id="i-wa" viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1a4 4 0 0 1-2-2l1-1-1-2z"/></symbol>
  <symbol id="i-gift-s" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13M12 7C9 3 6 4 7.5 6.5 8 7 12 7 12 7s4 0 4.5-.5C18 4 15 3 12 7z"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/></symbol>
  <symbol id="s-facebook" viewBox="0 0 24 24"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z"/></symbol>
  <symbol id="s-instagram" viewBox="0 0 24 24"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 4.6c2.4 0 2.7 0 3.6.1 2.4.1 3.6 1.3 3.7 3.7.1.9.1 1.2.1 3.6s0 2.7-.1 3.6c-.1 2.4-1.3 3.6-3.7 3.7-.9.1-1.2.1-3.6.1s-2.7 0-3.6-.1c-2.4-.1-3.6-1.3-3.7-3.7-.1-.9-.1-1.2-.1-3.6s0-2.7.1-3.6C4.8 6 6 4.8 8.4 4.7c.9-.1 1.2-.1 3.6-.1zM12 3c-2.4 0-2.8 0-3.7.1C5 3.2 3.2 5 3.1 8.3 3 9.2 3 9.6 3 12s0 2.8.1 3.7c.1 3.3 1.9 5.1 5.2 5.2.9.1 1.3.1 3.7.1s2.8 0 3.7-.1c3.3-.1 5.1-1.9 5.2-5.2.1-.9.1-1.3.1-3.7s0-2.8-.1-3.7C20.8 5 19 3.2 15.7 3.1 14.8 3 14.4 3 12 3z"/></symbol>
</svg>
<!-- شريط الإعلانات -->
<div class="announce" id="announce" aria-live="polite">
  <span>توصيل مجاني للطلبات فوق 200 ₪</span>
</div>
<!-- الهيدر -->
<header class="header">
  <div class="container header__row">
    <button class="icon-btn only-mobile" id="menuBtn" aria-label="القائمة"><svg class="ic"><use href="#i-menu"/></svg></button>
    <a href="index.html" class="logo" aria-label="NUNU KIDS الرئيسية"><img src="assets/logo.png" alt="NUNU KIDS"></a>
    <form class="search only-desktop" role="search" onsubmit="return false">
      <svg class="ic"><use href="#i-search"/></svg>
      <input type="search" placeholder="دوّري على بدلة، طاقية، بكج...">
    </form>
    <div class="header__actions">
      <a href="#" class="track-link only-desktop"><svg class="ic"><use href="#i-truck"/></svg> تتبع طلبي</a>
      <button class="icon-btn cart-btn" id="cartBtn" aria-label="السلة">
        <svg class="ic"><use href="#i-bag"/></svg>
        <span class="cart-count" id="cartCount">0</span>
      </button>
    </div>
  </div>
  <nav class="nav" id="nav">
    <div class="container nav__row">
      <a href="index.html#new">وصل حديثاً</a>
      <a href="index.html#ages">حسب العمر</a>
      <a href="index.html#bundles">بكجات تجهيز البيبي</a>
      <a href="index.html#types">ملابس داخلية</a>
      <a href="index.html#types">أواعي</a>
      <a href="index.html#types">مستلزمات البيبي</a>
      <a href="index.html#offers" class="nav__sale">العروض</a>
      <a href="#" class="only-mobile">تتبع طلبي</a>
    </div>
  </nav>
</header>
`;
const SITE_BOTTOM = `<!-- الفوتر -->
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <img src="assets/logo.png" alt="NUNU KIDS" class="footer__logo">
      <p>كل ما يحتاجه بيبيك، من أول يوم لأول سنة.</p>
      <div class="socials">
        <a href="#" aria-label="فيسبوك" target="_blank" rel="noopener"><svg><use href="#s-facebook"/></svg></a>
        <a href="#" aria-label="إنستغرام" target="_blank" rel="noopener"><svg><use href="#s-instagram"/></svg></a>
        <a href="#" aria-label="واتساب" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg></a>
      </div>
    </div>
    <div>
      <h4>تسوقي</h4>
      <a href="index.html#new">وصل حديثاً</a>
      <a href="index.html#ages">حسب العمر</a>
      <a href="index.html#bundles">بكجات تجهيز البيبي</a>
      <a href="index.html#offers">العروض</a>
    </div>
    <div>
      <h4>مساعدة</h4>
      <a href="#">تتبع طلبي</a>
      <a href="#">دليل المقاسات</a>
      <a href="#">سياسة التبديل</a>
      <a href="#">التوصيل والدفع</a>
    </div>
    <div>
      <h4>تواصلي معنا</h4>
      <a href="#"><svg class="ic ic--sm"><use href="#i-wa"/></svg> واتساب</a>
      <a href="#"><svg class="ic ic--sm soc"><use href="#s-instagram"/></svg> إنستغرام</a>
      <a href="#"><svg class="ic ic--sm soc"><use href="#s-facebook"/></svg> فيسبوك</a>
      <a href="#"><svg class="ic ic--sm"><use href="#i-pin"/></svg> مناطق التوصيل</a>
    </div>
  </div>
  <div class="container footer__bottom">
    <span>© 2026 NUNU KIDS</span>
    <span class="cod"><svg class="ic ic--sm"><use href="#i-cash"/></svg> الدفع نقداً عند الاستلام</span>
  </div>
</footer>
<!-- زر واتساب -->
<a href="#" class="wa-float" aria-label="تواصلي معنا على واتساب"><svg class="ic"><use href="#i-wa"/></svg></a>

<!-- السلة الجانبية -->
<div class="overlay" id="overlay"></div>
<aside class="drawer" id="drawer" aria-label="السلة">
  <div class="drawer__head">
    <h3>سلتك</h3>
    <button class="icon-btn" id="closeCart" aria-label="إغلاق"><svg class="ic"><use href="#i-x"/></svg></button>
  </div>
  <div class="ship-bar">
    <p id="shipMsg"></p>
    <div class="ship-bar__track"><div class="ship-bar__fill" id="shipFill"></div></div>
  </div>
  <div class="drawer__items" id="cartItems"></div>
  <div class="drawer__foot">
    <div id="cartDiscounts"></div>
    <div class="drawer__total"><span>المجموع</span><b id="cartTotal">0 ₪</b></div>
    <a href="checkout.html" class="btn btn--primary btn--block">إتمام الطلب</a>
    <p class="drawer__note">الدفع نقداً عند الاستلام</p>
  </div>
</aside>

<div class="toast" id="toast" role="status"></div>
`;
