// تركيب الأجزاء المشتركة بكل صفحة: الهيدر، الفوتر، السلة، والأزرار العامة
import { $, $$ } from '../utils.js';
import { findProduct } from '../store/catalog.js';
import { cart } from '../store/cart.js';
import { favorites } from '../store/favorites.js';
import { behavior } from '../store/behavior.js';
import { headerHTML, initHeader } from './header.js';
import { footerHTML } from './footer.js';
import { drawerHTML, initDrawer, renderDrawer, bumpCartCount } from './cart-drawer.js';
import { toast } from './components.js';
import { icon } from './icons.js';

// أزرار موجودة بأكثر من مكان (السلة، صفحة الدفع، الكروت)
function handleGlobalClicks(e) {
  const quick = e.target.closest('[data-quick-add]');
  if (quick) {
    const p = findProduct(quick.dataset.quickAdd);
    const ok = cart.add(p.id, quick.dataset.size, p.colors?.[0]?.name || '');
    toast(ok ? `انضاف ${p.name}` : 'ما في كمية أكثر من هاد المقاس');
    return;
  }
  const qty = e.target.closest('[data-cart-qty]');
  if (qty) {
    const ok = cart.changeQty(Number(qty.dataset.cartQty), Number(qty.dataset.d));
    if (!ok) toast('وصلتي لآخر قطعة متوفرة من هاد المقاس');
    return;
  }
  const fav = e.target.closest('[data-fav]');
  if (fav) {
    e.preventDefault(); // الزر جوا رابط الكرت
    const added = favorites.toggle(fav.dataset.fav);
    toast(added ? 'انضافت للمفضلة ♡' : 'انشالت من المفضلة');
  }
}

// كل أزرار القلب لنفس المنتج بتتحدث مع بعض، ومعها العداد بالهيدر
function syncFavorites() {
  $$('[data-fav]').forEach((b) => {
    const on = favorites.has(b.dataset.fav);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? 'شيلي من المفضلة' : 'أضيفي للمفضلة');
  });
  const count = $('#favCount');
  count.textContent = favorites.count;
  count.hidden = !favorites.count;
}

export function mountLayout() {
  document.body.insertAdjacentHTML('afterbegin', headerHTML());
  document.body.insertAdjacentHTML('beforeend', footerHTML() + drawerHTML());

  // أيقونات مكتوبة بالـ HTML كـ <i data-icon="cash"></i>
  $$('[data-icon]').forEach((el) => { el.outerHTML = icon(el.dataset.icon); });

  initHeader();
  initDrawer();
  document.addEventListener('click', handleGlobalClicks);

  syncFavorites();
  favorites.subscribe(({ id, added }) => {
    if (added) behavior.favorited(id);
    syncFavorites();
  });

  cart.subscribe((event) => {
    if (event.type === 'add') {
      behavior.added(event.id);
      behavior.choseSize(event.size);
      bumpCartCount();
    }
    renderDrawer(event.type === 'add' ? event : null);
  });
}
