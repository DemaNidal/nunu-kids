// واجهة المتجر (للزبائن): بيانات المتجر، فحص الكوبون، وإرسال الطلب
import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { db } from '../db.js';
import { getSettings } from '../settings.js';
import { PRODUCT_INCLUDE, productOut, offerOut, couponPublic, ORDER_INCLUDE, orderOut, trackOut } from '../serialize.js';
import { orderSchema, couponCheckSchema, trackSchema, trackLookupSchema, firstError } from '../validate.js';
import { isLive, bestPrice, bxgyDiscounts, couponError, couponDiscount, normalizeCode } from '../../public/js/store/pricing-core.js';
import { rateLimit } from '../rate-limit.js';

export const storeRouter = Router();

const money = (n) => `${n} ₪`;
const hashToken = (t) => createHash('sha256').update(t).digest('hex');
const newToken = () => randomBytes(24).toString('base64url');
const liveOffers = async () => (await db.offer.findMany()).map(offerOut).filter((o) => isLive(o));

// ===== كل اللي بيحتاجه المتجر بطلب واحد =====
// المنتجات الظاهرة + العروض الشغّالة + الإعدادات. الكوبونات مش هون (لازم تضل سرية).
storeRouter.get('/store', async (_req, res) => {
  const [products, offers, settings] = await Promise.all([
    db.product.findMany({ where: { visible: true }, include: PRODUCT_INCLUDE, orderBy: { id: 'asc' } }),
    liveOffers(),
    getSettings(),
  ]);
  res.json({ products: products.map(productOut), offers, settings });
});

// ===== فحص كوبون =====
const couponLimit = rateLimit({ windowMs: 10 * 60_000, max: 30, message: 'جربتي كتير — استني شوي وجربي كمان مرة' });

storeRouter.post('/coupons/check', couponLimit, async (req, res) => {
  const parsed = couponCheckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'اكتبي الكود' });
  const c = await db.coupon.findUnique({ where: { code: normalizeCode(parsed.data.code) } });
  const error = couponError(c && { ...c, startsAt: c.startsAt?.toISOString(), endsAt: c.endsAt?.toISOString() }, parsed.data.total, Date.now(), money);
  if (error) return res.json({ ok: false, error });
  res.json({ ok: true, coupon: couponPublic(c) });
});

// ===== طلب جديد =====
// السيرفر بيعيد حساب كل إشي (السعر، العروض، الكوبون، التوصيل) — ما بنثق بأرقام المتصفح
class OrderError extends Error {}
const orderLimit = rateLimit({ windowMs: 10 * 60_000, max: 10, message: 'طلبات كتير بوقت قصير — استني شوي وجربي كمان مرة' });

storeRouter.post('/orders', orderLimit, async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  const { customer, items, couponCode } = parsed.data;

  const settings = await getSettings();
  const zone = settings.shippingZones.find((z) => z.id === customer.zoneId);
  if (!zone) return res.status(400).json({ error: 'اختاري منطقة التوصيل' });

  try {
    const order = await db.$transaction(async (tx) => {
      // المنتجات والأسعار من قاعدة البيانات
      const ids = [...new Set(items.map((i) => i.id))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, visible: true }, include: PRODUCT_INCLUDE });
      const byId = new Map(products.map((p) => [p.id, productOut(p)]));
      const offers = (await tx.offer.findMany()).map(offerOut).filter((o) => isLive(o));

      const lines = items.map((i) => {
        const product = byId.get(i.id);
        if (!product) throw new OrderError('في قطعة بالسلة ما عادت متوفرة — حدّثي السلة');
        if (!(i.size in product.stock)) throw new OrderError(`المقاس المختار من ${product.name} مش موجود`);
        return { ...i, product, unit: bestPrice(product, offers).price };
      });

      // المخزون: بننقص الكمية بنفس اللحظة (إذا قطعتين انطلبوا مع بعض، وحدة بس بتنجح)
      const need = new Map();
      lines.forEach((l) => { const k = `${l.id}|${l.size}`; need.set(k, (need.get(k) || 0) + l.qty); });
      for (const [k, qty] of need) {
        const [productId, size] = k.split('|');
        const updated = await tx.productSize.updateMany({
          where: { productId: Number(productId), size, qty: { gte: qty } },
          data: { qty: { decrement: qty } },
        });
        if (!updated.count) {
          const p = byId.get(Number(productId));
          throw new OrderError(`ما في كمية كافية من ${p.name} — حدّثي السلة`);
        }
      }

      const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
      const discounts = bxgyDiscounts(offers, lines);
      const afterOffers = subtotal - discounts.reduce((s, d) => s + d.amount, 0);

      // الكوبون (وعدّاد استعماله بنفس اللحظة)
      let coupon = null;
      if (couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: normalizeCode(couponCode) } });
        const error = couponError(c && { ...c, startsAt: c.startsAt?.toISOString(), endsAt: c.endsAt?.toISOString() }, afterOffers, Date.now(), money);
        if (error) throw new OrderError(error);
        const used = await tx.coupon.updateMany({
          where: { id: c.id, OR: [{ maxUses: null }, { used: { lt: c.maxUses ?? 0 } }] },
          data: { used: { increment: 1 } },
        });
        if (!used.count) throw new OrderError('الكوبون خلص استعماله');
        coupon = { ...c, ...couponDiscount(c, afterOffers) };
      }

      const freeOver = settings.freeShippingOver && afterOffers >= settings.freeShippingOver;
      const shipping = coupon?.freeShipping || freeOver ? 0 : zone.fee;
      const total = afterOffers - (coupon?.amount || 0) + shipping;

      const created = await tx.order.create({
        data: {
          number: `tmp-${Date.now()}-${Math.random()}`,
          name: customer.name, phone: customer.phone, whatsappOk: customer.whatsappOk, zone: zone.name, area: customer.area, city: customer.city,
          address: customer.address, notes: customer.notes,
          subtotal, discounts, couponCode: coupon?.code ?? null, couponAmount: coupon?.amount || 0,
          shipping, total,
          items: { create: lines.map((l) => ({ productId: l.id, name: l.product.name, size: l.size, color: l.color, qty: l.qty, unit: l.unit, image: l.product.images[0] || null })) },
          history: { create: [{ status: 'new' }] },
        },
      });
      // رقم الطلب من الرقم التسلسلي: NK-100001، NK-100002...
      const token = newToken();
      await tx.orderAccess.create({ data: { id: hashToken(token), orderId: created.id } });
      const done = await tx.order.update({ where: { id: created.id }, data: { number: `NK-${100000 + created.id}` }, include: ORDER_INCLUDE });
      return { done, token };
    });
    // المفتاح بينبعت مرة وحدة هون، والمتصفح بيحفظه عشان صفحة "تتبع طلبي"
    res.status(201).json({ order: orderOut(order.done), trackToken: order.token });
  } catch (err) {
    if (err instanceof OrderError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

// ===== تتبع الطلب =====
// الطلبات اللي مفاتيحها محفوظة على جهاز الزبونة
storeRouter.post('/track', async (req, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'طلب مش صحيح' });
  const ids = parsed.data.tokens.map(hashToken);
  const access = await db.orderAccess.findMany({ where: { id: { in: ids } }, select: { id: true, orderId: true } });
  const orders = await db.order.findMany({
    where: { id: { in: [...new Set(access.map((a) => a.orderId))] } },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  // المفاتيح اللي ما عادت شغّالة (مثلاً انحذف الطلب) — المتصفح بيشيلها
  const valid = new Set(access.map((a) => a.id));
  const dead = parsed.data.tokens.filter((t) => !valid.has(hashToken(t)));
  res.json({ orders: orders.map(trackOut), dead });
});

// من جهاز تاني: رقم الطلب + رقم الجوال
const lookupLimit = rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'محاولات كتير — استني ربع ساعة وجربي كمان مرة' });

storeRouter.post('/track/lookup', lookupLimit, async (req, res) => {
  const parsed = trackLookupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: firstError(parsed.error) });
  const number = parsed.data.number.replace(/^NK-?/, 'NK-');
  const last9 = parsed.data.phone.replace(/[^\d]/g, '').slice(-9);
  const order = await db.order.findUnique({ where: { number }, include: ORDER_INCLUDE });
  // نفس الرسالة إذا الرقم غلط أو الجوال مش مطابق (ما بنعطي تلميح)
  if (!order || last9.length < 9 || !order.phone.endsWith(last9)) {
    return res.status(404).json({ error: 'ما لقينا طلب بهاد الرقم وهاد الجوال — تأكدي منهم' });
  }
  const token = newToken();
  await db.orderAccess.create({ data: { id: hashToken(token), orderId: order.id } });
  res.json({ order: trackOut(order), trackToken: token });
});
