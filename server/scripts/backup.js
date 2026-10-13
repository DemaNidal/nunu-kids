// نسخة احتياطية يدوية من التيرمنال: npm run db:backup
import { runBackup } from '../backup.js';

try {
  await runBackup('manual');
} catch {
  process.exitCode = 1;
}
