// سيرفر بسيط لتشغيل الموقع على جهازك: npm start
// (بخطوة لوحة الأدمن رح يكبر هاد الملف ويصير فيه الـ API والطلبات)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const PORT = Number(process.env.PORT) || 5173;
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

// أنواع الملفات — مهم إنه .js يكون JavaScript وإلا المتصفح بيرفض ملفات الـ modules
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const path = normalize(join(ROOT, decodeURIComponent(pathname === '/' ? '/index.html' : pathname)));

  // منع الوصول لملفات برا مجلد public
  if (!path.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('الصفحة مش موجودة');
  }
}).listen(PORT, () => {
  console.log('\n  NUNU KIDS شغّال:');
  console.log(`  على هاد الجهاز:   http://localhost:${PORT}`);
  // عنوان الجهاز على الشبكة — للفتح من الموبايل (لازم يكون على نفس الواي فاي)
  for (const net of Object.values(networkInterfaces()).flat()) {
    if (net.family === 'IPv4' && !net.internal) console.log(`  من الموبايل:      http://${net.address}:${PORT}`);
  }
  console.log('');
});
