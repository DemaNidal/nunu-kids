// الفوتر + زر الواتساب العائم
import { STORE } from '../config.js';
import { icon, brandIcon } from './icons.js';

const link = (url) => url || '#';
export const whatsappUrl = (text = '') =>
  STORE.whatsapp ? `https://wa.me/${STORE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '#';

export function footerHTML() {
  const ext = 'target="_blank" rel="noopener"';
  return `
    <footer class="footer">
      <div class="container footer__grid">
        <div>
          <img src="assets/logo.png" alt="${STORE.name}" class="footer__logo">
          <p>كل ما يحتاجه بيبيك، من أول يوم لأول سنة.</p>
          <div class="socials">
            <a href="${link(STORE.facebook)}" aria-label="فيسبوك" ${ext}>${brandIcon('facebook')}</a>
            <a href="${link(STORE.instagram)}" aria-label="إنستغرام" ${ext}>${brandIcon('instagram')}</a>
            <a href="${whatsappUrl()}" aria-label="واتساب" ${ext}>${icon('wa')}</a>
          </div>
        </div>
        <div>
          <h4>تسوقي</h4>
          <a href="shop.html">كل المنتجات</a>
          <a href="shop.html?sort=new">وصل حديثاً</a>
          <a href="shop.html?cat=bundles">بكجات تجهيز البيبي</a>
          <a href="shop.html?sale=1">العروض</a>
        </div>
        <div>
          <h4>مساعدة</h4>
          <a href="favorites.html">المفضلة</a>
          <a href="#">تتبع طلبي</a>
          <a href="info.html#size">دليل المقاسات</a>
          <a href="info.html#exchange">سياسة التبديل</a>
          <a href="info.html#shipping">التوصيل والدفع</a>
          <a href="info.html#about">من نحن</a>
        </div>
        <div>
          <h4>تواصلي معنا</h4>
          <a href="${whatsappUrl()}" ${ext}>${icon('wa', 'ic--sm')} واتساب</a>
          <a href="${link(STORE.instagram)}" ${ext}>${brandIcon('instagram', 'ic--sm')} إنستغرام</a>
          <a href="${link(STORE.facebook)}" ${ext}>${brandIcon('facebook', 'ic--sm')} فيسبوك</a>
          <a href="info.html#shipping">${icon('pin', 'ic--sm')} مناطق التوصيل</a>
        </div>
      </div>
      <div class="container footer__bottom">
        <span>© ${new Date().getFullYear()} ${STORE.name}</span>
        <span class="cod">${icon('cash', 'ic--sm')} الدفع نقداً عند الاستلام</span>
      </div>
    </footer>
    <a href="${whatsappUrl()}" class="wa-float" aria-label="تواصلي معنا على واتساب" ${ext}>${icon('wa')}</a>`;
}
