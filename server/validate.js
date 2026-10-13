// فحص البيانات اللي بتوصل للسيرفر قبل ما تنحفظ (zod)
import { z } from 'zod';

const SIZES = ['0-3', '3-6', '6-9', '9-12', 'one'];
const CATEGORIES = ['underwear', 'clothes', 'accessories', 'bundles'];
const date = z.string().max(40).refine((s) => !Number.isNaN(Date.parse(s)), 'التاريخ مش صحيح').nullable().optional();
const int = (min = 0, max = 1_000_000) => z.coerce.number().int().min(min).max(max);

// ===== طلب من المتجر =====
export const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3, 'اكتبي الاسم الكامل').max(80).regex(/^[\u0621-\u064A\u0671-\u06D3\s]+$/, 'اكتبي الاسم بالعربي'),
    phone: z.string().trim().regex(/^(970|972)5\d{8}$/, 'اكتبي رقم جوال صحيح مع المقدمة'),
    whatsappOk: z.boolean().optional().default(true),
    zoneId: z.string().min(1, 'اختاري منطقة التوصيل').max(40),
    area: z.string().trim().min(2, 'اكتبي القرية أو المخيم أو المنطقة').max(60),
    city: z.string().trim().min(2, 'اكتبي المدينة').max(60),
    address: z.string().trim().min(4, 'اكتبي العنوان بالتفصيل').max(200),
    notes: z.string().trim().max(300).optional().default(''),
  }),
  items: z.array(z.object({
    id: int(1),
    size: z.enum(SIZES),
    color: z.string().max(30).optional().default(''),
    qty: int(1, 50),
  })).min(1, 'السلة فاضية').max(50),
  couponCode: z.string().trim().max(20).nullable().optional(),
});

// تتبع الطلب
export const trackSchema = z.object({
  tokens: z.array(z.string().min(20).max(100)).max(30),
});
// رقم الطلب أو الجوال أو الاثنين (واحد عالأقل)
export const trackLookupSchema = z.object({
  number: z.string().trim().toUpperCase().regex(/^NK-?\d{6}$/, 'رقم الطلب بيبلش بـ NK ووراه 6 أرقام').optional(),
  phone: z.string().trim().max(20).refine((p) => p.replace(/[^\d]/g, '').length >= 9, 'رقم الجوال ناقص').optional(),
}).refine((x) => x.number || x.phone, 'اكتبي رقم الطلب أو رقم الجوال');

export const couponCheckSchema = z.object({
  code: z.string().trim().min(1).max(20),
  total: z.coerce.number().min(0).max(1_000_000),
});

// ===== لوحة الأدمن =====
export const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export const orderPatchSchema = z.object({
  status: z.enum(['new', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  note: z.string().max(500).optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(CATEGORIES),
  price: int(1, 100_000),
  description: z.string().max(2000).optional().default(''),
  material: z.string().max(500).optional().nullable(),
  images: z.array(z.string().min(1).max(500)).min(1, 'ضيفي صورة وحدة عالأقل').max(12),
  colors: z.array(z.object({ name: z.string().trim().min(1).max(20), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(12).optional().default([]),
  stock: z.partialRecord(z.enum(SIZES), int(0, 100_000)).refine((s) => Object.keys(s).length > 0, 'اختاري مقاس واحد عالأقل'),
  items: z.array(z.union([
    z.object({ id: int(1), qty: int(1, 100), name: z.string().max(40).optional() }),
    z.object({ name: z.string().trim().min(1).max(40), qty: int(1, 100) }),
  ])).max(40).optional(),
  isNew: z.boolean().optional().default(false),
  visible: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
});

export const offerSchema = z.object({
  active: z.boolean(),
  label: z.string().trim().max(20).optional().default('عرض خاص'),
  title: z.string().trim().min(3).max(70),
  type: z.enum(['percent', 'fixed', 'bxgy']),
  value: int(1, 100_000).optional().nullable(),
  buy: int(1, 20).optional().nullable(),
  get: int(1, 20).optional().nullable(),
  target: z.object({ kind: z.enum(['all', 'category', 'products']), ids: z.array(z.union([z.string(), z.number()])).max(200) }),
  banner: z.boolean().optional().default(false),
  startsAt: date,
  endsAt: date,
}).refine((o) => (o.type === 'bxgy' ? o.buy && o.get : o.value), 'اكتبي قيمة العرض')
  .refine((o) => o.type !== 'percent' || o.value <= 90, 'النسبة لازم تكون 90% أو أقل')
  .refine((o) => o.target.kind === 'all' || o.target.ids.length, 'اختاري عالأقل قسم أو منتج');

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'الكود من 3 لـ 20 حرف أو رقم إنجليزي'),
  active: z.boolean(),
  type: z.enum(['percent', 'fixed', 'shipping']),
  value: int(0, 100_000).optional().default(0),
  minTotal: int(0, 1_000_000).optional().default(0),
  maxUses: int(1, 1_000_000).nullable().optional(),
  note: z.string().max(60).optional().default(''),
  startsAt: date,
  endsAt: date,
}).refine((c) => c.type === 'shipping' || c.value > 0, 'اكتبي قيمة الخصم')
  .refine((c) => c.type !== 'percent' || c.value <= 90, 'النسبة لازم تكون 90% أو أقل');

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  currency: z.string().max(4),
  freeShippingOver: int(0, 1_000_000),
  whatsapp: z.string().regex(/^((970|972)5\d{8})?$/, 'رقم واتساب مش صحيح'),
  facebook: z.string().max(200).regex(/^(https:\/\/\S+)?$/, 'رابط فيسبوك لازم يبلش بـ https://'),
  instagram: z.string().max(200).regex(/^(https:\/\/\S+)?$/, 'رابط إنستغرام لازم يبلش بـ https://'),
  announcement: z.string().max(80),
  exchangeDays: int(0, 30),
  deliveryDays: z.object({ min: int(1, 30), max: int(1, 30) }),
  weekend: z.array(int(0, 6)).max(5),
  shippingZones: z.array(z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1).max(30), fee: int(0, 10_000), days: z.string().max(20) })).min(1).max(30),
});

// رسالة عربية واحدة من أخطاء zod
export const firstError = (err) => err.issues?.[0]?.message || 'البيانات مش صحيحة';
