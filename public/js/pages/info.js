// صفحة المعلومات: تبويبات بالرابط (info.html#size) + محتوى من الإعدادات
import { STORE, SIZES } from '../config.js';
import { $, $$, esc, money, ltr } from '../utils.js';
import { SIZE_GUIDE } from '../data/content.js';
import { mountLayout } from '../ui/layout.js';
import { whatsappUrl } from '../ui/footer.js';
import { icon, brandIcon } from '../ui/icons.js';
import { sizeTableHTML } from '../ui/components.js';

mountLayout();

const TITLES = { about: 'من نحن', size: 'دليل المقاسات', shipping: 'التوصيل والدفع', returns: 'التبديل والإرجاع', contact: 'تواصلي معنا' };

function showTab() {
  const tab = TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'size';
  $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  $$('[data-tab]').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === tab));
  $('#crumbTitle').textContent = TITLES[tab];
  document.title = `${TITLES[tab]} | NUNU KIDS`;
}

// ===== محتوى من الإعدادات (عشان يضل متطابق مع باقي الموقع) =====
// أوفرول قصير بياقة مدوّرة، معلّق بأحجام بتكبر مع المقاس
const HANGER = '<svg class="rail-item__hanger" viewBox="0 0 60 34" aria-hidden="true"><path d="M30 12V8a4 4 0 1 1 4-4"/><path d="M30 12L4 30h52z"/></svg>';
const ROMPER = `
  <svg class="rail-item__romper" viewBox="0 0 100 118" aria-hidden="true">
    <path class="r-body" d="M38 6 20 11 5 26l9 11 10-6v50l-4 26 21 3 9-19 9 19 21-3-4-26V31l10 6 9-11-15-15-18-5q-12 9-24 0z"/>
    <path class="r-line" d="M21 104l20 3M59 107l20-3M14 37l10-6M86 37l-10-6"/>
    <path class="r-collar" d="M38 6q-2 13 11 13q1-6-11-13zM62 6q2 13-11 13q-1-6 11-13z"/>
    <circle class="r-btn" cx="50" cy="31" r="2.6"/><circle class="r-btn" cx="50" cy="43" r="2.6"/><circle class="r-btn" cx="50" cy="55" r="2.6"/>
    <path class="r-heart" d="M66 62c-2-3-7-2-7 2 0 3 4 6 7 8 3-2 7-5 7-8 0-4-5-5-7-2z"/>
  </svg>`;
$('#sizeRail').innerHTML = `<span class="size-rail__bar"></span>${SIZE_GUIDE.map((r, i) => `
  <div class="rail-item" style="--scale:${(0.62 + i * 0.13).toFixed(2)}">
    ${HANGER}${ROMPER}
    <span class="rail-item__tag">${ltr(SIZES[r.size].range)}</span>
  </div>`).join('')}`;
$('#sizeTable').innerHTML = sizeTableHTML();

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
