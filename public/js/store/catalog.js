// الوصول للمنتجات
import { PRODUCTS } from '../data/products.js';

export const allProducts = () => PRODUCTS;
export const findProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));
export const isBundle = (p) => p.category === 'bundles';
export const bundles = () => PRODUCTS.filter(isBundle);
export const items = () => PRODUCTS.filter((p) => !isBundle(p));

export const sizesOf = (p) => Object.keys(p.stock);
export const stockOf = (p, size) => p.stock[size] || 0;
export const inStock = (p) => Object.values(p.stock).some((n) => n > 0);
export const firstInStockSize = (p) => sizesOf(p).find((s) => stockOf(p, s) > 0);
