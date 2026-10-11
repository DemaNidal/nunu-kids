// إعدادات Prisma: وين التصميم، وين الـ migrations، ورابط قاعدة البيانات (من ملف .env)
import { defineConfig } from 'prisma/config';

try { process.loadEnvFile('.env'); } catch { /* على السيرفر الحقيقي المتغيرات بتيجي من الاستضافة */ }

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --env-file-if-exists=.env prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
