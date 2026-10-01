/**
 * api.js — the ONLY way the storefront talks to the shop manager (Apps Script). Section 6.5.
 * Same contract as admin/js/api.js, documented in docs/API_CONTRACT.md.
 *
 *  - One function: call(action, payload, opts) → resolves with response.data, or rejects with an
 *    ApiError {code, message, retryAfterMs, data}.
 *  - Simple cross-site request: POST, text/plain body, no custom headers (Apps Script needs this).
 *  - 20 s timeout; retries network errors and BUSY_RETRY with exponential back-off + jitter
 *    (400 ms × 2 each time, max 8 s, at most 5 tries). Validation errors are never retried.
 *  - Never queues anything while offline.
 */

import { meta, session } from './state.js';

const TIMEOUT_MS = 20000;
const BASE_DELAY = 400;
const MAX_DELAY = 8000;
const MAX_TRIES = 5;
const CLIENT_VERSION = 'store-1.8.0';

export class ApiError extends Error {
  constructor(code, message, extra = {}) {
    super(message || code);
    this.code = code;
    this.retryAfterMs = extra.retryAfterMs || 0;
    this.data = extra.data || null;
  }
}

/** The web-app address from client/store.config.json (written into each page by the build). */
export function apiUrl() {
  const url = meta('x-api-url');
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) ? url : '';
}

export function isConfigured() {
  return !!apiUrl();
}

/** Random id for one checkout attempt, kept for this tab (Section 6.5). */
export function idempotencyKey(scope = 'checkout') {
  const key = 'idem:' + scope;
  let v = session.get(key);
  if (!v) {
    v = uuid();
    session.set(key, v);
  }
  return v;
}

export function clearIdempotencyKey(scope = 'checkout') {
  session.remove('idem:' + scope);
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The server's clock minus this phone's clock (Section 24.5) — updated after every reply. */
let serverOffsetMs = 0;
export function serverNow() {
  return Date.now() + serverOffsetMs;
}

async function once(body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) throw new ApiError('NETWORK', 'HTTP ' + res.status);
    let json;
    try { json = await res.json(); } catch (e) { throw new ApiError('NETWORK', 'Bad reply'); }
    if (json && json.server_time) {
      const st = Date.parse(json.server_time);
      if (!Number.isNaN(st)) serverOffsetMs = st - Date.now();
    }
    return json;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e && e.name === 'AbortError') throw new ApiError('TIMEOUT', 'Timed out');
    throw new ApiError('NETWORK', e && e.message ? e.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls a server action. opts: { token, idempotencyKey, timeoutMs, retries (default 5) }.
 * Resolves with the response's data object.
 */
export async function call(action, payload = {}, opts = {}) {
  if (!isConfigured()) throw new ApiError('NOT_CONFIGURED', 'The shop is not connected to its manager yet.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('OFFLINE', 'Offline');
  const body = JSON.stringify({
    action,
    token: opts.token || '',
    payload,
    idempotency_key: opts.idempotencyKey || '',
    client_version: CLIENT_VERSION
  });
  const maxTries = Math.max(1, Math.min(MAX_TRIES, opts.retries ?? MAX_TRIES));
  let lastError = null;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      const json = await once(body, opts.timeoutMs || TIMEOUT_MS);
      if (json && json.ok) return json.data || {};
      const code = (json && json.code) || 'INTERNAL';
      const err = new ApiError(code, (json && json.message) || code, { retryAfterMs: json && json.retry_after_ms, data: json && json.data });
      if (code !== 'BUSY_RETRY') throw err;
      lastError = err;
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (!['NETWORK', 'TIMEOUT', 'BUSY_RETRY'].includes(e.code)) throw e;
      if (navigator.onLine === false) throw new ApiError('OFFLINE', 'Offline');
      lastError = e;
    }
    if (attempt < maxTries - 1) {
      const backoff = Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, attempt));
      const wait = Math.max(backoff * (0.5 + Math.random() * 0.5), (lastError && lastError.retryAfterMs) || 0);
      await sleep(wait);
    }
  }
  throw lastError || new ApiError('INTERNAL', 'Failed');
}

/** GET store.status (cacheable, no login) — the only call the browsing pages ever make. */
export async function storeStatus() {
  if (!isConfigured()) return null;
  const cached = session.get('store-status');
  if (cached && Date.now() - cached.at < 30000) return cached.data;
  try {
    const data = await call('store.status', {}, { retries: 2, timeoutMs: 10000 });
    session.set('store-status', { at: Date.now(), data });
    return data;
  } catch (e) {
    return null;
  }
}
