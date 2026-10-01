/**
 * ui/rows.js — product rows on the home and product pages show ONE neat line of cards on tablets and
 * computers, however wide the screen (v1.9 full-width layout). The row's grid decides how many columns
 * fit; this hides the cards that would start a second line. Phones keep the swipeable row.
 */

function fit(track) {
  const cards = Array.from(track.children);
  if (window.innerWidth < 768) {
    cards.forEach((c) => { c.hidden = false; });
    return;
  }
  const cols = getComputedStyle(track).gridTemplateColumns.split(' ').filter(Boolean).length || cards.length;
  cards.forEach((c, i) => { c.hidden = i >= cols; });
}

export function initRows(root = document) {
  const tracks = Array.from(root.querySelectorAll('[data-row-track]'));
  if (!tracks.length) return;
  const all = () => tracks.forEach(fit);
  all();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => all());
    tracks.forEach((tr) => ro.observe(tr));
  } else {
    window.addEventListener('resize', all);
  }
}

/** Call after cards are added to a row later (e.g. "Recently viewed"). */
export function refitRow(track) {
  if (track) fit(track);
}
