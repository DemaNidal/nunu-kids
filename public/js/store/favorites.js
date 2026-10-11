// المفضلة: محفوظة بالمتصفح، وأي جزء بالصفحة بيقدر يسمع للتغييرات
import { storage } from '../utils.js';
import { findProduct } from './catalog.js';

const KEY = 'nunu_favorites';
const listeners = new Set();
const load = () => storage.get(KEY, []).filter((id) => findProduct(id));
let ids = load();

// تغيّرت المفضلة بتبويب تاني؟ منحدّث هون كمان
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  ids = load();
  listeners.forEach((fn) => fn({ id: null, added: false }));
});

export const favorites = {
  has: (id) => ids.includes(Number(id)),
  get count() { return ids.length; },
  products: () => ids.map(findProduct).filter(Boolean),

  // بترجع true إذا انضاف، false إذا انشال
  toggle(id) {
    id = Number(id);
    const added = !ids.includes(id);
    ids = added ? [id, ...ids] : ids.filter((x) => x !== id);
    storage.set(KEY, ids);
    listeners.forEach((fn) => fn({ id, added }));
    return added;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
