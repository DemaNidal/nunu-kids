// صفحة المنتج (وصفحة البكج كمان)
const product = findProduct(new URLSearchParams(location.search).get('id'));
const state = { size: null, color: null, qty: 1, img: 0 };

if (!product) {
  $('#pdp').innerHTML = `
    <div class="notfound">
      <h1>المنتج مش موجود</h1>
      <p>يمكن انحذف أو الرابط غلط.</p>
      <a href="index.html" class="btn btn--primary">ارجعي للرئيسية</a>
    </div>`;
  $('#related').hidden = true;
} else {
  renderProduct();
  Behavior.track('view', product);
}

function renderProduct() {
  const p = product;
  const pr = priceOf(p);
  const deals = bxgyFor(p);
  const isBundle = p.category === 'bundles';
  const sizes = sizesOf(p);
  if (sizes.length === 1 && p.stock[sizes[0]] > 0) state.size = sizes[0];
  if (p.colors && p.colors.length) state.color = p.colors[0].name;

  document.title = `${p.name} | NUNU KIDS`;
  $('#crumbs').innerHTML = `
    <a href="index.html">الرئيسية</a><span>/</span>
    <a href="index.html#${isBundle ? 'bundles' : 'types'}">${CATEGORIES[p.category]}</a><span>/</span>
    <b>${esc(p.name)}</b>`;

  $('#pdp').innerHTML = `
    <div class="gallery">
      <div class="gallery__main" id="gMain">
        ${p.images.map((id, i) => `<img src="${IMG(id, 900)}" alt="${esc(p.name)} صورة ${i + 1}" ${i ? 'loading="lazy"' : ''}>`).join('')}
      </div>
      ${p.images.length > 1 ? `
      <div class="gallery__thumbs">
        ${p.images.map((id, i) => `<button data-img="${i}" class="${i ? '' : 'on'}" aria-label="صورة ${i + 1}"><img src="${IMG(id, 160)}" alt=""></button>`).join('')}
      </div>` : ''}
      <div class="card__badges">
        ${p.isNew ? '<span class="badge badge--new">جديد</span>' : ''}
        ${pr.pct ? `<span class="badge badge--sale">خصم ${pr.pct}%</span>` : ''}
      </div>
    </div>

    <div class="info">
      <h1>${esc(p.name)}</h1>
      ${isBundle ? `<p class="info__sub">${p.count} قطعة، مغلفة ومرتبة كهدية</p>` : ''}

      <div class="info__price">
        <b id="priceNow">${money(pr.price)}</b>
        ${pr.old ? `<s>${money(pr.old)}</s><span class="save">وفّري ${money(pr.old - pr.price)}</span>` : ''}
      </div>

      ${pr.offer && pr.offer.endsAt ? `
      <div class="offer-box" id="offerTimer">
        <span>العرض بينتهي خلال</span>
        <div class="mini-count"><span><b data-u="d">00</b> يوم</span><span><b data-u="h">00</b> ساعة</span><span><b data-u="m">00</b> دقيقة</span><span><b data-u="s">00</b> ثانية</span></div>
      </div>` : ''}
      ${deals.map((o) => `
      <div class="offer-box offer-box--deal">
        <svg class="ic"><use href="#i-gift-s"/></svg>
        <div><b>${esc(o.title)}</b><small>العرض بيتطبق تلقائياً بالسلة</small></div>
      </div>`).join('')}

      ${isBundle ? `
      <div class="contents">
        <h3>شو بيحتوي البكج؟</h3>
        <ul>${p.contents.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>` : ''}

      ${p.colors && p.colors.length ? `
      <div class="opt">
        <div class="opt__head"><span>اللون: <b id="colorName">${esc(state.color)}</b></span></div>
        <div class="swatches">
          ${p.colors.map((c, i) => `<button class="swatch ${i ? '' : 'on'}" data-color="${esc(c.name)}" style="--c:${c.hex}" aria-label="${esc(c.name)}"></button>`).join('')}
        </div>
      </div>` : ''}

      <div class="opt">
        <div class="opt__head">
          <span>المقاس (عمر البيبي)</span>
          <button class="link-btn" id="openGuide">دليل المقاسات</button>
        </div>
        <div class="size-btns">
          ${sizes.map((s) => `<button data-size="${s}" class="${state.size === s ? 'on' : ''}" ${p.stock[s] ? '' : 'disabled'}>${SIZE_LABELS[s]}</button>`).join('')}
        </div>
        <p class="opt__msg" id="sizeMsg" aria-live="polite"></p>
      </div>

      <div class="buy">
        <div class="qty qty--lg">
          <button id="qtyPlus" aria-label="زيادة">+</button>
          <span id="qtyVal">1</span>
          <button id="qtyMinus" aria-label="نقصان">−</button>
        </div>
        <button class="btn btn--primary" id="addBtn" ${inStock(p) ? '' : 'disabled'}>${inStock(p) ? 'أضيفي للسلة' : 'نفذت الكمية'}</button>
      </div>

      <ul class="perks">
        <li><svg class="ic"><use href="#i-cash"/></svg> الدفع نقداً عند الاستلام</li>
        <li><svg class="ic"><use href="#i-truck"/></svg> التوصيل خلال 2–4 أيام عمل</li>
        <li><svg class="ic"><use href="#i-swap"/></svg> تبديل المقاس خلال 7 أيام</li>
      </ul>

      <div class="acc">
        <details open><summary>الوصف</summary><p>${esc(p.description)}</p></details>
        ${p.material ? `<details><summary>الخامة والعناية</summary><p>${esc(p.material)}</p></details>` : ''}
        <details><summary>التوصيل والتبديل</summary><p>بنوصل لكل المناطق والدفع عند الاستلام. إذا المقاس ما زبط، بتقدري تبدليه خلال 7 أيام بشرط تكون القطعة بحالتها الأصلية وعليها التيكيت.</p></details>
      </div>
    </div>`;

  // شريط الموبايل
  $('#buybar').innerHTML = `
    <div class="buybar__price"><b>${money(pr.price)}</b>${pr.old ? `<s>${money(pr.old)}</s>` : ''}</div>
    <button class="btn btn--primary" id="addBtn2" ${inStock(p) ? '' : 'disabled'}>${inStock(p) ? 'أضيفي للسلة' : 'نفذت الكمية'}</button>`;

  if (pr.offer && pr.offer.endsAt) countdown($('#offerTimer'), pr.offer.endsAt, () => location.reload());
  bindEvents();
  updateStockMsg();
  renderExtras();
}

function bindEvents() {
  const p = product;
  const main = $('#gMain');
  const showImg = (i) => {
    state.img = i;
    main.scrollTo({ left: -i * main.clientWidth, behavior: 'smooth' });
    $$('.gallery__thumbs button').forEach((b, j) => b.classList.toggle('on', j === i));
  };
  $$('.gallery__thumbs button').forEach((b) => (b.onclick = () => showImg(+b.dataset.img)));
  main.addEventListener('scroll', () => {
    const i = Math.round(Math.abs(main.scrollLeft) / main.clientWidth);
    $$('.gallery__thumbs button').forEach((b, j) => b.classList.toggle('on', j === i));
  }, { passive: true });

  $$('[data-color]').forEach((b) => (b.onclick = () => {
    state.color = b.dataset.color;
    $$('[data-color]').forEach((x) => x.classList.toggle('on', x === b));
    $('#colorName').textContent = state.color;
  }));

  $$('[data-size]').forEach((b) => (b.onclick = () => {
    state.size = b.dataset.size;
    Behavior.track('size', { size: state.size });
    $$('[data-size]').forEach((x) => x.classList.toggle('on', x === b));
    $('.size-btns').classList.remove('error');
    if (state.qty > p.stock[state.size]) setQty(p.stock[state.size]);
    updateStockMsg();
  }));

  const setQty = (n) => {
    const max = state.size ? p.stock[state.size] : 10;
    state.qty = Math.max(1, Math.min(n, max));
    $('#qtyVal').textContent = state.qty;
  };
  $('#qtyPlus').onclick = () => setQty(state.qty + 1);
  $('#qtyMinus').onclick = () => setQty(state.qty - 1);

  const add = () => {
    if (!state.size) {
      $('.size-btns').classList.add('error');
      $('#sizeMsg').textContent = 'اختاري المقاس أول';
      $('#sizeMsg').className = 'opt__msg opt__msg--err';
      $('.size-btns').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const already = Cart.items.filter((l) => l.id === p.id && l.size === state.size).reduce((s, l) => s + l.qty, 0);
    if (already + state.qty > p.stock[state.size]) {
      $('#sizeMsg').textContent = `ما في أكثر من ${p.stock[state.size]} قطع من هاد المقاس، وعندك ${already} بالسلة`;
      $('#sizeMsg').className = 'opt__msg opt__msg--err';
      return;
    }
    Cart.add(p.id, state.size, state.color || '', state.qty);
    toast('انضافت للسلة');
    openCart(true);
  };
  $('#addBtn').onclick = add;
  $('#addBtn2').onclick = add;

  const guide = $('#sizeGuide');
  $('#openGuide').onclick = () => guide.showModal();
  guide.addEventListener('click', (e) => { if (e.target === guide || e.target.closest('[data-close]')) guide.close(); });
}

function updateStockMsg() {
  const msg = $('#sizeMsg');
  if (!state.size) { msg.textContent = ''; return; }
  const n = product.stock[state.size];
  msg.className = 'opt__msg' + (n <= 3 ? ' opt__msg--low' : '');
  msg.textContent = n <= 3 ? `باقي ${n} ${n === 1 ? 'قطعة' : 'قطع'} بس من هاد المقاس` : 'متوفر';
}

function renderExtras() {
  const p = product;
  // مقترحات حسب القطعة الحالية وتصرفات الزبونة
  $('#relatedGrid').innerHTML = recommend({ exclude: [p.id], similarTo: p, cart: Cart.items }).map(productCard).join('');

  // شفتيها مؤخراً
  const recent = Behavior.recentlyViewed([p.id]).slice(0, 4);
  if (recent.length >= 2) {
    $('#recent').hidden = false;
    $('#recentGrid').innerHTML = recent.map(productCard).join('');
  }

  // اقتراح بكج للقطع العادية
  if (p.category === 'bundles') return;
  const b = PRODUCTS.filter((x) => x.category === 'bundles').sort((a, c) => (c.featured ? 1 : 0) - (a.featured ? 1 : 0))[0];
  const bp = priceOf(b);
  $('#upsell').hidden = false;
  $('#upsell').innerHTML = `
    <div class="container">
      <a href="product.html?id=${b.id}" class="upsell">
        <img src="${IMG(b.images[0], 500, 360)}" alt="${esc(b.name)}" loading="lazy">
        <div>
          <span class="pill pill--sale">وفّري أكثر</span>
          <h3>بتجهزي للبيبي؟ جربي ${esc(b.name)}</h3>
          <p>${b.count} قطعة بطلب واحد${bp.old ? `، ووفّري ${money(bp.old - bp.price)}` : ''}</p>
          <div class="price ${bp.old ? 'price--sale' : ''}"><b>${money(bp.price)}</b>${bp.old ? `<s>${money(bp.old)}</s>` : ''}</div>
        </div>
      </a>
    </div>`;
}
