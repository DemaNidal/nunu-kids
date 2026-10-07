// صفحة المعلومات: تبويبات بالرابط (info.html#size) + محتوى من الإعدادات
import { STORE } from '../config.js';
import { $, $$, esc, money, daysLabel, exchangeText } from '../utils.js';
import { mountLayout } from '../ui/layout.js';
import { whatsappUrl } from '../ui/footer.js';
import { icon, brandIcon } from '../ui/icons.js';
import { sizeTableHTML } from '../ui/components.js';

mountLayout();

const TITLES = { about: 'من نحن', size: 'دليل المقاسات', shipping: 'التوصيل والدفع', exchange: 'تبديل المقاس', contact: 'تواصلي معنا' };

function showTab() {
  const tab = TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'size';
  $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === tab));
  $('#crumbTitle').textContent = TITLES[tab];
  document.title = `${TITLES[tab]} | NUNU KIDS`;
}

// ===== محتوى من الإعدادات (عشان يضل متطابق مع باقي الموقع) =====
$('#sizeTable').innerHTML = sizeTableHTML();
$('[data-exchange-title]').textContent = exchangeText();
$('[data-exchange-days]').textContent = daysLabel(STORE.exchangeDays);

$('#zonesTable').innerHTML = `
  <table class="size-table">
    <thead><tr><th>المنطقة</th><th>سعر التوصيل</th><th>المدة</th></tr></thead>
    <tbody>${STORE.shippingZones.map((z) => `<tr><td>${esc(z.name)}</td><td>${money(z.fee)}</td><td>${esc(z.days)}</td></tr>`).join('')}</tbody>
  </table>
  ${STORE.freeShippingOver ? `<p class="info-note">التوصيل مجاني للطلبات فوق ${money(STORE.freeShippingOver)}.</p>` : ''}`;

const CONTACTS = [
  { href: whatsappUrl(), icon: icon('wa'), label: 'واتساب', note: 'أسرع طريقة' },
  { href: STORE.instagram || '#', icon: brandIcon('instagram'), label: 'إنستغرام', note: 'شوفي جديدنا' },
  { href: STORE.facebook || '#', icon: brandIcon('facebook'), label: 'فيسبوك', note: 'تابعينا' },
];
$('#contactCards').innerHTML = CONTACTS.map((c) => `
  <a class="contact-card" href="${c.href}" target="_blank" rel="noopener">${c.icon}<b>${c.label}</b><small>${c.note}</small></a>`).join('');

// أزرار واتساب برسالة جاهزة
$$('[data-whatsapp]').forEach((a) => { a.href = whatsappUrl(a.dataset.whatsapp); });

window.addEventListener('hashchange', () => { showTab(); scrollTo({ top: 0 }); });
showTab();
