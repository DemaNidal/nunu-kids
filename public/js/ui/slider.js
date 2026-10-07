// سلايدر بسيط: تبديل تلقائي، أسهم، نقاط، وسحب بالإصبع على الموبايل
import { $, $$ } from '../utils.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * root لازم يحتوي: .slide (الشرائح)، [data-prev]، [data-next]، .slider__dots
 * @returns {() => void} دالة لإيقاف السلايدر
 */
export function initSlider(root, { interval = 6000 } = {}) {
  const slides = $$('.slide', root);
  const dots = $('.slider__dots', root);
  let index = 0;
  let timer;

  const controls = [$('[data-prev]', root), $('[data-next]', root), dots];
  controls.forEach((el) => { el.hidden = slides.length < 2; });

  dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="الشريحة ${i + 1}"></button>`).join('');
  const dotButtons = $$('button', dots);

  function go(n) {
    index = (n + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle('is-active', active);
      s.inert = !active; // الروابط بالشرائح المخفية ما بتنضغط
    });
    dotButtons.forEach((d, i) => d.setAttribute('aria-current', i === index));
  }

  const stop = () => clearInterval(timer);
  const play = () => {
    stop();
    if (!reducedMotion && slides.length > 1) timer = setInterval(() => go(index + 1), interval);
  };
  const step = (d) => { go(index + d); play(); };

  $('[data-next]', root).addEventListener('click', () => step(1));
  $('[data-prev]', root).addEventListener('click', () => step(-1));
  dotButtons.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));

  // وقف لما الماوس فوقه أو المستخدمة بتتنقل بالكيبورد
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', play);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', play);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));

  // سحب بالإصبع (بالعربي: السحب لليسار = الشريحة الجاية)
  let startX = null;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    startX = null;
  });

  go(0);
  play();
  return stop;
}
