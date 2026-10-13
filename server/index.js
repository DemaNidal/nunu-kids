// سيرفر NUNU KIDS: بيعرض صفحات المتجر ولوحة الأدمن، وفيه الـ API المربوط بقاعدة البيانات
// التشغيل: npm start (أو npm run dev عشان يعيد التشغيل لحاله لما تعدّلي الكود)
import express from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { db } from './db.js';
import { storeRouter } from './routes/store.js';
import { adminRouter } from './routes/admin.js';
import { scheduleBackups } from './backup.js';
import { scheduleImageCleanup } from './images.js';

const PORT = Number(process.env.PORT) || 5173;
const PUBLIC = join(import.meta.dirname, '..', 'public');
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // عشان عنوان الزبونة الحقيقي لما يكون في سيرفر قدّامنا

// هيدرات أمان بسيطة لكل الردود
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});

// ===== الـ API =====
app.use('/api/admin/uploads', express.json({ limit: '6mb' }));
app.use('/api', express.json({ limit: '200kb' }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', storeRouter);
app.use('/api/admin', adminRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'مش موجود' }));

// ===== الصفحات والملفات =====
// no-cache: المتصفح بيتأكد إذا الملف تغيّر كل مرة (مهم وإحنا عم نطوّر)
// الكاش بالمتصفح (وبعدين بـ Cloudflare):
// - الصور المرفوعة اسمها ما بيتكرر ← سنة كاملة
// - صور وأيقونات الموقع ← يوم، وبعده بتتجدد بالخلفية بدون ما الزبونة تستنى
// - الصفحات و CSS و JS ← بتتفحص كل مرة (رد 304 صغير وسريع)، عشان أي تعديل يبين فوراً
const cacheFor = (path) => {
  if (/[\\/]uploads[\\/]/.test(path)) return 'public, max-age=31536000, immutable';
  if (/\.(webp|png|jpe?g|svg|ico|woff2?)$/i.test(path)) return 'public, max-age=86400, stale-while-revalidate=604800';
  return 'no-cache';
};
app.use(express.static(PUBLIC, { extensions: ['html'], setHeaders: (res, path) => res.set('Cache-Control', cacheFor(path)) }));

// صفحة مش موجودة ← صفحة 404 اللطيفة. ملف ناقص (صورة، css...) ← رد قصير
app.use(async (req, res) => {
  const isPage = !/\.[a-z0-9]+$/i.test(req.path) || req.path.endsWith('.html');
  if (!isPage) return res.status(404).type('text').send('مش موجود');
  res.status(404).type('html').send(await readFile(join(PUBLIC, '404.html')));
});

// أي خطأ مش متوقع: بنسجّله عندنا، والزبونة بتشوف رسالة عامة
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`, err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'البيانات كبيرة كتير' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'البيانات مش مفهومة' });
  res.status(500).json({ error: 'صار خطأ عندنا — جربي كمان شوي' });
});

// نتأكد إنه قاعدة البيانات شغّالة قبل ما نفتح السيرفر
try {
  await db.$queryRaw`SELECT 1`;
} catch (err) {
  console.error('\n  ✗ ما قدرنا نوصل لقاعدة البيانات. تأكدي إنه PostgreSQL شغّال، وإنه DATABASE_URL بملف .env صحيح.\n');
  console.error(' ', err.message, '\n');
  process.exit(1);
}

scheduleBackups();
scheduleImageCleanup();

app.listen(PORT, () => {
  console.log('\n  NUNU KIDS شغّال (مع قاعدة البيانات):');
  console.log(`  المتجر:           http://localhost:${PORT}`);
  console.log(`  لوحة التحكم:      http://localhost:${PORT}/admin/`);
  // عنوان الجهاز على الشبكة — للفتح من الموبايل (لازم يكون على نفس الواي فاي)
  for (const net of Object.values(networkInterfaces()).flat()) {
    if (net.family === 'IPv4' && !net.internal) console.log(`  من الموبايل:      http://${net.address}:${PORT}`);
  }
  console.log('');
});
