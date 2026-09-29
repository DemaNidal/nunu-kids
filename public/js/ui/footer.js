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
          <a href="${whatsappUrl()}" ${ext}>${icon('wa', 'ic--sm')} واتساب</a>
          <a href="${link(STORE.instagram)}" ${ext}>${brandIcon('instagram', 'ic--sm')} إنستغرام</a>
          <a href="${link(STORE.facebook)}" ${ext}>${brandIcon('facebook', 'ic--sm')} فيسبوك</a>
          <a href="#">${icon('pin', 'ic--sm')} مناطق التوصيل</a>
        </div>
      </div>
      <div class="container footer__bottom">
        <span>© ${new Date().getFullYear()} ${STORE.name}</span>
        <span class="cod">${icon('cash', 'ic--sm')} الدفع نقداً عند الاستلام</span>
      </div>
    </footer>
    <a href="${whatsappUrl()}" class="wa-float" aria-label="تواصلي معنا على واتساب" ${ext}>${icon('wa')}</a>`;
}
