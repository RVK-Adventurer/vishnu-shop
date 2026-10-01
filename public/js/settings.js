/**
 * settings.js — the shop's public settings (settings.public.json, written on publish) and the
 * live "are we open / busy / full?" state shown as page-wide notices (Sections 4.5, 7.11, 10.13).
 */

import { local, $, setHtml } from './state.js';
import { storeStatus } from './api.js';
import { notice } from './templates.js';
import { t } from './i18n.js';

let SETTINGS = null;
const CACHE_KEY = 'settings:v1';

/** Loads settings once (the last copy is remembered so pages paint instantly next time). */
export async function loadSettings() {
  if (SETTINGS) return SETTINGS;
  const remembered = local.get(CACHE_KEY);
  try {
    const res = await fetch('/settings.public.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    SETTINGS = await res.json();
    local.set(CACHE_KEY, SETTINGS);
  } catch (e) {
    SETTINGS = remembered || {};
  }
  return SETTINGS;
}

export function settings() {
  return SETTINGS || local.get(CACHE_KEY) || {};
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Day of week and "HH:MM" right now in India time. */
function istNow(date = new Date()) {
  const parts = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  return { day: String(parts.weekday || '').slice(0, 3).toLowerCase(), time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}` };
}

/**
 * Open right now? Uses the master switch and, if set, the weekly hours:
 * weekly_hours_json = { mon: {open: "09:00", close: "21:00", closed: false}, … } (empty = always open).
 */
export function isOpenNow(s = settings(), date = new Date()) {
  if (s.store_open === false) return false;
  const hours = s.weekly_hours_json || {};
  if (!Object.keys(hours).length) return true;
  const { day, time } = istNow(date);
  const today = hours[day];
  if (!today) return true;
  if (today.closed) return false;
  if (!today.open || !today.close) return true;
  if (today.close > today.open) return time >= today.open && time < today.close;
  return time >= today.open || time < today.close; // open past midnight
}

let liveState = { open: true, capacity: 'OPEN', message: '' };

export function liveStoreState() {
  return liveState;
}

function fullMessage(s) {
  return String(s.customer_full_message || '').replace('{reopen_time}', s.reopen_time_text || '');
}

/** Shows the page-wide notices (closed / full / busy banner) under the header. */
export function renderStoreNotices() {
  const s = settings();
  const slot = $('[data-notices]');
  if (!slot) return;
  const parts = [];
  if (!liveState.open) parts.push(notice('info', s.closed_message || t('errors.STORE_CLOSED')));
  else if (liveState.capacity === 'FULL') parts.push(notice('warning', fullMessage(s)));
  else if (liveState.capacity === 'BUSY' || (s.show_busy_banner && liveState.capacity === 'WARN')) parts.push(notice('warning', s.customer_busy_message || t('errors.CAPACITY_REACHED')));
  setHtml(slot, parts.map((p) => p.toString().replace('class="notice', 'class="notice notice--page')).join(''));
}

/**
 * Works out whether ordering is possible right now: first from the published settings (instant),
 * then — when the cart or checkout opens — from the live store.status call (Section 4.5, 7.11).
 */
export async function refreshStoreState({ live = false } = {}) {
  const s = settings();
  liveState = { open: isOpenNow(s), capacity: 'OPEN', message: '' };
  if (live) {
    const st = await storeStatus();
    if (st) {
      liveState = {
        open: st.open !== false && liveState.open,
        capacity: st.capacity_state || 'OPEN',
        message: st.message || '',
        retryAfterMs: st.retry_after_ms || 0,
        catalogVersion: st.catalog_version || ''
      };
    }
  }
  renderStoreNotices();
  return liveState;
}

/** Text for a disabled checkout button, or '' when ordering is possible. */
export function orderingBlockedReason() {
  const s = settings();
  if (!liveState.open) return s.closed_message || t('cart.closed_button');
  if (liveState.capacity === 'FULL') return fullMessage(s);
  return '';
}
