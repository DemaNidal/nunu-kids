// تعبئة قاعدة البيانات أول مرة: المنتجات والعروض والكوبونات الحالية + حساب الأدمن
// التشغيل: npm run db:seed  (آمن تشغّله أكتر من مرة — ما بيكرر البيانات)
import { db } from '../server/db.js';
import { hashPassword } from '../server/auth.js';
import { productIn, offerIn, couponIn } from '../server/serialize.js';
import { PRODUCTS } from '../public/js/data/products.js';
import { OFFERS } from '../public/js/data/offers.js';
import { COUPONS } from '../public/js/data/coupons.js';

async function seedProducts() {
  if (await db.product.count()) return console.log('  • المنتجات: موجودة من قبل — ما غيّرنا شي');
  // القطع العادية أول، وبعدين البكجات (لأنها بتشير للقطع)
  const ordered = [...PRODUCTS].sort((a, b) => (a.category === 'bundles') - (b.category === 'bundles'));
  for (const p of ordered) {
    await db.product.create({
      data: {
        id: p.id, // نفس الأرقام القديمة عشان روابط المنتجات ما تتغير
        ...productIn(p),
        sizes: { create: Object.entries(p.stock).map(([size, qty]) => ({ size, qty })) },
        bundleItems: p.items ? {
          create: p.items.map((it, position) => ({ productId: it.id || null, name: it.id ? (it.name || null) : it.name, qty: it.qty, position })),
        } : undefined,
      },
    });
  }
  // العدّاد التلقائي يكمّل بعد آخر رقم
  await db.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX(id) FROM "Product"))`);
  console.log(`  ✓ المنتجات: ${PRODUCTS.length}`);
}

async function seedOffers() {
  if (await db.offer.count()) return console.log('  • العروض: موجودة من قبل');
  for (const o of OFFERS) await db.offer.create({ data: offerIn(o) });
  console.log(`  ✓ العروض: ${OFFERS.length}`);
}

async function seedCoupons() {
  if (await db.coupon.count()) return console.log('  • الكوبونات: موجودة من قبل');
  for (const c of COUPONS) await db.coupon.create({ data: { ...couponIn(c), used: c.used || 0 } });
  console.log(`  ✓ الكوبونات: ${COUPONS.length}`);
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.includes('PUT_A_STRONG')) {
    return console.log('  ! حساب الأدمن: عبّي ADMIN_USERNAME و ADMIN_PASSWORD بملف .env وشغّلي الأمر كمان مرة');
  }
  if (password.length < 8) return console.log('  ! حساب الأدمن: كلمة السر لازم تكون 8 أحرف عالأقل');
  if (await db.admin.findUnique({ where: { username } })) return console.log(`  • حساب الأدمن "${username}": موجود من قبل`);
  await db.admin.create({ data: { username, passwordHash: await hashPassword(password) } });
  console.log(`  ✓ حساب الأدمن: ${username} (كلمة السر انحفظت مشفّرة)`);
}

console.log('\n  تعبئة قاعدة البيانات:');
try {
  await seedProducts();
  await seedOffers();
  await seedCoupons();
  await seedAdmin();
  console.log('  خلصنا ♡\n');
} finally {
  await db.$disconnect();
}
