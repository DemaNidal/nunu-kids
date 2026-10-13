// اختبار ضغط: كأنه في كتير زبائن فاتحين المتجر بنفس اللحظة (طلبات قراءة بس — ما بيعمل طلبات شراء)
//   npm run loadtest                                   ← على http://localhost:5173
//   npm run loadtest -- https://www.nunukids.com 200 30   ← الرابط، عدد الزوار بنفس اللحظة، المدة بالثواني
const base = (process.argv[2] || `http://localhost:${process.env.PORT || 5173}`).replace(/\/$/, '');
const users = Number(process.argv[3] || 100);
const seconds = Number(process.argv[4] || 20);

// زيارة وحدة متل زبونة حقيقية: الصفحة + ملفاتها + بيانات المتجر
const VISIT = ['/', '/css/base.css', '/js/utils.js', '/api/store', '/assets/hero-wrap.webp', '/shop.html', '/product.html?id=1'];

const times = [];
let errors = 0;
let bytes = 0;
const codes = {};
const stopAt = Date.now() + seconds * 1000;

async function user() {
  while (Date.now() < stopAt) {
    for (const path of VISIT) {
      const t = performance.now();
      try {
        const res = await fetch(base + path, { headers: { 'Accept-Encoding': 'gzip, br' } });
        const body = await res.arrayBuffer();
        bytes += body.byteLength;
        codes[res.status] = (codes[res.status] || 0) + 1;
        if (!res.ok) errors++;
      } catch {
        errors++;
        codes.network = (codes.network || 0) + 1;
      }
      times.push(performance.now() - t);
      if (Date.now() >= stopAt) break;
    }
  }
}

console.log(`\n  عم نضغط على ${base} — ${users} زائر بنفس اللحظة لمدة ${seconds} ثانية…`);
const start = Date.now();
await Promise.all(Array.from({ length: users }, user));
const took = (Date.now() - start) / 1000;

times.sort((a, b) => a - b);
const pct = (p) => Math.round(times[Math.min(times.length - 1, Math.floor(times.length * p))] || 0);
console.log(`
  الطلبات:        ${times.length}  (${Math.round(times.length / took)} بالثانية)
  الأخطاء:        ${errors}  ${JSON.stringify(codes)}
  وقت الرد:       نص الطلبات تحت ${pct(0.5)}ms · 95% تحت ${pct(0.95)}ms · 99% تحت ${pct(0.99)}ms · الأبطأ ${Math.round(times.at(-1) || 0)}ms
  البيانات:       ${(bytes / 1024 / 1024).toFixed(1)} MB
`);
process.exit(errors ? 1 : 0);
