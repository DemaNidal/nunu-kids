// صفحة دخول الأدمن — كلمة السر بتتفحص بالسيرفر (مشفّرة بقاعدة البيانات)
import { $, queryParam } from '../utils.js';
import { login, me } from './api.js';

// بعد الدخول بنرجع للصفحة اللي كانت مفتوحة (بس صفحات الأدمن)
const next = () => {
  const n = queryParam('next') || '';
  return /^[a-z-]+\.html([?#].*)?$/.test(n) ? n : 'index.html';
};

// إذا هي أصلاً مسجّلة دخول، ما في داعي تشوف الصفحة
me().then(() => { location.href = next(); }).catch(() => {});

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const username = form.username.value.trim();
  if (!username || !form.password.value) {
    $('#loginErr').textContent = 'اكتبي اسم المستخدم وكلمة السر';
    return;
  }
  btn.disabled = true;
  $('#loginErr').textContent = '';
  try {
    await login(username, form.password.value);
    location.href = next();
  } catch (err) {
    $('#loginErr').textContent = err.message;
    form.password.value = '';
    form.password.focus();
    btn.disabled = false;
  }
});
