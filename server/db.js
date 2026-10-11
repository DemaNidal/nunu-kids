// الاتصال بقاعدة البيانات (PostgreSQL عبر Prisma 7) — نسخة وحدة لكل السيرفر
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  console.error('\n  ✗ DATABASE_URL مش موجود. انسخي .env.example باسم .env وعبّي كلمة سر PostgreSQL.\n');
  process.exit(1);
}

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
