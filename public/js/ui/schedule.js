/**
 * ui/schedule.js — shows or hides scheduled things on time (v1.9): the announcement bar and home
 * banners carry data-starts / data-ends (India time). The page is built in advance, so the browser
 * re-checks the dates on every visit and every minute while the page stays open.
 */

function live(el, now) {
  const start = el.dataset.starts ? Date.parse(el.dataset.starts) : NaN;
  const end = el.dataset.ends ? Date.parse(el.dataset.ends) : NaN;
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now >= end) return false;
  return true;
}

function apply() {
  const now = Date.now();

  const bar = document.querySelector('[data-announce][data-starts], [data-announce][data-ends]');
  if (bar && !bar.dataset.dismissed) bar.hidden = !live(bar, now);

  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const slides = Array.from(hero.querySelectorAll('.hero__slide'));
  if (!slides.some((sl) => sl.dataset.starts || sl.dataset.ends)) return;
  let visible = 0;
  slides.forEach((sl) => {
    const on = live(sl, now);
    sl.hidden = !on;
    if (on) visible++;
  });
  const dots = Array.from(hero.querySelectorAll('[data-hero-dot]'));
  dots.forEach((d, i) => { d.hidden = !slides[i] || slides[i].hidden; });
  const dotRow = hero.querySelector('.hero__dots');
  if (dotRow) dotRow.hidden = visible < 2;
  const fallback = document.querySelector('[data-hero-fallback]');
  hero.hidden = visible === 0;
  if (fallback) fallback.hidden = visible > 0;
}

export function initSchedules() {
  apply();
  setInterval(apply, 60000);
  const bar = document.querySelector('[data-announce]');
  const close = bar && bar.querySelector('[data-announce-close]');
  if (close) close.addEventListener('click', () => { bar.dataset.dismissed = '1'; });
}
