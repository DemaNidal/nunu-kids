// صور المنتجات: على Cloudflare R2 إذا موصول (R2_IMAGES_BUCKET + R2_IMAGES_URL)، وإلا بمجلد public/uploads
// كل صورة بـ 3 أحجام: products/<اسم>-400.webp و -800 و -1600
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { r2Configured, r2Put, r2Delete } from './r2.js';
import { db } from './db.js';

export const IMAGE_SIZES = [400, 800, 1600];
const UPLOADS = join(import.meta.dirname, '..', 'public', 'uploads');
const IMMUTABLE = 'public, max-age=31536000, immutable'; // الاسم ما بيتكرر، فالصورة ما بتتغير أبداً

const bucket = () => process.env.R2_IMAGES_BUCKET;
export const imagesOnCloud = () => r2Configured(bucket()) && !!process.env.R2_IMAGES_URL;
export const imagesUrl = () => (imagesOnCloud() ? process.env.R2_IMAGES_URL.replace(/\/$/, '') : '');

/** @param {{w: string, type: string, buf: Buffer}[]} files  @returns {Promise<string>} المرجع اللي بينحفظ بالمنتج */
export async function saveImage(name, ext, files) {
  if (imagesOnCloud()) {
    await Promise.all(files.map((f) => r2Put(bucket(), `products/${name}-${f.w}.${ext}`, f.buf, { contentType: f.type, cacheControl: IMMUTABLE })));
    return `r2:products/${name}.${ext}`;
  }
  await mkdir(UPLOADS, { recursive: true });
  await Promise.all(files.map((f) => writeFile(join(UPLOADS, `${name}-${f.w}.${ext}`), f.buf)));
  return `up:${name}.${ext}`;
}

// ===== تنظيف الصور اللي ما عادت مستعملة =====
const GRACE_DAYS = 30; // نفس مدة النسخ الاحتياطية اليومية على Cloudflare
const ORDER_DAYS = 90; // صور الطلبات الأخيرة بتضل (الزبونة بتشوفها بصفحة التتبع)
const REF = /^(r2|up):(.+)\.(webp|jpg)$/;
const isUploaded = (ref) => REF.test(ref || '');

// بنسجّل الصورة لنفحصها بعد 30 يوم (لما تنرفع، أو تنشال من منتج، أو ينحذف المنتج)
export async function markForCheck(refs) {
  const list = [...new Set(refs.filter(isUploaded))];
  if (!list.length) return;
  const since = new Date();
  await db.$transaction(list.map((ref) => db.imageCheck.upsert({ where: { ref }, create: { ref, since }, update: { since } })));
}

async function removeFiles(ref) {
  const [, where, name, ext] = REF.exec(ref);
  const keys = IMAGE_SIZES.map((w) => `${name}-${w}.${ext}`);
  if (where === 'r2') {
    if (!r2Configured(bucket())) throw new Error('R2 مش موصول');
    await Promise.all(keys.map((k) => r2Delete(bucket(), k)));
  } else {
    await Promise.all(keys.map((k) => unlink(join(UPLOADS, k)).catch((e) => { if (e.code !== 'ENOENT') throw e; })));
  }
}

export async function cleanupImages() {
  const due = await db.imageCheck.findMany({ where: { since: { lt: new Date(Date.now() - GRACE_DAYS * 86400_000) } } });
  if (!due.length) return { removed: 0, kept: 0 };
  const refs = due.map((d) => d.ref);
  // لسا مستعملة؟ بأي منتج (حتى المخفي)، أو بطلب من آخر 90 يوم
  const [products, items] = await Promise.all([
    db.product.findMany({ where: { images: { hasSome: refs } }, select: { images: true } }),
    db.orderItem.findMany({ where: { image: { in: refs }, order: { createdAt: { gt: new Date(Date.now() - ORDER_DAYS * 86400_000) } } }, select: { image: true } }),
  ]);
  const used = new Set([...products.flatMap((p) => p.images), ...items.map((i) => i.image)]);
  let removed = 0;
  for (const ref of refs) {
    try {
      if (!used.has(ref)) { await removeFiles(ref); removed++; }
      await db.imageCheck.delete({ where: { ref } });
    } catch (err) {
      console.error('  ✗ ما قدرنا نحذف صورة قديمة:', ref, err.message); // بنجرب كمان مرة بالدورة الجاية
    }
  }
  if (removed) console.log(`  🧹 انحذف ${removed} صورة ما عادت مستعملة`);
  return { removed, kept: refs.length - removed };
}

// مرة كل 6 ساعات (وأول مرة بعد دقيقة من تشغيل السيرفر)
export function scheduleImageCleanup() {
  const run = () => cleanupImages().catch((err) => console.error('  ✗ تنظيف الصور:', err.message));
  setTimeout(run, 60_000).unref();
  setInterval(run, 6 * 3600_000).unref();
}
