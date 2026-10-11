// إعدادات المتجر: صف واحد بقاعدة البيانات فوق القيم الأساسية (public/js/config.js)
import { db } from './db.js';
import { DEFAULT_STORE } from '../public/js/config-defaults.js';

export async function getSettings() {
  const row = await db.settings.findUnique({ where: { id: 1 } });
  return { ...structuredClone(DEFAULT_STORE), ...(row?.data || {}) };
}

export async function saveSettings(data) {
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, data }, update: { data } });
  return getSettings();
}
