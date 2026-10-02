/**
 * preview/lab.js — the Design preview page (/preview/). Lets the owner change the shop's look and
 * see it at once on a phone, a tablet, a laptop and a big screen side by side, before anything is
 * published. Works only in this browser: nothing is saved on the server, customers see nothing.
 *
 * Today the owner then copies the settings into client/store.config.json on GitHub; from Phase 2 the
 * admin's "Save draft" / "Publish" buttons do that step.
 */

import { html } from '../html.js';
import { setHtml, $ } from '../state.js';
import { icon } from '../templates.js';
import { toast } from '../ui/toast.js';
import { LANGUAGES, loadStrings } from '../i18n.js';
import { OWNER_KEYS } from '../look.js';
import { COVER_SPEC, checkCoverPicture } from '../cover.js';
import { LIMITS } from '../limits.js';
import { formGroups, renderForm, applyWhen, readControl, getPath, setPath } from './controls.js';

const ORIGIN = location.origin;
const DRAFT_KEY = 'preview:draft';
const DEVICES = {
  phone: { label: 'Phone', w: 390, h: 844 },
  tablet: { label: 'Tablet', w: 820, h: 1180 },
  laptop: { label: 'Laptop', w: 1366, h: 768 },
  wide: { label: 'Big screen', w: 1920, h: 1080 }
};
const PAGES = [['home', 'Home page'], ['category', 'Category page'], ['product', 'Product page'], ['search', 'All products'], ['cart', 'Cart'], ['contact', 'Contact page']];

const state = {
  live: {}, draft: {}, catalog: { categories: [], products: [] }, fonts: [], icons: [],
  device: 'phone', page: 'home', slug: '', lang: '', theme: 'auto', firstVisit: true, popups: false,
  pictures: {}, // "client/assets/x.jpg" → { url, kb, width, height }
  scroll: {}, warnings: [], version: 0, openGroups: new Set(['colours'])
};
let groups = [];
const frames = new Map(); // device → { iframe, card }

/* ------------------------------------------------------------------ data */

const getJson = (url, fallback) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);

function pickOwnerKeys(s) {
  const out = {};
  OWNER_KEYS.forEach((k) => { if (s[k] !== undefined && s[k] !== null) out[k] = JSON.parse(JSON.stringify(s[k])); });
  return out;
}

function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft)); } catch (e) { /* private mode */ }
}

function changedKeys() {
  return OWNER_KEYS.filter((k) => JSON.stringify(state.draft[k] ?? null) !== JSON.stringify(state.live[k] ?? null));
}

/* ------------------------------------------------------------------ preview frames */

function frameUrl() {
  return `/preview/frame.html?v=${state.version}`;
}

function renderMessage(device) {
  const images = {};
  const sizes = {};
  Object.entries(state.pictures).forEach(([p, x]) => { images[p] = x.url; sizes[p] = x.kb; });
  return {
    type: 'render', settings: state.draft, page: state.page, slug: state.slug, lang: state.lang,
    theme: state.theme, firstVisit: state.firstVisit, popups: state.popups, images, sizes, scrollY: state.scroll[device] || 0
  };
}

function drawStage() {
  const stage = $('[data-lab-stage]');
  const shown = state.device === 'all' ? Object.keys(DEVICES) : [state.device];
  frames.clear();
  setHtml(stage, html`<div class="lab-screens lab-screens--${state.device === 'all' ? 'all' : 'one'}">${shown.map((d) => html`<figure class="lab-device" data-device="${d}">
    <figcaption class="lab-device__bar">
      <span class="lab-tab"><img class="lab-tab__icon" src="/client/assets/favicon.svg" alt="" width="16" height="16" data-tab-icon><span class="lab-tab__title" data-tab-title>…</span></span>
      <span class="lab-device__size">${DEVICES[d].label} · ${DEVICES[d].w} px</span>
    </figcaption>
    <div class="lab-device__screen" data-screen><iframe class="lab-device__frame" title="${DEVICES[d].label} preview" width="${DEVICES[d].w}" height="${DEVICES[d].h}" src="${frameUrl()}"></iframe></div>
  </figure>`)}</div>`);
  stage.querySelectorAll('[data-device]').forEach((card) => frames.set(card.getAttribute('data-device'), { card, iframe: card.querySelector('iframe') }));
  fitScreens();
}

/** Scales each device screen to fit the space (like zooming out), keeping its real width. */
function fitScreens() {
  const stage = $('[data-lab-stage]');
  const all = state.device === 'all';
  const availW = stage.clientWidth - 32;
  const availH = Math.max(320, window.innerHeight - stage.getBoundingClientRect().top - 72);
  frames.forEach(({ card, iframe }, d) => {
    const dev = DEVICES[d];
    const boxW = all ? (availW > 1100 ? (availW - 48) / 4 : availW > 640 ? (availW - 16) / 2 : availW) : availW;
    const k = Math.min(1, boxW / dev.w, all ? 1 : availH / dev.h);
    const screen = card.querySelector('[data-screen]');
    screen.style.width = Math.round(dev.w * k) + 'px';
    screen.style.height = Math.round(dev.h * k) + 'px';
    iframe.style.transform = `scale(${k})`;
    card.style.width = Math.round(dev.w * k) + 'px';
  });
}

let timer = null;
function refresh(delay = 350) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.version++;
    saveDraft();
    frames.forEach(({ iframe }) => { iframe.src = frameUrl(); });
    updateJsonPane();
    updateChecks();
  }, delay);
}

window.addEventListener('message', (e) => {
  if (e.origin !== ORIGIN || !e.data) return;
  let device = null;
  frames.forEach(({ iframe }, d) => { if (iframe.contentWindow === e.source) device = d; });
  if (!device) return;
  const msg = e.data;
  if (msg.type === 'ready') e.source.postMessage(renderMessage(device), ORIGIN);
  else if (msg.type === 'scroll') state.scroll[device] = msg.y;
  else if (msg.type === 'rendered') {
    const { card } = frames.get(device);
    card.querySelector('[data-tab-title]').textContent = msg.title || '';
    const fav = card.querySelector('[data-tab-icon]');
    if (msg.favicon) fav.src = msg.favicon;
    state.warnings = msg.warnings || [];
    updateChecks();
  } else if (msg.type === 'navigate') {
    state.page = msg.page;
    state.slug = msg.slug || '';
    Object.keys(state.scroll).forEach((k) => { state.scroll[k] = 0; });
    syncTopControls();
    refresh(0);
  } else if (msg.type === 'note') toast(msg.text);
});

/* ------------------------------------------------------------------ top bar */

function syncTopControls() {
  $('[data-lab-page]').value = state.page;
  const wrap = $('[data-lab-slug-wrap]');
  const sel = $('[data-lab-slug]');
  const isCat = state.page === 'category';
  const isProd = state.page === 'product';
  wrap.hidden = !(isCat || isProd);
  if (isCat || isProd) {
    $('[data-lab-slug-label]').textContent = isCat ? 'Category' : 'Product';
    const list = isCat ? state.catalog.categories : state.catalog.products;
    setHtml(sel, html`${list.map((x) => html`<option value="${x.slug}">${x.name}</option>`)}`);
    if (!list.some((x) => x.slug === state.slug)) state.slug = list[0] ? list[0].slug : '';
    sel.value = state.slug;
  }
  const langs = Array.isArray(state.draft.languages_json) ? state.draft.languages_json.filter((c) => LANGUAGES[c]) : ['en'];
  $('[data-lab-lang-wrap]').hidden = langs.length < 2;
  setHtml($('[data-lab-lang]'), html`${langs.map((c) => html`<option value="${c}">${LANGUAGES[c].name}</option>`)}`);
  if (!langs.includes(state.lang)) state.lang = state.draft.default_language && langs.includes(state.draft.default_language) ? state.draft.default_language : langs[0];
  $('[data-lab-lang]').value = state.lang;
}

function wireTopBar() {
  setHtml($('[data-lab-page]'), html`${PAGES.map(([v, l]) => html`<option value="${v}">${l}</option>`)}`);
  $('[data-lab-page]').addEventListener('change', (e) => { state.page = e.target.value; state.slug = ''; syncTopControls(); refresh(0); });
  $('[data-lab-slug]').addEventListener('change', (e) => { state.slug = e.target.value; refresh(0); });
  $('[data-lab-lang]').addEventListener('change', (e) => { state.lang = e.target.value; refresh(0); });
  $('[data-lab-first]').addEventListener('change', (e) => { state.firstVisit = e.target.checked; refresh(0); });
  $('[data-lab-popups]').addEventListener('change', (e) => { state.popups = e.target.checked; refresh(0); });
  $('[data-lab-theme]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]');
    if (!b) return;
    state.theme = b.getAttribute('data-theme');
    $('[data-lab-theme]').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    refresh(0);
  });
  const dev = $('[data-lab-devices]');
  setHtml(dev, html`${Object.entries(DEVICES).map(([k, d]) => html`<button type="button" class="lab-dev" aria-pressed="${k === state.device ? 'true' : 'false'}" data-dev="${k}">${icon(k === 'phone' ? 'phone' : k === 'tablet' ? 'grid' : k === 'laptop' ? 'home' : 'eye', 18)}<span>${d.label}</span><small>${d.w} px</small></button>`)}
    <button type="button" class="lab-dev" aria-pressed="false" data-dev="all">${icon('grid', 18)}<span>All four</span><small>side by side</small></button>
    <a class="lab-dev lab-dev--link" href="/preview/frame.html" target="_blank" rel="noopener" data-lab-open>${icon('external', 18)}<span>Open full page</span><small>new tab</small></a>`);
  dev.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    state.device = b.getAttribute('data-dev');
    dev.querySelectorAll('[data-dev]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    drawStage();
  });
  // Phones: switch between the settings and the preview.
  document.querySelectorAll('[data-lab-view]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-lab-view]').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    $('[data-lab-main]').setAttribute('data-view', b.getAttribute('data-lab-view'));
    fitScreens();
  }));
  // Panel tabs
  document.querySelectorAll('[data-lab-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-lab-tab]').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    document.querySelectorAll('[data-lab-pane]').forEach((p) => { p.hidden = p.getAttribute('data-lab-pane') !== b.getAttribute('data-lab-tab'); });
    if (b.getAttribute('data-lab-tab') === 'pictures') drawPictures();
  }));
  window.addEventListener('resize', () => fitScreens());
}

/* ------------------------------------------------------------------ Easy settings */

function drawForm() {
  const pane = $('[data-lab-pane="easy"]');
  pane.querySelectorAll('details[open]').forEach((d) => state.openGroups.add(d.getAttribute('data-group')));
  setHtml(pane, html`<p class="lab-intro">Change anything below — the preview updates in a moment. Everything stays in this browser until you copy it to GitHub (or, from Phase 2, press Publish in the admin).</p>${renderForm(groups, state.draft, state.pictures, state.openGroups)}`);
  applyWhen(pane, state.draft);
  pane.querySelectorAll('[data-status-for]').forEach((el) => showPictureStatus(el));
}

function wireForm() {
  const pane = $('[data-lab-pane="easy"]');
  const onChange = (e) => {
    if (e.target.matches('[data-p="file"]')) return;
    const r = readControl(e.target, state.draft);
    if (!r) return;
    if (r === 'redraw') drawForm();
    else applyWhen(pane, state.draft);
    refresh(e.type === 'input' && e.target.type === 'text' ? 600 : 250);
  };
  pane.addEventListener('input', onChange);
  pane.addEventListener('change', (e) => {
    if (e.target.matches('[data-p="file"]')) { pickPicture(e.target); return; }
    onChange(e);
  });
  pane.addEventListener('toggle', (e) => {
    const g = e.target.getAttribute && e.target.getAttribute('data-group');
    if (g) { if (e.target.open) state.openGroups.add(g); else state.openGroups.delete(g); }
  }, true);
  pane.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const host = t.closest('[data-t]');
    if (!host) return;
    const key = host.getAttribute('data-k');
    const list = JSON.parse(JSON.stringify(getPath(state.draft, key) || []));
    if (t.hasAttribute('data-move')) {
      const row = t.closest('.lab-order__row');
      const dir = Number(t.getAttribute('data-move'));
      const sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sib) { if (dir < 0) sib.before(row); else sib.after(row); }
      readControl(host, state.draft);
      t.focus();
      refresh(150);
      return;
    }
    if (t.hasAttribute('data-p') && t.getAttribute('data-p') === 'clear') { setPath(state.draft, key, undefined); drawForm(); refresh(0); return; }
    if (t.hasAttribute('data-add')) { if (list.length < LIMITS.trust_items) list.push({ icon: 'check', text: '' }); }
    else if (t.hasAttribute('data-remove')) list.splice(Number(t.getAttribute('data-remove')), 1);
    else if (t.hasAttribute('data-add-col')) { if (list.length < LIMITS.footer_columns) list.push({ title: '', links: [{ text: '', href: '' }] }); }
    else if (t.hasAttribute('data-remove-col')) list.splice(Number(t.getAttribute('data-remove-col')), 1);
    else if (t.hasAttribute('data-add-link')) { const ci = Number(t.closest('[data-ci]').getAttribute('data-ci')); if (list[ci].links.length < LIMITS.footer_links) list[ci].links.push({ text: '', href: '' }); }
    else if (t.hasAttribute('data-remove-link')) { const ci = Number(t.closest('[data-ci]').getAttribute('data-ci')); list[ci].links.splice(Number(t.getAttribute('data-remove-link')), 1); }
    else return;
    setPath(state.draft, key, list);
    drawForm();
    refresh(150);
  });
}

/* ------------------------------------------------------------------ pictures (tried from this computer) */

const safeName = (name) => String(name).toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + (String(name).match(/\.[a-z0-9]+$/i) || ['.jpg'])[0].toLowerCase();

function readPicture(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, kb: Math.round(file.size / 1024), width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ url, kb: Math.round(file.size / 1024), width: 0, height: 0 });
    img.src = url;
  });
}

/** Plain-words verdict for a picture in a slot. */
function verdict(slot, pic) {
  if (!pic) return { ok: true, text: '' };
  const size = `${pic.width} × ${pic.height} px · ${pic.kb} KB`;
  if (COVER_SPEC[slot]) {
    const p = checkCoverPicture(slot, pic);
    return { ok: !p, text: p ? `${size} — ${p}` : `${size} — perfect shape (${COVER_SPEC[slot].ratioText}).` };
  }
  if (slot === 'favicon') {
    if (pic.width !== pic.height) return { ok: false, text: `${size} — must be square (best 512 × 512).` };
    if (pic.width < LIMITS.favicon_min_px) return { ok: false, text: `${size} — too small; at least ${LIMITS.favicon_min_px} px, best 512.` };
    return { ok: pic.kb <= LIMITS.favicon_file_kb, text: `${size} — ${pic.kb <= LIMITS.favicon_file_kb ? 'good.' : `please make it smaller than ${LIMITS.favicon_file_kb} KB.`}` };
  }
  if (slot === 'logo') {
    const wide = pic.width / Math.max(1, pic.height);
    if (pic.kb > LIMITS.logo_file_kb) return { ok: false, text: `${size} — please make it smaller than ${LIMITS.logo_file_kb} KB.` };
    return { ok: wide <= 6, text: `${size} — ${wide > 6 ? 'very wide, so it will look small. About 4 : 1 looks best.' : 'good.'}` };
  }
  return { ok: true, text: size };
}

function showPictureStatus(el) {
  const key = el.getAttribute('data-status-for');
  const host = el.closest('[data-t]');
  const slot = host.getAttribute('data-slot');
  const path = String(getPath(state.draft, key) || '').replace(/^\//, '');
  const pic = state.pictures[path];
  if (!path) { el.textContent = ''; return; }
  if (!pic) { el.textContent = 'Uses the file already on GitHub (if it exists). Choose “Try a picture” to test a new one.'; el.className = 'lab-image__status'; return; }
  const v = verdict(slot, pic);
  el.textContent = (v.ok ? '✓ ' : '⚠ ') + v.text;
  el.className = 'lab-image__status ' + (v.ok ? 'is-ok' : 'is-bad');
}

async function pickPicture(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Please choose a picture (JPG, PNG, WebP or SVG).', { kind: 'error' }); return; }
  const host = input.closest('[data-t]');
  const key = host.getAttribute('data-k');
  const path = 'client/assets/' + safeName(file.name);
  state.pictures[path] = await readPicture(file);
  setPath(state.draft, key, path);
  drawForm();
  refresh(0);
  toast(`Trying “${path}”. To use it for real, upload this file to GitHub → client → assets with exactly this name.`);
}

function drawPictures() {
  const pane = $('[data-lab-pane="pictures"]');
  const used = new Map();
  groups.forEach((g) => g.items.filter((i) => i.type === 'image').forEach((i) => {
    const v = String(getPath(state.draft, i.key) || '').replace(/^\//, '');
    if (v) used.set(v, (used.get(v) || []).concat(i.label));
  }));
  const rows = Object.entries(state.pictures);
  setHtml(pane, html`<p class="lab-intro">Pictures you try here stay on this computer. When you are happy, upload each one to GitHub → <strong>client → assets</strong> with exactly the name shown, then copy the settings.</p>
    <div class="lab-sizes">
      <h3>Sizes that always look right</h3>
      <ul>
        ${Object.entries(COVER_SPEC).map(([k, c]) => html`<li><strong>Cover — ${c.label.toLowerCase()}:</strong> ${c.best[0]} × ${c.best[1]} (exactly ${c.ratioText}), under ${c.kb} KB</li>`)}
        <li><strong>Logo:</strong> SVG, or PNG 480 × 120, clear background, under ${LIMITS.logo_file_kb} KB</li>
        <li><strong>Tab icon:</strong> square PNG 512 × 512, under ${LIMITS.favicon_file_kb} KB</li>
        <li><strong>Product photos:</strong> 1200 × 1200 (square shop) or 1080 × 1350 (clothing), under 500 KB</li>
        <li><strong>Offer poster:</strong> 1080 × 1350, under 500 KB</li>
      </ul>
    </div>
    ${rows.length ? html`<ul class="lab-pics">${rows.map(([p, x]) => html`<li class="lab-pic"><img src="${x.url}" alt=""><span><code>${p}</code><br><small>${x.width} × ${x.height} px · ${x.kb} KB${used.has(p) ? ' · used for: ' + used.get(p).join(', ') : ' · not used'}</small></span></li>`)}</ul>`
    : html`<p class="lab-hint">No pictures tried yet. Use “Try a picture” next to Logo, Tab icon or the Cover pictures in Easy settings.</p>`}`);
}

/* ------------------------------------------------------------------ settings text and checks */

function displayText() {
  const body = JSON.stringify(state.draft, null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  return `  "display": ${body},`;
}

function updateJsonPane() {
  const ta = $('[data-lab-json]');
  if (ta && document.activeElement !== ta) ta.value = JSON.stringify(state.draft, null, 2);
}

function drawJsonPane() {
  setHtml($('[data-lab-pane="json"]'), html`<p class="lab-intro">The same settings as text — the “display” section of <code>client/store.config.json</code>. You can edit here too; the preview follows.</p>
    <textarea class="input lab-json" spellcheck="false" autocomplete="off" rows="22" data-lab-json aria-label="Settings text"></textarea>
    <p class="lab-json__error" role="alert" data-lab-json-error></p>`);
  const ta = $('[data-lab-json]');
  ta.value = JSON.stringify(state.draft, null, 2);
  ta.addEventListener('input', () => {
    const err = $('[data-lab-json-error]');
    try {
      const obj = JSON.parse(ta.value);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('The text must start with { and end with }.');
      state.draft = obj;
      err.textContent = '';
      drawForm();
      syncTopControls();
      refresh(600);
    } catch (e) {
      const m = /position (\d+)/.exec(e.message);
      const line = m ? ta.value.slice(0, Number(m[1])).split('\n').length : null;
      err.textContent = `Not valid yet${line ? ` (around line ${line})` : ''}: a comma, quote mark or bracket is missing or extra. The preview keeps the last good version.`;
    }
  });
}

function updateChecks() {
  const changed = changedKeys();
  const list = state.warnings;
  const dot = $('[data-lab-check-count]');
  dot.hidden = !list.length;
  dot.textContent = String(list.length);
  setHtml($('[data-lab-pane="checks"]'), html`
    <h3 class="lab-h3">${list.length ? `${list.length} thing${list.length > 1 ? 's' : ''} to look at` : '✓ No problems found'}</h3>
    ${list.length ? html`<ul class="lab-checks">${list.map((w) => html`<li>${icon('alert', 16)}<span>${w}</span></li>`)}</ul>` : html`<p class="lab-hint">The same checks run again when the shop is built, so what passes here passes there.</p>`}
    <h3 class="lab-h3">Changed from the live shop (${changed.length})</h3>
    ${changed.length ? html`<ul class="lab-changed">${changed.map((k) => html`<li><code>${k}</code></li>`)}</ul>` : html`<p class="lab-hint">Nothing changed yet.</p>`}`);
}

async function copySettings() {
  const text = displayText();
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied. On GitHub open client/store.config.json → ✏️, select from the line "display": { down to just above "seo": {, and paste.', { kind: 'success', timeout: 12000 });
  } catch (e) {
    document.querySelector('[data-lab-tab="json"]').click();
    const ta = $('[data-lab-json]');
    ta.value = text;
    ta.focus();
    ta.select();
    toast('Press Ctrl+C (or hold and choose Copy) to copy the selected text.', { timeout: 10000 });
  }
}

/* ------------------------------------------------------------------ start */

async function start() {
  try { await loadStrings('en'); } catch (e) { /* the tool still works with built-in words */ }
  const [live, catalog, fonts, sprite] = await Promise.all([
    getJson('/settings.public.json', {}), getJson('/catalog.json', { categories: [], products: [] }),
    getJson('/assets/fonts/fonts.json', { fonts: [] }), fetch('/icons/sprite.svg').then((r) => r.text()).catch(() => '')
  ]);
  state.live = pickOwnerKeys(live);
  state.catalog = catalog;
  state.fonts = fonts.fonts || [];
  state.icons = [...sprite.matchAll(/id="i-([a-z0-9-]+)"/g)].map((m) => m[1]);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { saved = null; }
  state.draft = saved && typeof saved === 'object' ? saved : JSON.parse(JSON.stringify(state.live));
  groups = formGroups(state.fonts, state.icons);

  wireTopBar();
  syncTopControls();
  drawForm();
  wireForm();
  drawJsonPane();
  updateChecks();
  drawStage();
  $('[data-lab-main]').setAttribute('data-view', 'controls');
  $('[data-lab-copy]').addEventListener('click', copySettings);
  $('[data-lab-reset]').addEventListener('click', () => {
    if (!window.confirm('Forget your changes here and start again from the live shop?')) return;
    state.draft = JSON.parse(JSON.stringify(state.live));
    state.pictures = {};
    drawForm();
    syncTopControls();
    refresh(0);
  });
  if (saved) toast('Your last draft is back. “Start again from the live shop” clears it.');
}

start();
