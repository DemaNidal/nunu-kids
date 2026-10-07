// المنتجات والبكجات — مؤقتاً هون، ولاحقاً من السيرفر (لوحة الأدمن)
// stock: عدد القطع من كل مقاس (0 = نفذ)
// images: أرقام صور Unsplash مؤقتة
// items (للبكجات): { id: رقم المنتج, qty: الكمية } أو { name, qty } لقطعة مش موجودة لحالها بالمتجر

export const PRODUCTS = [
  {
    id: 1, name: 'بدي قطن بقلب', category: 'underwear', price: 35, isNew: true,
    images: ['1622290319146-7b63df48a635', '1622290291720-ac961c43ee30', '1569974641446-22542de88536'],
    colors: [{ name: 'أبيض', hex: '#ffffff' }, { name: 'وردي', hex: '#EDBABC' }],
    stock: { '0-3': 8, '3-6': 4, '6-9': 0, '9-12': 2 },
    description: 'بدي ناعم من القطن 100%، بكبسات من تحت عشان تغيير الحفاض يكون سهل وسريع. قصّة مريحة بتسمح للبيبي يتحرك بحرية.',
    material: 'قطن 100% ممشط. غسيل على 30 درجة، وكوي على حرارة منخفضة.',
  },
  {
    id: 2, name: 'أوفرول نوم منقّط', category: 'clothes', price: 69, isNew: true,
    images: ['1582212742497-86a2c4495267', '1582212742235-a2500f31cb39'],
    colors: [{ name: 'أزرق فاتح', hex: '#B9D3E4' }],
    stock: { '0-3': 5, '3-6': 5, '6-9': 3, '9-12': 1 },
    description: 'أوفرول نوم بسحّاب من الرقبة للرجل، بخلّي لبس وشلح البيبي بالليل أسهل إشي. برجلين مسكّرين للدفا.',
    material: 'قطن 95%، إيلاستين 5%. غسيل على 30 درجة.',
  },
  {
    id: 3, name: 'طاقية مولود بكرة', category: 'accessories', price: 18, isNew: true,
    images: ['1622290291468-a28f7a7dc6a8'],
    colors: [{ name: 'زيتي', hex: '#8a8a5c' }, { name: 'بيج', hex: '#e8d9c4' }],
    stock: { '0-3': 10, '3-6': 6 },
    description: 'طاقية تريكو دافية بكرة لطيفة، بتحمي راس البيبي من البرد.',
    material: 'أكريليك ناعم. غسيل يدوي.',
  },
  {
    id: 4, name: 'طقم كلسات (3 أزواج)', category: 'accessories', price: 30, isNew: true,
    images: ['1542355581-caf7454785ca'],
    colors: [],
    stock: { '0-3': 12, '3-6': 9, '6-9': 7 },
    description: '3 أزواج كلسات قطن بألوان مختلفة، بأسفل مانع للتزحلق.',
    material: 'قطن 80%، بوليستر 20%.',
  },
  {
    id: 5, name: 'مريول قطن مزدوج', category: 'accessories', price: 15, isNew: true,
    images: ['1622290291165-d341f1938b8a'],
    colors: [],
    stock: { one: 20 },
    description: 'مريول بطبقتين بيمتص كويس، بكبسة من ورا.',
    material: 'قطن 100%.',
  },
  {
    id: 6, name: 'لفّة مولود ناعمة', category: 'accessories', price: 60, isNew: true,
    images: ['1704649917342-a6aaac5a9009', '1559454403-b8fb88521f11'],
    colors: [{ name: 'كريمي', hex: '#FAEDCD' }],
    stock: { '0-3': 4 },
    description: 'لفّة تريكو ناعمة ودافية، مثالية لطلعة البيبي من المستشفى.',
    material: 'قطن محبوك. غسيل على 30 درجة.',
  },
  {
    id: 7, name: 'بدي كم طويل', category: 'underwear', price: 45, isNew: true,
    images: ['1703282581360-a3685b2d52ac'],
    colors: [{ name: 'بيج', hex: '#d9b99b' }],
    stock: { '3-6': 6, '6-9': 6, '9-12': 3 },
    description: 'بدي بكم طويل لأيام البرد، بقبة مريحة ما بتضايق رقبة البيبي.',
    material: 'قطن 100%.',
  },
  {
    id: 8, name: 'بيجامة قطعتين', category: 'clothes', price: 65, isNew: true,
    images: ['1766918780914-5df4a5a98c44', '1766918780916-228d10b071be'],
    colors: [{ name: 'نعناعي', hex: '#9CCFCE' }, { name: 'وردي', hex: '#F9B2BC' }],
    stock: { '6-9': 5, '9-12': 5 },
    description: 'بيجامة بلوزة وبنطلون بخصر مطاطي ناعم.',
    material: 'قطن 100%.',
  },

  // ===== البكجات =====
  {
    id: 101, name: 'بكج الاستقبال', category: 'bundles', price: 249,
    images: ['1768693602418-260d828b878d', '1569974641446-22542de88536'],
    items: [{ id: 1, qty: 5 }, { id: 2, qty: 2 }, { id: 3, qty: 1 }, { id: 4, qty: 1 }, { id: 5, qty: 1 }],
    stock: { '0-3': 6, '3-6': 4 },
    description: 'كل اللي بتحتاجيه لأول أسابيع البيبي، بطلب واحد.',
  },
  {
    id: 102, name: 'جهاز المولود الكامل', category: 'bundles', price: 569, featured: true,
    images: ['1635874714425-c342060a4c58', '1766918780916-228d10b071be'],
    items: [{ id: 1, qty: 8 }, { id: 2, qty: 4 }, { id: 8, qty: 2 }, { id: 3, qty: 2 }, { id: 4, qty: 3 }, { id: 6, qty: 1 }, { id: 5, qty: 2 }],
    stock: { '0-3': 3, '3-6': 2 },
    description: 'الجهاز الكامل للبيبي من أول يوم، مرتب ومغلف كهدية.',
  },
  {
    id: 103, name: 'بكج المستشفى', category: 'bundles', price: 185,
    images: ['1602177719680-959794b0d81c', '1773243086631-962baefccd8a'],
    items: [{ name: 'طقم خروج من المستشفى', qty: 1 }, { id: 1, qty: 2 }, { id: 6, qty: 1 }, { id: 3, qty: 2, name: 'طاقية وقفازات' }, { id: 4, qty: 1 }],
    stock: { '0-3': 8 },
    description: 'شنطة المستشفى جاهزة: كل اللي بيحتاجه البيبي بأول يومين.',
  },
];
