// واجهة لوحة الأدمن: كل شي هون بيحتاج تسجيل دخول
import express, { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { db } from '../db.js';
import { login, logout, startSession, requireAdmin, requireSameSite, checkPassword } from '../auth.js';
import { getSettings, saveSettings } from '../settings.js';
import { rateLimit } from '../rate-limit.js';
import { invalidate } from '../cache.js';
import { IMAGE_SIZES, saveImage, markForCheck } from '../images.js';
import { BACKUP_DIR, NAME_RE, cloudReady, listBackups, listCloud, readStatus, runBackup, restoreBackup, saveUploadedBackup } from '../backup.js';
import {
  PRODUCT_INCLUDE, productOut, productIn, offerOut, offerIn, couponOut, couponIn, ORDER_INCLUDE, orderOut,
} from '../serialize.js';
import { loginSchema, orderPatchSchema, productSchema, offerSchema, couponSchema, settingsSchema, firstError } from '../validate.js';

export const adminRouter = Router();
adminRouter.use(requireSameSite);

// أي تعديل ناجح من لوحة التحكم (منتج، عرض، إعدادات، إلغاء طلب، استرجاع نسخة) بيجدد بيانات المتجر فوراً
adminRouter.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) invalidate(); });
  next();
});

const parse = (schema, body, res) => {
  const r = schema.safeParse(body);
  if (!r.success) { res.status(400).json({ error: firstError(r.error) }); return null; }
  return r.data;
};

// ===== الدخول =====
const loginLimit = rateLimit({ windowMs: 15 * 60_000, max: 8, message: 'محاولات دخول كتير — استني ربع ساعة وجربي كمان مرة' });

adminRouter.post('/login', loginLimit, async (req, res) => {
  const data = parse(loginSchema, req.body, res);
  if (!data) return;
  const result = await login(data.username, data.password);
  if (!result) return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غلط' });
  startSession(res, result.token);
  res.json({ ok: true, username: result.admin.username });
});

adminRouter.post('/logout', async (req, res) => {
  await logout(req, res);
  res.json({ ok: true });
});

// من هون ورايح: لازم تكوني مسجّلة دخول
adminRouter.use(requireAdmin);

adminRouter.get('/me', (req, res) => res.json({ username: req.admin.username }));

// ===== الطلبات =====
adminRouter.get('/orders', async (_req, res) => {
  const orders = await db.order.findMany({ include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take: 1000 });
  res.json(orders.map(orderOut));
});

adminRouter.get('/orders/:number', async (req, res) => {
  const o = await db.order.findUnique({ where: { number: req.params.number }, include: ORDER_INCLUDE });
  if (!o) return res.status(404).json({ error: 'الطلب مش موجود' });
  res.json(orderOut(o));
});

// الحالة بتمشي لقدّام بس (أو إلغاء). الإلغاء بيرجّع القطع للمخزن.
const NEXT = { new: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: [], cancelled: [] };

adminRouter.patch('/orders/:number', async (req, res) => {
  const data = parse(orderPatchSchema, req.body, res);
  if (!data) return;
  const current = await db.order.findUnique({ where: { number: req.params.number }, include: { items: true } });
  if (!current) return res.status(404).json({ error: 'الطلب مش موجود' });
  if (data.status && data.status !== current.status && !NEXT[current.status].includes(data.status)) {
    return res.status(409).json({ error: 'ما بينفع ترجّعي الطلب لحالة قبل' });
  }
  const updated = await db.$transaction(async (tx) => {
    if (data.status && data.status !== current.status) {
      await tx.orderStatus.create({ data: { orderId: current.id, status: data.status } });
      if (data.status === 'cancelled') {
        for (const i of current.items.filter((x) => x.productId)) {
          await tx.productSize.updateMany({ where: { productId: i.productId, size: i.size }, data: { qty: { increment: i.qty } } });
        }
      }
    }
    return tx.order.update({
      where: { id: current.id },
      data: { ...(data.status ? { status: data.status } : {}), ...(data.note !== undefined ? { adminNote: data.note } : {}) },
      include: ORDER_INCLUDE,
    });
  });
  res.json(orderOut(updated));
});

// ===== المنتجات =====
adminRouter.get('/products', async (_req, res) => {
  const products = await db.product.findMany({ include: PRODUCT_INCLUDE, orderBy: { id: 'asc' } });
  res.json(products.map(productOut));
});

adminRouter.get('/products/:id', async (req, res) => {
  const p = await db.product.findUnique({ where: { id: Number(req.params.id) || 0 }, include: PRODUCT_INCLUDE });
  if (!p) return res.status(404).json({ error: 'المنتج مش موجود' });
  res.json(productOut(p));
});

async function writeProduct(tx, id, p) {
  const product = id
    ? await tx.product.update({ where: { id }, data: productIn(p) })
    : await tx.product.create({ data: productIn(p) });
  await tx.productSize.deleteMany({ where: { productId: product.id } });
  await tx.productSize.createMany({ data: Object.entries(p.stock).map(([size, qty]) => ({ productId: product.id, size, qty })) });
  await tx.bundleItem.deleteMany({ where: { bundleId: product.id } });
  if (p.category === 'bundles' && p.items?.length) {
    await tx.bundleItem.createMany({
      data: p.items.map((it, position) => ({ bundleId: product.id, productId: it.id || null, name: it.id ? (it.name || null) : it.name, qty: it.qty, position })),
    });
  }
  return tx.product.findUnique({ where: { id: product.id }, include: PRODUCT_INCLUDE });
}

adminRouter.post('/products', async (req, res) => {
  const data = parse(productSchema, req.body, res);
  if (!data) return;
  const saved = await db.$transaction((tx) => writeProduct(tx, null, data));
  res.status(201).json(productOut(saved));
});

adminRouter.put('/products/:id', async (req, res) => {
  const data = parse(productSchema, req.body, res);
  if (!data) return;
  const id = Number(req.params.id);
  const before = await db.product.findUnique({ where: { id } });
  if (!before) return res.status(404).json({ error: 'المنتج مش موجود' });
  const saved = await db.$transaction((tx) => writeProduct(tx, id, data));
  // الصور اللي انشالت من المنتج ← بتنحذف من التخزين بعد 30 يوم إذا ما حدا استعملها
  await markForCheck(before.images.filter((ref) => !data.images.includes(ref))).catch(() => {});
  res.json(productOut(saved));
});

adminRouter.delete('/products/:id', async (req, res) => {
  const product = await db.product.findUnique({ where: { id: Number(req.params.id) || 0 } });
  if (product) {
    await db.product.delete({ where: { id: product.id } });
    await markForCheck(product.images).catch(() => {});
  }
  res.json({ ok: true });
});

// رفع صورة منتج: المتصفح بيبعتها جاهزة بـ 3 أحجام (400 / 800 / 1600)، وكل صفحة بتاخد الحجم اللي بيلزمها.
// إذا R2 موصول بتنحفظ على Cloudflare (أسرع وما بتتأثر بالضغط)، وإلا بمجلد public/uploads
adminRouter.post('/uploads', async (req, res) => {
  const variants = req.body?.variants || {};
  const sizes = Object.keys(variants);
  if (!sizes.length || sizes.some((w) => !IMAGE_SIZES.includes(Number(w)))) return res.status(400).json({ error: 'الصورة ناقصة' });
  const files = [];
  for (const w of sizes) {
    const m = /^data:(image\/(?:jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(variants[w] || '');
    if (!m) return res.status(400).json({ error: 'الصورة لازم تكون JPG أو WebP' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'الصورة كبيرة كتير (أكتر من 4MB)' });
    files.push({ w, type: m[1], buf });
  }
  if (new Set(files.map((f) => f.type)).size > 1) return res.status(400).json({ error: 'الأحجام لازم تكون نفس النوع' });
  const ext = files[0].type === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
  try {
    const url = await saveImage(name, ext, files);
    // لو ما انحفظ المنتج بالآخر (مثلاً سكّرتي الصفحة)، الصورة بتنحذف بعد 30 يوم
    await markForCheck([url]).catch(() => {});
    res.status(201).json({ url });
  } catch (err) {
    res.status(502).json({ error: `ما زبط رفع الصورة: ${err.message}` });
  }
});

// ===== العروض والكوبونات =====
function crud(path, model, schema, toDb, fromDb) {
  adminRouter.get(`/${path}`, async (_req, res) => {
    res.json((await db[model].findMany({ orderBy: { createdAt: 'desc' } })).map(fromDb));
  });
  adminRouter.post(`/${path}`, async (req, res) => {
    const data = parse(schema, req.body, res);
    if (!data) return;
    try {
      res.status(201).json(fromDb(await db[model].create({ data: toDb(data) })));
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'في واحد بنفس الكود' });
      throw err;
    }
  });
  adminRouter.put(`/${path}/:id`, async (req, res) => {
    const data = parse(schema, req.body, res);
    if (!data) return;
    try {
      res.json(fromDb(await db[model].update({ where: { id: req.params.id }, data: toDb(data) })));
    } catch (err) {
      if (err.code === 'P2025') return res.status(404).json({ error: 'مش موجود' });
      if (err.code === 'P2002') return res.status(409).json({ error: 'في واحد بنفس الكود' });
      throw err;
    }
  });
  adminRouter.delete(`/${path}/:id`, async (req, res) => {
    await db[model].deleteMany({ where: { id: req.params.id } });
    res.json({ ok: true });
  });
}

crud('offers', 'offer', offerSchema, offerIn, offerOut);
crud('coupons', 'coupon', couponSchema, couponIn, couponOut);

// ===== الإعدادات =====
adminRouter.get('/settings', async (_req, res) => res.json(await getSettings()));

adminRouter.put('/settings', async (req, res) => {
  const data = parse(settingsSchema, req.body, res);
  if (!data) return;
  if (data.deliveryDays.min > data.deliveryDays.max) return res.status(400).json({ error: 'مدة التوصيل مش منطقية' });
  res.json(await saveSettings(data));
});

// ===== النسخ الاحتياطية =====
adminRouter.get('/backups', async (_req, res) => {
  const [status, files] = await Promise.all([readStatus(), listBackups()]);
  const cloud = { configured: cloudReady(), files: [], error: null };
  if (cloud.configured) {
    try { cloud.files = (await listCloud()).slice(0, 30).map(({ name, size, createdAt }) => ({ name, size, createdAt })); } catch (err) { cloud.error = err.message; }
  }
  res.json({ status, files: files.slice(0, 30), cloud });
});

adminRouter.post('/backups', async (_req, res) => {
  try {
    res.status(201).json(await runBackup('manual'));
  } catch (err) {
    res.status(500).json({ error: `ما زبطت النسخة: ${err.message}` });
  }
});

// رفع ملف نسخة من برا (مثلاً على جهاز جديد). بعد الدخول بس، عشان ما حدا يبعت ملفات كبيرة
adminRouter.post('/backups/upload', express.raw({ type: 'application/octet-stream', limit: '200mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'ما وصل الملف' });
  try {
    res.status(201).json(await saveUploadedBackup(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// الاسترجاع: بيبدّل كل البيانات، فبنطلب كلمة السر كمان مرة
const restoreLimit = rateLimit({ windowMs: 15 * 60_000, max: 5, message: 'محاولات كتير — استني ربع ساعة' });

adminRouter.post('/backups/restore', restoreLimit, async (req, res) => {
  const { name, from, password } = req.body || {};
  if (!NAME_RE.test(String(name)) || !['local', 'cloud'].includes(from)) return res.status(400).json({ error: 'النسخة مش واضحة' });
  if (!(await checkPassword(req.admin.id, password))) return res.status(403).json({ error: 'كلمة السر غلط' });
  try {
    const result = await restoreBackup({ [from]: name });
    // الجلسات رجعت متل ما كانت بالنسخة — بنرجّع جلستك عشان ما تطلعي من لوحة التحكم
    await db.session.upsert({ where: { id: req.session.id }, create: req.session, update: {} }).catch(() => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `ما زبط الاسترجاع (البيانات ما تغيرت): ${err.message}` });
  }
});

// تنزيل نسخة (عشان تحتفظي فيها برا الجهاز، مثلاً على Google Drive)
adminRouter.get('/backups/:name', async (req, res) => {
  const { name } = req.params;
  if (!NAME_RE.test(name)) return res.status(400).json({ error: 'اسم مش صحيح' });
  const files = await listBackups();
  if (!files.some((f) => f.name === name)) return res.status(404).json({ error: 'النسخة مش موجودة' });
  res.download(join(BACKUP_DIR, name), name);
});
