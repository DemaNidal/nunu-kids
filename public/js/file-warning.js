// إذا انفتحت الصفحة كملف (دبل كليك) بدل السيرفر، المتصفح بيمنع ملفات الـ JS
// والصفحة بتطلع فاضية. هاد الملف بيوضّح السبب بدل الصفحة الفاضية.
// (سكريبت عادي مش module عشان يشتغل حتى من ملف)
if (location.protocol === 'file:') {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('afterbegin', `
      <div dir="rtl" style="background:#313857;color:#fff;padding:20px;font:16px/1.8 'IBM Plex Sans Arabic',system-ui,sans-serif;text-align:center">
        <b style="font-size:18px">الصفحة مفتوحة كملف، لهيك طالعة فاضية</b><br>
        شغّلي السيرفر من تيرمنال VS Code بأمر <code style="background:#ffffff22;padding:2px 8px;border-radius:6px">npm start</code>
        وافتحي <a href="http://localhost:5173" style="color:#FAEDCD">http://localhost:5173</a>
      </div>`);
  });
}
