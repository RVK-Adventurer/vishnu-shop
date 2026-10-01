/**
 * ui/stepper.js — the [− 2 +] quantity control (Section 23.4 QUANTITY STEPPER). Works by event
 * delegation, so steppers added later work automatically. Fires a "stepper:change" event with
 * {value} on the stepper element; a value of 0 means "remove" (only when trashAtMin is shown).
 */

import { icon } from '../templates.js';
import { setHtml } from '../state.js';
import { t } from '../i18n.js';

function clamp(input, value) {
  const min = Number(input.min || 1);
  const max = Number(input.max || 99);
  return Math.max(min, Math.min(max, Math.floor(Number(value) || min)));
}

function refreshButtons(stepper, value) {
  const input = stepper.querySelector('[data-step-input]');
  const minus = stepper.querySelector('[data-step="-1"]');
  const plus = stepper.querySelector('[data-step="1"]');
  const min = Number(input.min || 1);
  const max = Number(input.max || 99);
  const trashMode = stepper.dataset.trash === '1';
  if (trashMode) {
    setHtml(minus, icon(value <= min ? 'trash' : 'minus', 18));
    minus.setAttribute('aria-label', value <= min ? t('cart.remove') : t('common.decrease'));
    minus.disabled = false;
  } else {
    minus.disabled = value <= min;
  }
  plus.disabled = value >= max;
}

function setValue(stepper, value, fire = true) {
  const input = stepper.querySelector('[data-step-input]');
  const v = clamp(input, value);
  input.value = String(v);
  refreshButtons(stepper, v);
  if (fire) stepper.dispatchEvent(new CustomEvent('stepper:change', { bubbles: true, detail: { value: v } }));
}

export function initSteppers(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const stepper = btn.closest('[data-stepper]');
    if (!stepper) return;
    e.preventDefault();
    const input = stepper.querySelector('[data-step-input]');
    const current = Number(input.value) || 1;
    const step = Number(btn.dataset.step);
    if (step < 0 && stepper.dataset.trash === '1' && current <= Number(input.min || 1)) {
      stepper.dispatchEvent(new CustomEvent('stepper:change', { bubbles: true, detail: { value: 0 } }));
      return;
    }
    setValue(stepper, current + step);
  });
  root.addEventListener('change', (e) => {
    const input = e.target.closest('[data-step-input]');
    if (!input) return;
    setValue(input.closest('[data-stepper]'), input.value);
  });
  root.querySelectorAll('[data-stepper]').forEach((s) => refreshButtons(s, Number(s.querySelector('[data-step-input]').value) || 1));
}

/** Sets a stepper's maximum (e.g. stock limit) without firing a change. */
export function setStepperMax(stepper, max) {
  const input = stepper.querySelector('[data-step-input]');
  input.max = String(max);
  setValue(stepper, input.value, false);
}

export function stepperValue(stepper) {
  return Number(stepper.querySelector('[data-step-input]').value) || 1;
}
