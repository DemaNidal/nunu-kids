// النسخ الاحتياطي لقاعدة البيانات (pg_dump) — يدوي من لوحة التحكم، وتلقائي كل يوم
// الملفات بمجلد backups/ (مش بينرفع على GitHub لأنه فيه معلومات الزبائن)،
// ونسخة مشفّرة على Cloudflare R2 إذا مفاتيحه موجودة بملف .env
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readdir, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { r2Configured, r2Put, r2Get, r2Delete, r2List } from './r2.js';

export const BACKUP_DIR = resolve(process.env.BACKUP_DIR || join(import.meta.dirname, '..', 'backups'));
const STATUS_FILE = join(BACKUP_DIR, 'status.json');
const LOCAL_KEEP = { daily: 14, weekly: 8 }; // آخر 14 نسخة، وفوقهم نسخة من كل أسبوع لـ 8 أسابيع
const CLOUD_KEEP = { daily: 30, weekly: 26 }; // أونلاين بنخلي أكتر: شهر كامل، ونسخة أسبوعية لنص سنة
const CLOUD_PREFIX = 'backups/';
const BUCKET = () => process.env.R2_BACKUP_BUCKET;
export const cloudReady = () => r2Configured(BUCKET());
export const NAME_RE = /^nunu-\d{4}-\d{2}-\d{2}_\d{4}(\d{2})?(-[a-z]+)?\.dump$/;

// وين pg_dump؟ (PG_BIN بملف .env، أو مجلد PostgreSQL العادي على ويندوز، أو الموجود بالـ PATH)
export function pgTool(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  if (process.env.PG_BIN) return join(process.env.PG_BIN, exe);
  const base = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const versions = readdirSync(base).filter((v) => existsSync(join(base, v, 'bin', exe))).sort((a, b) => b - a);
    if (versions.length) return join(base, versions[0], 'bin', exe);
  }
  return exe;
}

// بيانات الاتصال من DATABASE_URL كمتغيرات (عشان كلمة السر ما تبين بأوامر النظام)
export function pgEnv() {
  const url = new URL(process.env.DATABASE_URL);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
  };
}

export function run(cmd, args, env) {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { env, windowsHide: true });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => fail(new Error(`ما لقينا ${cmd} — حطي مسار PostgreSQL بـ PG_BIN بملف .env (${e.message})`)));
    child.on('close', (code) => (code === 0 ? ok() : fail(new Error(err.trim() || `${cmd} وقف بخطأ ${code}`))));
  });
}

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

// اسم جديد ما بيدوس على نسخة موجودة (لو انعملت نسختين بنفس الثانية)
function freshName(suffix) {
  const d = new Date();
  let name;
  do {
    name = `nunu-${stamp(d)}${suffix}.dump`;
    d.setSeconds(d.getSeconds() + 1);
  } while (existsSync(join(BACKUP_DIR, name)));
  return name;
}
const kb = (n) => `${Math.max(1, Math.round(n / 1024))} KB`;

// ===== الحالة =====
async function writeStatus(patch) {
  const current = await readStatus();
  await writeFile(STATUS_FILE, JSON.stringify({ ...current, ...patch }, null, 2));
}

export async function readStatus() {
  try { return JSON.parse(await readFile(STATUS_FILE, 'utf8')); } catch { return {}; }
}

// ===== التشفير (للنسخة اللي على الإنترنت) =====
// AES-256-GCM بمفتاح من BACKUP_KEY. الملف: NUNUENC1 + salt + iv + المشفّر + tag
// ⚠️ بدون BACKUP_KEY ما في طريقة نفتح النسخ المشفّرة — لازم ينحفظ بمكان آمن
const MAGIC = Buffer.from('NUNUENC1');
export const isEncrypted = (buf) => buf.subarray(0, 8).equals(MAGIC);
export const isDump = (buf) => buf.subarray(0, 5).toString() === 'PGDMP';

function keyFrom(salt) {
  if (!process.env.BACKUP_KEY || process.env.BACKUP_KEY.length < 16) {
    throw new Error('لازم BACKUP_KEY بملف .env (16 حرف عالأقل) عشان نشفّر النسخة');
  }
  return scryptSync(process.env.BACKUP_KEY, salt, 32);
}

export function encrypt(buf) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', keyFrom(salt), iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, body, c.getAuthTag()]);
}

export function decrypt(buf) {
  if (!isEncrypted(buf)) throw new Error('الملف مش نسخة مشفّرة من نونو');
  const salt = buf.subarray(8, 24);
  const iv = buf.subarray(24, 36);
  const d = createDecipheriv('aes-256-gcm', keyFrom(salt), iv);
  d.setAuthTag(buf.subarray(buf.length - 16));
  try {
    return Buffer.concat([d.update(buf.subarray(36, buf.length - 16)), d.final()]);
  } catch {
    throw new Error('ما قدرنا نفك تشفير النسخة — BACKUP_KEY مش نفس المفتاح اللي انعملت فيه');
  }
}

// ===== القوائم والتنظيف =====
export async function listBackups() {
  await mkdir(BACKUP_DIR, { recursive: true });
  const names = (await readdir(BACKUP_DIR)).filter((n) => NAME_RE.test(n));
  const files = await Promise.all(names.map(async (name) => {
    const s = await stat(join(BACKUP_DIR, name));
    return { name, size: s.size, createdAt: s.mtime.toISOString() };
  }));
  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// الأحدث (daily) + نسخة وحدة من كل أسبوع لعدد (weekly) أسابيع. files لازم تكون الأحدث أول
function toRemove(files, { daily, weekly }) {
  const keep = new Set(files.slice(0, daily).map((f) => f.name));
  const weeks = new Set();
  for (const f of files) {
    const week = Math.floor(Date.parse(f.createdAt) / (7 * 86400_000));
    if (!weeks.has(week) && weeks.size < weekly) { weeks.add(week); keep.add(f.name); }
  }
  return files.filter((f) => !keep.has(f.name));
}

async function pruneLocal() {
  const removed = toRemove(await listBackups(), LOCAL_KEEP);
  await Promise.all(removed.map((f) => unlink(join(BACKUP_DIR, f.name))));
  return removed.length;
}

export async function listCloud() {
  if (!cloudReady()) return [];
  const items = await r2List(BUCKET(), CLOUD_PREFIX);
  return items
    .map((i) => ({ ...i, name: i.key.slice(CLOUD_PREFIX.length).replace(/\.enc$/, '') }))
    .filter((i) => NAME_RE.test(i.name))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ===== رفع نسخة على Cloudflare =====
export async function uploadToCloud(name) {
  if (!cloudReady()) return null;
  try {
    const data = encrypt(await readFile(join(BACKUP_DIR, name)));
    await r2Put(BUCKET(), `${CLOUD_PREFIX}${name}.enc`, data);
    const old = toRemove(await listCloud(), CLOUD_KEEP);
    await Promise.all(old.map((f) => r2Delete(BUCKET(), f.key)));
    await writeStatus({ cloudOk: new Date().toISOString(), cloudFile: name, cloudError: null, cloudErrorAt: null });
    console.log(`  ☁ انرفعت على Cloudflare (مشفّرة): ${name}`);
    return true;
  } catch (err) {
    await writeStatus({ cloudError: err.message, cloudErrorAt: new Date().toISOString() });
    console.error('  ✗ الرفع على Cloudflare فشل:', err.message);
    return false;
  }
}

// ===== عمل نسخة =====
// قفل واحد للنسخ والاسترجاع: ما بيصيروا بنفس الوقت
let busy = Promise.resolve();
const exclusive = (fn) => {
  const job = busy.then(fn, fn);
  busy = job.catch(() => {});
  return job;
};

async function dumpNow(reason) {
  await mkdir(BACKUP_DIR, { recursive: true });
  const name = freshName(reason === 'manual' ? '' : `-${reason.replace(/[^a-z]/g, '')}`);
  const file = join(BACKUP_DIR, name);
  try {
    // -Fc: صيغة مضغوطة وبتنرجع بـ pg_restore. --no-owner: بتنرجع على أي سيرفر
    await run(pgTool('pg_dump'), ['-Fc', '--no-owner', '--no-privileges', '-f', file], pgEnv());
    const { size } = await stat(file);
    const removed = await pruneLocal();
    await writeStatus({ lastOk: new Date().toISOString(), lastFile: name, lastSize: size, lastError: null, lastErrorAt: null });
    console.log(`  ✓ نسخة احتياطية: ${name} (${kb(size)})${removed ? ` · انحذف ${removed} قديم` : ''}`);
  } catch (err) {
    await unlink(file).catch(() => {});
    await writeStatus({ lastError: err.message, lastErrorAt: new Date().toISOString() });
    console.error('  ✗ النسخ الاحتياطي فشل:', err.message);
    throw err;
  }
  const { size } = await stat(file);
  const cloud = await uploadToCloud(name);
  return { name, size, cloud };
}

/** @param {string} reason auto | manual | before-restore */
export const runBackup = (reason = 'manual') => exclusive(() => dumpNow(reason));

// ===== الاسترجاع =====
// source: { local: name } أو { cloud: name }. قبل أي إشي بنعمل نسخة من الوضع الحالي.
export const restoreBackup = (source) => exclusive(async () => {
  let file;
  let temp = null;
  if (source.local) {
    if (!NAME_RE.test(source.local)) throw new Error('اسم النسخة مش صحيح');
    file = join(BACKUP_DIR, source.local);
    if (!existsSync(file)) throw new Error('النسخة مش موجودة');
  } else if (source.cloud) {
    if (!NAME_RE.test(source.cloud)) throw new Error('اسم النسخة مش صحيح');
    if (!cloudReady()) throw new Error('Cloudflare مش موصول');
    const data = decrypt(await r2Get(BUCKET(), `${CLOUD_PREFIX}${source.cloud}.enc`));
    if (!isDump(data)) throw new Error('الملف مش نسخة قاعدة بيانات');
    temp = file = join(BACKUP_DIR, `.restore-${Date.now()}.tmp`);
    await writeFile(temp, data);
  } else {
    throw new Error('ما حددتي النسخة');
  }

  try {
    const before = await dumpNow('before-restore');
    // --clean --if-exists: بيمسح الجداول الحالية وبيرجّعها من النسخة. --single-transaction: يا كله يا ولا شي
    const env = pgEnv();
    await run(pgTool('pg_restore'), ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--single-transaction', '-d', env.PGDATABASE, file], env);
    await writeStatus({ lastRestore: new Date().toISOString(), lastRestoreFrom: source.local || source.cloud, lastRestoreUndo: before.name });
    console.log(`  ✓ رجعت البيانات من ${source.local || source.cloud} (للتراجع: ${before.name})`);
    return { restored: source.local || source.cloud, undo: before.name };
  } finally {
    if (temp) await unlink(temp).catch(() => {});
  }
});

// ملف نسخة من برا (مثلاً نزّلتيه قبل ورجعتي رفعتيه على جهاز جديد) — عادي أو مشفّر
export async function saveUploadedBackup(buf) {
  let data = buf;
  if (isEncrypted(data)) data = decrypt(data);
  if (!isDump(data)) throw new Error('هاد الملف مش نسخة احتياطية من المتجر');
  await mkdir(BACKUP_DIR, { recursive: true });
  const name = freshName('-uploaded');
  await writeFile(join(BACKUP_DIR, name), data);
  // نتأكد إنه pg_restore بيقدر يقرأه قبل ما نعرضه
  try {
    await run(pgTool('pg_restore'), ['--list', join(BACKUP_DIR, name)], pgEnv());
  } catch {
    await unlink(join(BACKUP_DIR, name)).catch(() => {});
    throw new Error('الملف خربان أو مش مكتمل');
  }
  return { name, size: data.length };
}

// ===== التلقائي =====
// كل يوم الساعة BACKUP_HOUR (3 الصبح افتراضياً)، وأول ما يشتغل السيرفر إذا آخر نسخة أقدم من يوم.
// وإذا آخر نسخة ما انرفعت على Cloudflare (مثلاً ما كان في نت)، بنجرب نرفعها كمان مرة.
export function scheduleBackups() {
  if (process.env.BACKUP_DISABLED === '1') return;
  const hour = Number(process.env.BACKUP_HOUR ?? 3);
  const check = async () => {
    const s = await readStatus();
    const age = s.lastOk ? Date.now() - Date.parse(s.lastOk) : Infinity;
    const due = age > 23 * 3600_000 && (new Date().getHours() === hour || age > 30 * 3600_000);
    if (due) return runBackup('auto').catch(() => {});
    if (cloudReady() && s.lastFile && s.cloudFile !== s.lastFile && existsSync(join(BACKUP_DIR, s.lastFile))) {
      exclusive(() => uploadToCloud(s.lastFile)).catch(() => {});
    }
  };
  setTimeout(check, 15_000); // بعد ما يهدى السيرفر
  setInterval(check, 15 * 60_000).unref();
}
