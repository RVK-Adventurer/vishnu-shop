/**
 * ui/drawer.js — side drawers (category menu on the left, cart on the right) on top of ui/dialog.js:
 * adds "swipe towards the edge to close" on touch screens.
 */

import { closeDialog, wireDialog } from './dialog.js';

export function initDrawers() {
  document.querySelectorAll('dialog.drawer').forEach((dlg) => {
    wireDialog(dlg);
    if (dlg.dataset.swipeWired) return;
    dlg.dataset.swipeWired = '1';
    const fromLeft = dlg.classList.contains('drawer--left');
    let startX = null;
    let startY = null;
    let dx = 0;
    dlg.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0;
    }, { passive: true });
    dlg.addEventListener('touchmove', (e) => {
      if (startX === null) return;
      const moveX = e.touches[0].clientX - startX;
      const moveY = e.touches[0].clientY - startY;
      if (Math.abs(moveY) > Math.abs(moveX)) return;          // scrolling up/down, not swiping
      dx = fromLeft ? Math.min(0, moveX) : Math.max(0, moveX);
      dlg.style.transform = dx ? `translateX(${dx}px)` : '';
    }, { passive: true });
    dlg.addEventListener('touchend', () => {
      if (startX === null) return;
      dlg.style.transform = '';
      if (Math.abs(dx) > 80) closeDialog(dlg);
      startX = null;
    });
  });
}
