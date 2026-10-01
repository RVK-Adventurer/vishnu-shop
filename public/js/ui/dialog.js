/**
 * ui/dialog.js — opens and closes every <dialog> (sheets, drawers, search overlay) the same way:
 * focus moves in and comes back to the button that opened it, Esc and a tap on the dim background
 * close it, the page behind can't scroll, and phones can swipe a bottom sheet down to close it.
 * Older browsers without native <dialog> get the same behaviour from a small fallback.
 */

import { device } from '../device.js';
import { trapFocus, focusables } from '../a11y.js';

const openers = new WeakMap();
const untraps = new WeakMap();
let openCount = 0;

function lockScroll(on) {
  openCount = Math.max(0, openCount + (on ? 1 : -1));
  document.documentElement.style.overflow = openCount ? 'hidden' : '';
}

function resolve(target) {
  return typeof target === 'string' ? document.getElementById(target) : target;
}

/** Opens a dialog. `opener` gets focus back afterwards (defaults to the focused element). */
export function openDialog(target, { opener } = {}) {
  const dlg = resolve(target);
  if (!dlg || dlg.open) return dlg;
  openers.set(dlg, opener || document.activeElement);
  if (device.hasDialog) {
    dlg.showModal();
  } else {
    dlg.setAttribute('open', '');
    dlg.setAttribute('role', dlg.getAttribute('role') || 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-fallback-backdrop';
    backdrop.addEventListener('click', () => closeDialog(dlg));
    dlg.before(backdrop);
    dlg._backdrop = backdrop;
    untraps.set(dlg, trapFocus(dlg));
  }
  lockScroll(true);
  const auto = dlg.querySelector('[autofocus], [data-autofocus]') || focusables(dlg)[0];
  if (auto) setTimeout(() => auto.focus({ preventScroll: true }), 30);
  dlg.dispatchEvent(new CustomEvent('dialog:open'));
  return dlg;
}

export function closeDialog(target) {
  const dlg = resolve(target);
  if (!dlg || !dlg.open) return;
  if (device.hasDialog && typeof dlg.close === 'function') dlg.close();
  else finishFallbackClose(dlg);
}

function finishFallbackClose(dlg) {
  dlg.removeAttribute('open');
  if (dlg._backdrop) { dlg._backdrop.remove(); dlg._backdrop = null; }
  const untrap = untraps.get(dlg);
  if (untrap) untrap();
  afterClose(dlg);
}

function afterClose(dlg) {
  lockScroll(false);
  const opener = openers.get(dlg);
  if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
  dlg.dispatchEvent(new CustomEvent('dialog:close'));
}

/** Wires the shared behaviour once for the whole page. */
export function initDialogs() {
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-dialog]');
    if (openBtn) {
      e.preventDefault();
      openDialog(openBtn.getAttribute('data-open-dialog'), { opener: openBtn });
      return;
    }
    const closeBtn = e.target.closest('[data-close-dialog]');
    if (closeBtn) {
      const dlg = closeBtn.closest('dialog');
      if (dlg) closeDialog(dlg);
      return;
    }
    // A tap on the dim background is reported on the <dialog> itself, outside its box: close it.
    if (device.hasDialog && e.target instanceof HTMLDialogElement && e.target.open && e.detail > 0) {
      const r = e.target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeDialog(e.target);
    }
  });

  document.querySelectorAll('dialog').forEach(wireDialog);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || device.hasDialog) return;
    const open = Array.from(document.querySelectorAll('dialog[open]')).pop();
    if (open) closeDialog(open);
  });
}

/** Per-dialog wiring (also used for dialogs added later). */
export function wireDialog(dlg) {
  if (dlg.dataset.wired) return;
  dlg.dataset.wired = '1';
  if (device.hasDialog) dlg.addEventListener('close', () => afterClose(dlg));
  if (dlg.classList.contains('sheet')) enableSwipeDown(dlg);
}

/** Bottom sheets on phones: drag down from the top area to close. */
function enableSwipeDown(dlg) {
  let startY = null;
  let dy = 0;
  dlg.addEventListener('touchstart', (e) => {
    const inner = dlg.querySelector('.sheet__inner');
    if (window.innerWidth >= 768 || (inner && inner.scrollTop > 0)) { startY = null; return; }
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  dlg.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    dlg.style.transform = dy ? `translateY(${dy}px)` : '';
  }, { passive: true });
  dlg.addEventListener('touchend', () => {
    if (startY === null) return;
    dlg.style.transform = '';
    if (dy > 90) closeDialog(dlg);
    startY = null;
  });
}

/**
 * Simple "are you sure?" dialog (Section 23.7.5): resolves true/false. The safe choice is focused.
 * opts: { title, text, confirmLabel, cancelLabel, danger }
 */
export function confirmDialog({ title, text, confirmLabel, cancelLabel, danger = false }) {
  const dlg = document.getElementById('confirm-dialog');
  const body = dlg && dlg.querySelector('[data-confirm-body]');
  if (!dlg || !body) return Promise.resolve(window.confirm(title + '\n' + text));
  body.replaceChildren();
  const head = document.createElement('div');
  head.className = 'sheet__head';
  const h = document.createElement('h2');
  h.className = 'sheet__title';
  h.id = 'confirm-title';
  h.textContent = title;
  head.appendChild(h);
  const p = document.createElement('p');
  p.className = 'confirm__text';
  p.textContent = text;
  const actions = document.createElement('div');
  actions.className = 'sheet__actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn--secondary';
  cancel.textContent = cancelLabel;
  cancel.setAttribute('data-autofocus', '');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn ' + (danger ? 'btn--danger' : 'btn--primary');
  ok.textContent = confirmLabel;
  actions.append(cancel, ok);
  body.append(head, p, actions);
  return new Promise((resolveAnswer) => {
    let answer = false;
    const done = () => { dlg.removeEventListener('dialog:close', done); resolveAnswer(answer); };
    dlg.addEventListener('dialog:close', done);
    cancel.addEventListener('click', () => { answer = false; closeDialog(dlg); });
    ok.addEventListener('click', () => { answer = true; closeDialog(dlg); });
    openDialog(dlg);
  });
}
