// دخول الأدمن: كلمة سر مشفّرة (bcrypt) + جلسة بكوكي آمن
// الرمز اللي بالكوكي عشوائي، وبقاعدة البيانات بنحفظ بصمته بس — لو حدا شاف القاعدة ما بيقدر يستعمله
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const COOKIE = 'nunu_admin';
const DAYS = 14;
const isProd = process.env.NODE_ENV === 'production';

let dummyHash = null; // للمقارنة لما الاسم مش موجود

const hashToken = (t) => createHash('sha256').update(t).digest('hex');

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function setCookie(res, value, maxAgeSec) {
  res.append('Set-Cookie', [
    `${COOKIE}=${encodeURIComponent(value)}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`,
    ...(isProd ? ['Secure'] : []),
  ].join('; '));
}

export async function login(username, password) {
  const admin = await db.admin.findUnique({ where: { username } });
  // نفس الوقت تقريباً سواء الاسم موجود أو لا (ما بنعطي تلميح)
  dummyHash ||= await bcrypt.hash('not-a-real-password', 12);
  const ok = await bcrypt.compare(password, admin?.passwordHash || dummyHash);
  if (!admin || !ok) return null;
  const token = randomBytes(32).toString('base64url');
  await db.session.create({
    data: { id: hashToken(token), adminId: admin.id, expiresAt: new Date(Date.now() + DAYS * 86400_000) },
  });
  // تنظيف الجلسات المنتهية
  db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  return { admin, token };
}

export const startSession = (res, token) => setCookie(res, token, DAYS * 86400);

export async function logout(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  setCookie(res, '', 0);
}

// middleware: بيسمح بس للأدمن المسجّل دخول
export async function requireAdmin(req, res, next) {
  const token = readCookie(req, COOKIE);
  const session = token && await db.session.findUnique({ where: { id: hashToken(token) }, include: { admin: true } });
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: 'لازم تسجلي دخول' });
  }
  req.admin = { id: session.admin.id, username: session.admin.username };
  next();
}

// حماية من الطلبات من مواقع تانية (CSRF): كل تعديل لازم يجي من صفحاتنا بهيدر خاص
export function requireSameSite(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'nunu-admin') return res.status(403).json({ error: 'طلب مش مسموح' });
  next();
}

export const hashPassword = (password) => bcrypt.hash(password, 12);
