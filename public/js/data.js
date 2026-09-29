// ============================================================
// بيانات المتجر — مؤقتاً هون، ولاحقاً رح تيجي من السيرفر
// وكل شي فيها بيتعدل من لوحة الأدمن (المنتجات، المخزون، العروض)
// ============================================================

const STORE = {
  freeShippingOver: 200, // 0 = بدون توصيل مجاني
  whatsapp: '',          // رقم الواتساب (بصيغة دولية بدون +)
  facebook: '',
  instagram: '',
  // مناطق التوصيل وأسعارها — مؤقتة، الأدمن بيعدلها
  shippingZones: [
    { id: 'wb', name: 'الضفة الغربية', fee: 20, days: '2–4 أيام' },
    { id: 'jer', name: 'القدس', fee: 30, days: '2–3 أيام' },
    { id: 'in', name: 'الداخل', fee: 60, days: '3–5 أيام' },
  ],
};

const CATEGORIES = {
  underwear: 'ملابس داخلية',
  clothes: 'أواعي وبيجامات',
  accessories: 'مستلزمات وإكسسوارات',
  bundles: 'بكجات تجهيز البيبي',
};

// ⁦…⁩ بتخلي الأرقام تنعرض بالترتيب الصحيح (0–3 مش 3–0) جوا النص العربي
const LTR = (s) => `⁦${s}⁩`;
const SIZE_LABELS = { '0-3': `${LTR('0–3')} أشهر`, '3-6': `${LTR('3–6')} أشهر`, '6-9': `${LTR('6–9')} أشهر`, '9-12': `${LTR('9–12')} شهر`, one: 'مقاس واحد' };

const IMG = (id, w = 600, h = w) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=70`;

// stock: عدد القطع المتوفرة من كل مقاس (0 = نفذ)
const PRODUCTS = [
  { id: 1, name: 'بدي قطن بقلب', category: 'underwear', price: 35, isNew: true,
    images: ['1622290319146-7b63df48a635', '1622290291720-ac961c43ee30', '1569974641446-22542de88536'],
    colors: [{ name: 'أبيض', hex: '#ffffff' }, { name: 'وردي', hex: '#EDBABC' }],
    stock: { '0-3': 8, '3-6': 4, '6-9': 0, '9-12': 2 },
    description: 'بدي ناعم من القطن 100%، بكبسات من تحت عشان تغيير الحفاض يكون سهل وسريع. قصّة مريحة بتسمح للبيبي يتحرك بحرية.',
    material: 'قطن 100% ممشط. غسيل على 30 درجة، وكوي على حرارة منخفضة.' },
  { id: 2, name: 'أوفرول نوم منقّط', category: 'clothes', price: 69, isNew: true,
    images: ['1582212742497-86a2c4495267', '1582212742235-a2500f31cb39'],
    colors: [{ name: 'أزرق فاتح', hex: '#B9D3E4' }],
    stock: { '0-3': 5, '3-6': 5, '6-9': 3, '9-12': 1 },
    description: 'أوفرول نوم بسحّاب من الرقبة للرجل، بخلّي لبس وشلح البيبي بالليل أسهل إشي. برجلين مسكّرين للدفا.',
    material: 'قطن 95%، إيلاستين 5%. غسيل على 30 درجة.' },
  { id: 3, name: 'طاقية مولود بكرة', category: 'accessories', price: 18, isNew: true,
    images: ['1622290291468-a28f7a7dc6a8'],
    colors: [{ name: 'زيتي', hex: '#8a8a5c' }, { name: 'بيج', hex: '#e8d9c4' }],
    stock: { '0-3': 10, '3-6': 6 },
    description: 'طاقية تريكو دافية بكرة لطيفة، بتحمي راس البيبي من البرد.',
    material: 'أكريليك ناعم. غسيل يدوي.' },
  { id: 4, name: 'طقم كلسات (3 أزواج)', category: 'accessories', price: 30, isNew: true,
    images: ['1542355581-caf7454785ca'],
    colors: [],
    stock: { '0-3': 12, '3-6': 9, '6-9': 7 },
    description: '3 أزواج كلسات قطن بألوان مختلفة، بأسفل مانع للتزحلق.',
    material: 'قطن 80%، بوليستر 20%.' },
  { id: 5, name: 'مريول قطن مزدوج', category: 'accessories', price: 15, isNew: true,
    images: ['1622290291165-d341f1938b8a'],
    colors: [],
    stock: { one: 20 },
    description: 'مريول بطبقتين بيمتص كويس، بكبسة من ورا.',
    material: 'قطن 100%.' },
  { id: 6, name: 'لفّة مولود ناعمة', category: 'accessories', price: 60, isNew: true,
    images: ['1559454403-b8fb88521f11', '1616666428759-679a7d578307'],
    colors: [{ name: 'كريمي', hex: '#FAEDCD' }],
    stock: { '0-3': 4 },
    description: 'لفّة تريكو ناعمة ودافية، مثالية لطلعة البيبي من المستشفى.',
    material: 'قطن محبوك. غسيل على 30 درجة.' },
  { id: 7, name: 'بدي كم طويل', category: 'underwear', price: 45, isNew: true,
    images: ['1703282581360-a3685b2d52ac'],
    colors: [{ name: 'بيج', hex: '#d9b99b' }],
    stock: { '3-6': 6, '6-9': 6, '9-12': 3 },
    description: 'بدي بكم طويل لأيام البرد، بقبة مريحة ما بتضايق رقبة البيبي.',
    material: 'قطن 100%.' },
  { id: 8, name: 'بيجامة قطعتين', category: 'clothes', price: 65, isNew: true,
    images: ['1766918780914-5df4a5a98c44', '1766918780916-228d10b071be'],
    colors: [{ name: 'نعناعي', hex: '#9CCFCE' }, { name: 'وردي', hex: '#F9B2BC' }],
    stock: { '6-9': 5, '9-12': 5 },
    description: 'بيجامة بلوزة وبنطلون بخصر مطاطي ناعم.',
    material: 'قطن 100%.' },

  // ===== البكجات =====
  { id: 101, name: 'بكج الاستقبال', category: 'bundles', price: 249, featured: false,
    images: ['1569974641446-22542de88536', '1768693602418-260d828b878d'],
    contents: ['5 بدي قطن', '2 أوفرول نوم', 'طاقية', 'كلسات', 'مريول'], count: 10,
    stock: { '0-3': 6, '3-6': 4 },
    description: 'كل اللي بتحتاجيه لأول أسابيع البيبي، بطلب واحد.' },
  { id: 102, name: 'جهاز المولود الكامل', category: 'bundles', price: 569, featured: true,
    images: ['1635874714425-c342060a4c58', '1766918780914-e19d9de76d85'],
    contents: ['8 بدي قطن', '4 أوفرول نوم', '2 بيجامة', '2 طاقية', '3 كلسات', 'لفّة مولود', '2 مريول'], count: 22,
    stock: { '0-3': 3, '3-6': 2 },
    description: 'الجهاز الكامل للبيبي من أول يوم، مرتب ومغلف كهدية.' },
  { id: 103, name: 'بكج المستشفى', category: 'bundles', price: 185, featured: false,
    images: ['1582212742235-a2500f31cb39', '1773243086631-962baefccd8a'],
    contents: ['طقم خروج من المستشفى', '2 بدي', 'لفّة مولود', 'طاقية وقفازات', 'كلسات'], count: 7,
    stock: { '0-3': 8 },
    description: 'شنطة المستشفى جاهزة: كل اللي بيحتاجه البيبي بأول يومين.' },
];

// ============================================================
// العروض — الأدمن بيضيفها ويشغّلها ويطفّيها. إذا ما في عرض فعّال،
// كل عناصر العروض بالموقع بتختفي لحالها.
//
// type:  'percent' خصم نسبة | 'fixed' خصم مبلغ | 'bxgy' اشتري X وخذ Y
// target: { kind: 'all' } | { kind: 'category', ids: [...] } | { kind: 'products', ids: [...] }
// hero: يظهر بالبانر الرئيسي مع عداد | banner: يظهر كبانر بالصفحة الرئيسية
// ============================================================
const OFFERS = [
  { id: 'o1', active: true, label: 'عرض الأسبوع', title: 'خصم 20% على كل بكجات تجهيز المولود',
    type: 'percent', value: 20, target: { kind: 'category', ids: ['bundles'] },
    startsAt: null, endsAt: '2026-10-09T23:59:00', hero: true },
  { id: 'o2', active: true, label: 'عرض خاص', title: 'اشتري 3 قطع داخلي والرابعة علينا',
    type: 'bxgy', buy: 3, get: 1, target: { kind: 'category', ids: ['underwear'] },
    startsAt: null, endsAt: null, banner: true },
  { id: 'o3', active: true, label: 'خصم', title: 'خصم 20% على أوفرول النوم والكلسات',
    type: 'percent', value: 20, target: { kind: 'products', ids: [2, 4] },
    startsAt: null, endsAt: null },
];

// للمعاينة بس (لحد ما نبني لوحة الأدمن): ?offers=off بيطفي كل العروض
if (new URLSearchParams(location.search).get('offers') === 'off') OFFERS.forEach((o) => (o.active = false));

// ===== محرّك العروض =====
const isLive = (o, now = Date.now()) =>
  o.active && (!o.startsAt || now >= Date.parse(o.startsAt)) && (!o.endsAt || now < Date.parse(o.endsAt));

const liveOffers = () => OFFERS.filter((o) => isLive(o));

const targets = (o, p) =>
  o.target.kind === 'all' ||
  (o.target.kind === 'category' && o.target.ids.includes(p.category)) ||
  (o.target.kind === 'products' && o.target.ids.includes(p.id));

// سعر المنتج بعد أفضل خصم مباشر فعّال عليه (إن وجد)
function priceOf(p) {
  let best = null;
  for (const o of liveOffers()) {
    if (!targets(o, p) || o.type === 'bxgy') continue;
    const price = o.type === 'percent' ? Math.round(p.price * (1 - o.value / 100)) : Math.max(0, p.price - o.value);
    if (!best || price < best.price) best = { price, offer: o };
  }
  if (!best) return { price: p.price, old: null, pct: 0, offer: null };
  return { price: best.price, old: p.price, pct: Math.round((1 - best.price / p.price) * 100), offer: best.offer };
}

// عروض "اشتري X وخذ Y" اللي بتنطبق على منتج
const bxgyFor = (p) => liveOffers().filter((o) => o.type === 'bxgy' && targets(o, p));

const findProduct = (id) => PRODUCTS.find((p) => p.id === +id);
const sizesOf = (p) => Object.keys(p.stock);
const inStock = (p) => Object.values(p.stock).some((n) => n > 0);
const money = (n) => `${n} ₪`;

// حساب السلة: المجموع، خصومات "اشتري X وخذ Y"، والتوصيل المجاني
function cartTotals(cart) {
  const lines = cart.map((l) => {
    const p = findProduct(l.id);
    return { ...l, p, unit: priceOf(p).price };
  }).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const discounts = [];
  for (const o of liveOffers().filter((x) => x.type === 'bxgy')) {
    const units = lines.filter((l) => targets(o, l.p)).flatMap((l) => Array(l.qty).fill(l.unit)).sort((a, b) => a - b);
    const free = Math.floor(units.length / (o.buy + o.get)) * o.get;
    const amount = units.slice(0, free).reduce((s, u) => s + u, 0);
    if (amount) discounts.push({ title: o.title, amount });
  }
  const total = subtotal - discounts.reduce((s, d) => s + d.amount, 0);
  return { lines, subtotal, discounts, total, count: lines.reduce((s, l) => s + l.qty, 0) };
}
