// استرجاع نسخة احتياطية من التيرمنال (نفس اللي بلوحة التحكم ← النسخ الاحتياطية)
//   npm run db:restore                                   ← النسخ اللي على الجهاز
//   npm run db:restore -- --cloud                        ← النسخ اللي على Cloudflare
//   npm run db:restore -- nunu-2026-10-12_0300.dump --yes
//   npm run db:restore -- nunu-2026-10-12_0300.dump --cloud --yes
//   npm run db:restore -- D:\نسخ\ملف.dump --yes            ← ملف من برا (عادي أو مشفّر)
// ⚠️ بيبدّل كل البيانات الحالية بالنسخة. قبلها بنعمل نسخة من الوضع الحالي (للتراجع).
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { listBackups, listCloud, restoreBackup, saveUploadedBackup, NAME_RE } from '../backup.js';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const cloud = args.includes('--cloud');
let name = args.find((a) => !a.startsWith('--'));

if (!name) {
  const files = cloud ? await listCloud() : await listBackups();
  console.log(`\n  النسخ ${cloud ? 'على Cloudflare' : 'على الجهاز'} (الأحدث أول):`);
  if (!files.length) console.log('   (ما في)');
  files.slice(0, 20).forEach((f) => console.log(`   ${f.name}   ${Math.round(f.size / 1024)} KB`));
  console.log(`\n  للاسترجاع: npm run db:restore -- <اسم النسخة>${cloud ? ' --cloud' : ''} --yes\n`);
  process.exit(0);
}

if (!yes) {
  console.log(`\n  ⚠️ هاد رح يبدّل كل بيانات المتجر (الطلبات، المنتجات، العروض، الإعدادات) بنسخة: ${basename(name)}`);
  console.log('  قبلها بنعمل نسخة من الوضع الحالي، فبتقدري ترجعي عنه.');
  console.log('  إذا متأكدة، شغّلي نفس الأمر وزيدي عليه --yes\n');
  process.exit(0);
}

try {
  // ملف من برا مجلد النسخ: بنفحصه وبننسخه للمجلد أول
  if (!cloud && !NAME_RE.test(name) && existsSync(name)) {
    name = (await saveUploadedBackup(await readFile(name))).name;
  }
  const r = await restoreBackup(cloud ? { cloud: basename(name) } : { local: basename(name) });
  console.log(`\n  ✓ رجعت البيانات من ${r.restored}.`);
  console.log(`  للتراجع: npm run db:restore -- ${r.undo} --yes`);
  console.log('  إذا السيرفر شغّال، أعيدي تشغيله.\n');
  process.exit(0);
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
}
