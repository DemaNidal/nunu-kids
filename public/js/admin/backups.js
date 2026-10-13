// لوحة الأدمن: النسخ الاحتياطية — على الجهاز وعلى Cloudflare، والاسترجاع
import { $, esc } from '../utils.js';
import { listBackups, runBackup, restoreBackup, uploadBackup, backupUrl } from './api.js';
import { mountAdmin, adminToast } from './layout.js';

mountAdmin('backups');

const size = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (iso) => new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const KIND = { auto: 'تلقائية', beforerestore: 'قبل استرجاع', uploaded: 'ملف مرفوع' };
const kind = (name) => KIND[name.match(/-([a-z]+)\.dump$/)?.[1]] || 'يدوية';
const OLD = 36 * 3600_000;

let data = null;

function status(el, { tone, html }) {
  el.className = `bk-status${tone ? ` bk-status--${tone}` : ''}`;
  el.innerHTML = html;
}

const row = (f, from) => `
  <li>
    <span>${when(f.createdAt)}<small>${kind(f.name)} · ${size(f.size)}</small></span>
    <span class="bk-list__acts">
      ${from === 'local' ? `<a href="${backupUrl(f.name)}" download class="link-btn">تنزيل</a>` : ''}
      <button type="button" class="link-btn" data-restore="${esc(f.name)}" data-from="${from}" data-at="${esc(f.createdAt)}">استرجاع</button>
    </span>
  </li>`;

function render() {
  const { status: s, files, cloud } = data;

  const failed = s.lastErrorAt && (!s.lastOk || s.lastErrorAt > s.lastOk);
  const old = s.lastOk && Date.now() - Date.parse(s.lastOk) > OLD;
  status($('#localStatus'), failed
    ? { tone: 'warn', html: `آخر محاولة فشلت<small>${esc(s.lastError)}</small>` }
    : s.lastOk
      ? { tone: old ? 'warn' : 'ok', html: `آخر نسخة: <b>${when(s.lastOk)}</b>${old ? '<small>صار لها أكتر من يوم — السيرفر كان طافي؟</small>' : ''}` }
      : { tone: 'warn', html: 'ما في ولا نسخة لسا' });
  $('#localList').innerHTML = files.map((f) => row(f, 'local')).join('') || '<li class="bk-list__empty">ما في نسخ</li>';

  if (!cloud.configured) {
    status($('#cloudStatus'), { tone: 'warn', html: 'Cloudflare مش موصول لسا<small>لازم مفاتيح R2 و BACKUP_KEY بملف .env — شوفي README</small>' });
  } else if (cloud.error) {
    status($('#cloudStatus'), { tone: 'warn', html: `ما قدرنا نوصل لـ Cloudflare<small>${esc(cloud.error)}</small>` });
  } else {
    const cloudFailed = s.cloudErrorAt && (!s.cloudOk || s.cloudErrorAt > s.cloudOk);
    status($('#cloudStatus'), cloudFailed
      ? { tone: 'warn', html: `آخر رفع فشل — رح نجرب كمان مرة لحاله<small>${esc(s.cloudError)}</small>` }
      : s.cloudOk ? { tone: 'ok', html: `آخر رفع: <b>${when(s.cloudOk)}</b>` } : { html: 'موصول — أول نسخة رح تنرفع لحالها' });
  }
  $('#cloudList').innerHTML = cloud.files.map((f) => row(f, 'cloud')).join('')
    || (cloud.configured && !cloud.error ? '<li class="bk-list__empty">ما في نسخ لسا</li>' : '');
}

async function load() {
  try {
    data = await listBackups();
    render();
  } catch (er) {
    $('#localStatus').textContent = er.message;
  }
}

// ===== نسخة هلأ =====
$('#bkNow').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'عم نعمل النسخة…';
  try {
    const r = await runBackup();
    adminToast(r.cloud === false ? 'انعملت النسخة، بس الرفع على Cloudflare فشل' : 'انعملت نسخة احتياطية ♡');
  } catch (er) { adminToast(er.message); }
  btn.disabled = false;
  btn.textContent = 'اعملي نسخة هلأ';
  load();
});

// ===== رفع ملف =====
$('#bkFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const note = $('#bkFileNote');
  note.textContent = `عم نرفع ${file.name}…`;
  try {
    const r = await uploadBackup(file);
    note.textContent = '';
    adminToast('انضاف الملف لقائمة النسخ على الجهاز');
    await load();
    document.querySelector(`[data-restore="${CSS.escape(r.name)}"]`)?.closest('li')?.classList.add('is-new');
  } catch (er) {
    note.textContent = er.message;
  }
});

// ===== الاسترجاع =====
const dlg = $('#restoreDlg');
const form = $('#restoreForm');
let target = null;

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-restore]');
  if (!b) return;
  target = { name: b.dataset.restore, from: b.dataset.from };
  $('#restoreWhat').innerHTML = `نسخة <b>${when(b.dataset.at)}</b> (${b.dataset.from === 'cloud' ? 'من Cloudflare' : 'من الجهاز'})`;
  $('#restoreErr').textContent = '';
  form.reset();
  dlg.showModal();
});

$('#restoreCancel').addEventListener('click', () => dlg.close());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#restoreGo');
  btn.disabled = true;
  btn.textContent = 'عم نسترجع…';
  try {
    const r = await restoreBackup({ ...target, password: form.elements.password.value });
    dlg.close();
    adminToast('رجعت البيانات ♡ — نسخة الوضع اللي قبل محفوظة إذا بدك ترجعي عنه');
    console.info('للتراجع:', r.undo);
    load();
  } catch (er) {
    $('#restoreErr').textContent = er.message;
  }
  btn.disabled = false;
  btn.textContent = 'استرجعي';
});

load();
