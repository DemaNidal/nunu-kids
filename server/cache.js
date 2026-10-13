// نسخة جاهزة بالذاكرة من بيانات المتجر — عشان كل زائر ما يروح لقاعدة البيانات.
// بتتجدد لحالها كل 15 ثانية (عشان العروض اللي بتبلش أو بتخلص بوقت معين)،
// وفوراً بعد أي تعديل من لوحة التحكم أو أي طلب جديد (المخزون تغيّر).
const TTL = 15_000;
const entries = new Map(); // key → { at, value: Promise }

export function cached(key, load) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  // طلب واحد لقاعدة البيانات حتى لو إجا 1000 زائر بنفس اللحظة
  const value = load().catch((err) => { entries.delete(key); throw err; });
  entries.set(key, { at: Date.now(), value });
  return value;
}

export const invalidate = () => entries.clear();
