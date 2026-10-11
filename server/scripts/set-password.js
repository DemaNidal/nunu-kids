// تغيير كلمة سر الأدمن: غيّري ADMIN_PASSWORD بملف .env، وبعدين: npm run admin:password
// (كل الجلسات المفتوحة بتسكّر، يعني لازم تسجلي دخول من جديد)
import { db } from '../db.js';
import { hashPassword } from '../auth.js';

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

try {
  if (!username || !password || password.length < 8) {
    console.log('\n  ! لازم ADMIN_USERNAME و ADMIN_PASSWORD (8 أحرف عالأقل) بملف .env\n');
    process.exitCode = 1;
  } else {
    const passwordHash = await hashPassword(password);
    const admin = await db.admin.upsert({ where: { username }, create: { username, passwordHash }, update: { passwordHash } });
    await db.session.deleteMany({ where: { adminId: admin.id } });
    console.log(`\n  ✓ انحفظت كلمة السر الجديدة لـ ${username} (مشفّرة)\n`);
  }
} finally {
  await db.$disconnect();
}
