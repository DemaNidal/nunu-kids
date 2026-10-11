// طباعة ملصق الطلب للكيس (حجم A6 = ربع ورقة A4) — طلب واحد أو كذا طلب، كل واحد بصفحة
import { esc, money, sizeLabel, phoneDisplay } from '../utils.js';
import { STORE } from '../config.js';

const day = (iso) => new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

const labelHTML = (o) => `
  <article class="plabel">
    <header class="plabel__head">
      <img src="../assets/logo.png" alt="NUNU KIDS">
      <div><small>رقم الطلب</small><b dir="ltr">${o.id}</b><small>${day(o.createdAt)}</small></div>
    </header>

    <section class="plabel__to">
      <small>إلى</small>
      <p class="plabel__name">${esc(o.customer.name)}</p>
      <p class="plabel__phone" dir="ltr">${esc(phoneDisplay(o.customer.phone))}</p>
      <p>${esc(o.customer.zone)} · ${esc(o.customer.city)}</p>
      <p>${o.customer.area ? `${esc(o.customer.area)} — ` : ''}${esc(o.customer.address)}</p>
      ${o.customer.notes ? `<p class="plabel__notes">ملاحظة: ${esc(o.customer.notes)}</p>` : ''}
    </section>

    <section class="plabel__cod">
      <span>المبلغ المطلوب عند الاستلام</span>
      <b>${money(o.total)}</b>
    </section>

    <ul class="plabel__items">
      ${o.items.map((i) => `<li><span>${i.qty} ×</span> ${esc(i.name)} <small>(${sizeLabel(i.size)}${i.color ? ` · ${esc(i.color)}` : ''})</small></li>`).join('')}
    </ul>

    <footer class="plabel__foot">شكراً لاختيارك ${STORE.name} ♡${STORE.whatsapp ? ` · واتساب <bdi dir="ltr">${STORE.whatsapp}</bdi>` : ''}</footer>
  </article>`;

export function printLabels(orders) {
  if (!orders.length) return;
  let area = document.getElementById('printArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'printArea';
    document.body.append(area);
  }
  area.innerHTML = orders.map(labelHTML).join('');
  document.body.classList.add('printing');
  // نستنى الشعار يتحمّل قبل ما تفتح نافذة الطباعة
  const imgs = [...area.querySelectorAll('img')].filter((i) => !i.complete);
  Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(() => {
    window.print();
    document.body.classList.remove('printing');
  });
}
