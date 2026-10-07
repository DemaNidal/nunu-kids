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

// قطع البكج: { product (أو null), name, qty, label: "8 بدي قطن بقلب" }
export const bundleItems = (b) => (b.items || []).map((it) => {
  const product = it.id ? findProduct(it.id) : null;
  const name = it.name || product?.name || '';
  return { product, name, qty: it.qty, label: it.qty > 1 ? `${it.qty} ${name}` : name };
});

// عدد القطع الكلي بالبكج
export const bundleCount = (b) => (b.items || []).reduce((sum, it) => sum + it.qty, 0);
