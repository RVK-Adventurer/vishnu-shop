/*
 * sw.js — the shop's service worker (Section 10.11). The build replaces __BUILD_ID__ and the
 * pre-cache list on every publish, which automatically retires the previous version's files.
 *
 *   Pages (HTML)              network first, saved copy when offline, then the offline page
 *   JS / CSS / icons / text   cache first, per build (instant repeat visits)
 *   catalog / settings JSON   stale-while-revalidate (instant, refreshed in the background)
 *   product photos            cache first (photo file names never change once published)
 *   Apps Script API, Razorpay never touched — always straight to the network
 */

const BUILD = '__BUILD_ID__';
const SHELL_CACHE = 'shell-' + BUILD;
const PAGES_CACHE = 'pages-v1';
const DATA_CACHE = 'data-v1';
const IMG_CACHE = 'img-v1';
const PRECACHE = "__PRECACHE__";
const MAX_PAGES = 60;
const MAX_IMAGES = 300;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res.ok) await cache.put(url, res);
      } catch (e) { /* one missing file must not stop the install */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') {
      cache.put(request, res.clone()).then(() => trim(PAGES_CACHE, MAX_PAGES));
    }
    return res;
  } catch (e) {
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') {
    cache.put(request, res.clone()).then(() => (max ? trim(cacheName, max) : null));
  }
  return res;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(DATA_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  const update = fetch(request).then(async (res) => {
    if (res.ok) {
      await cache.put(request, res.clone());
      if (new URL(request.url).pathname === '/catalog.json') {
        try {
          const body = await res.clone().json();
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach((c) => c.postMessage({ type: 'catalog-version', version: body.catalog_version }));
        } catch (e) { /* ignore */ }
      }
    }
    return res;
  }).catch(() => hit || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }));
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return update;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;          // API, Razorpay, maps…
  if (url.pathname.startsWith('/admin/')) return;            // the admin has its own rules
  if (url.pathname === '/sw.js' || url.pathname === '/build.json') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }
  const p = url.pathname;
  if (p === '/catalog.json' || p === '/settings.public.json' || p === '/pages.json' || p === '/pincode-rules.json' ||
      p === '/pincode-states.json' || p.startsWith('/products/')) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }
  if (p.startsWith('/assets/images/') || p.startsWith('/client/assets/')) {
    event.respondWith(cacheFirst(request, IMG_CACHE, MAX_IMAGES));
    return;
  }
  if (p.startsWith('/js/') || p.startsWith('/css/') || p.startsWith('/icons/') || p.startsWith('/strings/') || p.startsWith('/assets/') || p === '/manifest.webmanifest' || p === '/upi-apps.json') {
    event.respondWith(cacheFirst(request, SHELL_CACHE, 0));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});
