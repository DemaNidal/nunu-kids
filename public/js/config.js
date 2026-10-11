// إعدادات المتجر العامة — بتتعدل من لوحة الأدمن (صفحة إعدادات المتجر) وبتنحفظ بقاعدة البيانات
import { REMOTE } from './store/remote.js';
import { DEFAULT_STORE } from './config-defaults.js';

export { DEFAULT_STORE, CATEGORIES, SIZES } from './config-defaults.js';

export const STORE = { ...DEFAULT_STORE, ...REMOTE.settings };
