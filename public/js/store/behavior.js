// تتبع تصرفات الزبونة (بالمتصفح تبعها بس): شو شافت، أي مقاس بتختار، شو ضافت
import { storage } from '../utils.js';
import { findProduct } from './catalog.js';

const KEY = 'nunu_behavior';
const data = { views: [], sizes: {}, categories: {}, adds: [], ...storage.get(KEY, {}) };
const save = () => storage.set(KEY, data);

export const behavior = {
  viewed(product) {
    data.views = [product.id, ...data.views.filter((id) => id !== product.id)].slice(0, 20);
    data.categories[product.category] = (data.categories[product.category] || 0) + 1;
    save();
  },

  choseSize(size) {
    data.sizes[size] = (data.sizes[size] || 0) + 1;
    save();
  },

  favorited(id) {
    const p = findProduct(id);
    if (p) data.categories[p.category] = (data.categories[p.category] || 0) + 2;
    save();
  },

  added(id) {
    data.adds = [id, ...data.adds].slice(0, 30);
    save();
  },

  interestIn: (category) => data.categories[category] || 0,
  hasViewed: (id) => data.views.includes(id),
  viewCount: () => data.views.length,
  lastViewed: () => findProduct(data.views[0]),

  recentlyViewed(exclude = []) {
    return data.views.filter((id) => !exclude.includes(id)).map(findProduct).filter(Boolean);
  },

  // المقاس الأكثر اختياراً، والسلة إلها وزن أكبر
  preferredSize(cartLines = []) {
    const counts = { ...data.sizes };
    cartLines.forEach((l) => { counts[l.size] = (counts[l.size] || 0) + 3 * l.qty; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  },
};
