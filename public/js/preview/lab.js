/**
 * preview/lab.js: Shop Studio, the Design preview at /preview/.
 *
 * The owner changes the shop's look with simple controls and sees it at once on a phone, a tablet,
 * a laptop and a big screen. Nothing is published: the draft lives in this browser until the owner
 * presses "Get Settings" (today: paste into GitHub) or, from Phase 2, "Publish" in the admin, which
 * reuses this same studio.
 */

import { html, raw } from '../html.js';
import { setHtml, $ } from '../state.js';
import { icon } from '../templates.js';
import { toast } from '../ui/toast.js';
import { LANGUAGES, loadStrings, mergeStrings, checkOverride } from '../i18n.js';
import { OWNER_KEYS } from '../look.js';
import { COVER_SPEC, checkCoverPicture } from '../cover.js';
import { THEME_PRESETS } from '../color.js';
import { LIMITS } from '../limits.js';
import { fields, readBound, decorate, getPath, setPath, GRADIENT_THEMES } from './controls.js';
import { buildSections, KEY_NAMES } from './sections.js';
import { createRichEditor } from './richtext.js';

const ORIGIN = location.origin;
const DRAFT_KEY = 'preview:draft';
const TRY_KEY = 'preview:product-try';
const DEVICES = {
  phone: { label: 'Phone', w: 390, h: 844, icon: 'phone' },
  tablet: { label: 'Tablet', w: 820, h: 1180, icon: 'tablet' },
  laptop: { label: 'Laptop', w: 1366, h: 768, icon: 'laptop' },
  wide: { label: 'Big Screen', w: 1920, h: 1080, icon: 'monitor' }
};
const PAGES = [['home', 'Home Page'], ['category', 'Category Page'], ['product', 'Product Page'], ['search', 'All Products'], ['cart', 'Cart'], ['contact', 'Contact Page']];

const state = {
  live: {}, draft: {}, catalog: { categories: [], products: [] }, fonts: [], icons: [], hasHindi: false,
  section: 'colours', device: 'phone', page: 'home', slug: '', lang: '', theme: 'auto', firstVisit: true, popups: false,
  pictures: {}, scroll: {}, warnings: [], version: 0, productTry: {}, strings: {}, wordingLang: 'en', wordingQuery: '', wordingChangedOnly: false
};
let sections = [];
const frames = new Map();
const history = { list: [], at: -1 };
const clone = (o) => JSON.parse(JSON.stringify(o));
const getJson = (url, fallback) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);

/* ------------------------------------------------------------------ draft, history, changes */

function pickOwnerKeys(s) {
  const out = {};
  OWNER_KEYS.forEach((k) => { if (s[k] !== undefined && s[k] !== null) out[k] = clone(s[k]); });
  return out;
}
function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft)); localStorage.setItem(TRY_KEY, JSON.stringify(state.productTry)); } catch (e) { /* private mode */ }
}
function changedKeys() {
  return OWNER_KEYS.filter((k) => JSON.stringify(state.draft[k] ?? null) !== JSON.stringify(state.live[k] ?? null));
}
function remember() {
  const snap = JSON.stringify(state.draft);
  if (history.list[history.at] === snap) return;
  history.list = history.list.slice(0, history.at + 1);
  history.list.push(snap);
  if (history.list.length > 60) history.list.shift();
  history.at = history.list.length - 1;
  updateTopBar();
}
function undoRedo(step) {
  const at = history.at + step;
  if (at < 0 || at >= history.list.length) return;
  history.at = at;
  state.draft = JSON.parse(history.list[at]);
  drawSection(true);
  refresh(0, false);
}

/* ------------------------------------------------------------------ top bar and rail */

function updateTopBar() {
  const n = changedKeys().length;
  const chip = $('[data-st-status]');
  chip.textContent = n ? `Draft: ${n} ${n === 1 ? 'change' : 'changes'}` : 'No Changes Yet';
  chip.classList.toggle('is-draft', n > 0);
  $('[data-st-undo]').disabled = history.at <= 0;
  $('[data-st-redo]').disabled = history.at >= history.list.length - 1;
  const changed = new Set(changedKeys());
  document.querySelectorAll('[data-rail]').forEach((b) => {
    const sec = sections.find((s) => s.id === b.getAttribute('data-rail'));
    const dot = b.querySelector('.st-rail__dot');
    const on = sec && sec.keys.some((k) => changed.has(k));
    if (dot) dot.hidden = !on;
    if (sec && sec.id === 'checks') {
      const c = b.querySelector('.st-rail__count');
      c.hidden = !state.warnings.length;
      c.textContent = String(state.warnings.length);
    }
  });
}

function drawRail() {
  setHtml($('[data-st-rail]'), html`${sections.map((s) => html`<button type="button" class="st-rail__btn" data-rail="${s.id}" aria-current="${s.id === state.section ? 'page' : 'false'}">
    <span class="st-rail__icon">${icon(s.icon, 20)}<span class="st-rail__dot" hidden></span>${s.id === 'checks' ? html`<span class="st-rail__count" hidden>0</span>` : ''}</span>
    <span class="st-rail__label">${s.title}</span></button>`)}`);
}

/* ------------------------------------------------------------------ sections */

function drawSection(keep = false) {
  const sec = sections.find((s) => s.id === state.section) || sections[0];
  const panel = $('[data-st-panel]');
  const prevScroll = panel.scrollTop;
  const f = fields(state.draft, { pictures: state.pictures });
  let body;
  if (sec.id === 'tryout') body = tryoutHtml();
  else if (sec.id === 'wording') body = wordingHtml();
  else if (sec.id === 'languages') body = languagesHtml(f);
  else if (sec.id === 'checks') body = checksHtml();
  else body = sec.render(f, { draft: state.draft, icons: state.icons, fonts: state.fonts });
  setHtml(panel, html`<header class="st-panel__head"><h2 class="st-panel__title">${sec.title}</h2><p class="st-panel__intro">${sec.intro}</p></header><div class="st-panel__body">${body}</div>`);
  decorate(panel, state.draft);
  panel.querySelectorAll('[data-icon-preview]').forEach((el) => setHtml(el, html`${icon(getPath(state.draft, el.getAttribute('data-icon-preview')) || 'check', 22)}`));
  panel.querySelectorAll('[data-kind="image"]').forEach((host) => showVerdict(host));
  if (sec.id === 'tryout') wireTryout();
  if (sec.id === 'wording') drawWordingList();
  panel.scrollTop = keep ? prevScroll : 0;
  if (!keep) window.scrollTo(0, 0);
  document.querySelectorAll('[data-rail]').forEach((b) => b.setAttribute('aria-current', b.getAttribute('data-rail') === sec.id ? 'page' : 'false'));
  updateTopBar();
}

function wirePanel() {
  const panel = $('[data-st-panel]');
  const after = (r, e) => {
    if (!r) return;
    if (r === 'redraw' || r === 'tiles') {
      // Draw again (some choices show or hide other settings), then put the keyboard focus back.
      const host = e && e.target.closest('[data-bind]');
      const pick = e && e.target.closest('[data-value]');
      const sel = host && pick ? `[data-bind="${CSS.escape(host.getAttribute('data-bind'))}"] [data-value="${CSS.escape(pick.getAttribute('data-value'))}"]` : '';
      drawSection(true);
      const again = sel && panel.querySelector(sel);
      if (again) again.focus({ preventScroll: true });
    } else decorate(panel, state.draft);
    if (e && e.target.closest('[data-kind="select"]') && e.target.closest('.st-grid-icon')) {
      const pv = e.target.closest('.st-grid-icon').querySelector('[data-icon-preview]');
      if (pv) setHtml(pv, html`${icon(e.target.value, 22)}`);
    }
    refresh(e && e.type === 'input' && /text|textarea/.test(e.target.type || e.target.tagName.toLowerCase()) ? 650 : 250);
  };
  panel.addEventListener('input', (e) => {
    if (e.target.matches('[data-wording]')) { onWording(e.target); return; }
    if (e.target.matches('[data-wording-search]')) { state.wordingQuery = e.target.value; drawWordingList(); return; }
    if (e.target.type === 'file' || e.target.closest('[data-kind="tiles"],[data-kind="chips"]')) return;
    after(readBound(e.target, state.draft), e);
  });
  panel.addEventListener('change', (e) => {
    if (e.target.type === 'file') { pickPicture(e.target); return; }
    if (e.target.matches('[data-wording-lang]')) { state.wordingLang = e.target.value; drawWordingList(); return; }
    if (e.target.matches('[data-wording-changed]')) { state.wordingChangedOnly = e.target.checked; drawWordingList(); return; }
    if (e.target.matches('[data-lang-pick]')) { onLanguages(); return; }
    if (e.target.matches('[data-try-product]')) { state.slug = e.target.value; state.page = 'product'; syncStageControls(); drawSection(); refresh(0, false); return; }
    if (e.target.closest('[data-kind="order"]')) { after(readBound(e.target, state.draft), e); return; }
    if (e.target.matches('[data-kind="switch"],[data-kind="select"],[data-kind="datetime"]')) after(readBound(e.target, state.draft), e);
  });
  panel.addEventListener('click', (e) => {
    const t = e.target;
    const g = t.closest('[data-gtheme]');
    if (g) { const th = GRADIENT_THEMES[Number(g.getAttribute('data-gtheme'))]; Object.assign(state.draft, { theme_preset: 'CUSTOM', primary_color: th.primary, secondary_color: th.secondary, accent_color: th.accent, brand_gradient: th.gradient }); if (!(state.draft.brand_gradient_areas || []).length) state.draft.brand_gradient_areas = ['header', 'buttons', 'hero']; drawSection(true); refresh(0); toast(`${th.name} applied.`); return; }
    const pt = t.closest('[data-ptheme]');
    if (pt) { const p = THEME_PRESETS[pt.getAttribute('data-ptheme')]; Object.assign(state.draft, { theme_preset: pt.getAttribute('data-ptheme'), primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent }); drawSection(true); refresh(0); toast(`${p.name} applied.`); return; }
    if (t.closest('[data-move]')) {
      const row = t.closest('.st-order__row');
      const dir = Number(t.closest('[data-move]').getAttribute('data-move'));
      const sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sib) { if (dir < 0) sib.before(row); else sib.after(row); }
      after(readBound(row.querySelector('input'), state.draft), e);
      t.closest('[data-move]').focus();
      return;
    }
    const list = t.closest('[data-list]');
    if (list && (t.closest('[data-list-add]') || t.closest('[data-list-remove]') || t.closest('[data-list-move]'))) {
      const path = list.getAttribute('data-list');
      const items = clone(getPath(state.draft, path) || []);
      if (t.closest('[data-list-add]')) items.push(newItem(path));
      else {
        const i = Number(t.closest('[data-index]').getAttribute('data-index'));
        if (t.closest('[data-list-remove]')) items.splice(i, 1);
        else { const j = i + Number(t.closest('[data-list-move]').getAttribute('data-list-move')); if (j >= 0 && j < items.length) [items[i], items[j]] = [items[j], items[i]]; }
      }
      setPath(state.draft, path, items);
      drawSection(true);
      refresh(150);
      return;
    }
    if (t.closest('[data-reset-wording]')) {
      const key = t.closest('[data-reset-wording]').getAttribute('data-reset-wording');
      const over = state.draft.text_overrides_json || {};
      if (over[state.wordingLang]) delete over[state.wordingLang][key];
      drawWordingList();
      refresh(150);
      return;
    }
    if (t.closest('[data-checks-go]')) { state.section = t.closest('[data-checks-go]').getAttribute('data-checks-go'); drawSection(); return; }
    if (t.closest('[data-kind="tiles"],[data-kind="chips"]') || t.closest('[data-kind="paint"] button') || t.closest('[data-i="clear"]')) after(readBound(t, state.draft), e);
  });
}

function newItem(path) {
  if (path === 'hero_banners_json') return { image: '', headline: '' };
  if (path === 'popups_json') return { id: 'offer-' + Date.now().toString(36), active: true, title: 'New Offer', text: '', frequency: 'DAY', pages: 'ALL', delay_seconds: 2 };
  if (path === 'trust_strip_json') return { icon: 'check', text: '' };
  if (path === 'footer_columns_json') return { title: '', links: [{ text: '', href: '' }] };
  if (/^footer_columns_json\.\d+\.links$/.test(path)) return { text: '', href: '' };
  return {};
}

/* ------------------------------------------------------------------ pictures */

const safeName = (name) => {
  const ext = (String(name).match(/\.[a-z0-9]+$/i) || ['.jpg'])[0].toLowerCase();
  return String(name).toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + ext;
};
function readPicture(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ url, kb: Math.round(file.size / 1024), width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ url, kb: Math.round(file.size / 1024), width: 0, height: 0 });
    img.src = url;
  });
}
function imageDims(url) {
  return new Promise((resolve) => { const i = new Image(); i.onload = () => resolve({ width: i.naturalWidth, height: i.naturalHeight }); i.onerror = () => resolve(null); i.src = url; });
}

/** Plain words about a picture in its slot. */
function verdict(slot, d) {
  if (!d || !d.width) return { ok: false, text: 'This picture could not be read.' };
  const size = `${d.width} × ${d.height} px${d.kb ? `, ${d.kb} KB` : ''}`;
  const ratio = d.width / d.height;
  if (COVER_SPEC[slot]) { const p = checkCoverPicture(slot, d); return { ok: !p, text: p ? `${size}. ${p}` : `${size}. Perfect shape (${COVER_SPEC[slot].ratioText}).` }; }
  if (slot === 'favicon') {
    if (d.width !== d.height) return { ok: false, text: `${size}. It must be square (best 512 × 512).` };
    if (d.width < LIMITS.favicon_min_px) return { ok: false, text: `${size}. Too small; use at least ${LIMITS.favicon_min_px}, best 512.` };
    return d.kb > LIMITS.favicon_file_kb ? { ok: false, text: `${size}. Please make it smaller than ${LIMITS.favicon_file_kb} KB.` } : { ok: true, text: `${size}. Good.` };
  }
  if (slot === 'logo') {
    if (d.kb > LIMITS.logo_file_kb) return { ok: false, text: `${size}. Please make it smaller than ${LIMITS.logo_file_kb} KB.` };
    return ratio > 6 ? { ok: false, text: `${size}. Very wide, so it will look small. About 4 : 1 looks best.` } : { ok: true, text: `${size}. Good.` };
  }
  if (slot === 'banner') {
    if (d.width < 1280) return { ok: false, text: `${size}. Too small for big screens; use about 1920 × 800.` };
    return ratio < 1.8 || ratio > 3.2 ? { ok: false, text: `${size}. Best shape is about 12 : 5 (1920 × 800); this one will be trimmed a lot.` } : { ok: true, text: `${size}. Good.` };
  }
  if (slot === 'poster') {
    const okShape = Math.abs(ratio - 0.8) < 0.03 || Math.abs(ratio - 1) < 0.03;
    if (!okShape) return { ok: false, text: `${size}. Best shape is 4 : 5 (1080 × 1350) or square. It will still show whole.` };
    return d.kb > 500 ? { ok: false, text: `${size}. Please make it smaller than 500 KB.` } : { ok: true, text: `${size}. Good.` };
  }
  return { ok: true, text: size };
}

async function showVerdict(host) {
  const out = host.querySelector('[data-verdict]');
  const path = String(getPath(state.draft, host.getAttribute('data-bind')) || '').replace(/^\//, '');
  if (!path) { out.textContent = ''; return; }
  const slot = host.getAttribute('data-slot');
  let d = state.pictures[path];
  if (!d) {
    d = await imageDims('/' + path);
    if (!d) { out.textContent = 'Not on your shop yet. Choose the picture here to try it, then upload it to GitHub with this exact name.'; out.className = 'st-verdict is-warn'; return; }
  }
  const v = verdict(slot, d);
  // Every word starts with a capital, but units stay small ("640 px").
  out.textContent = (v.ok ? '✓ ' : '⚠ ') + v.text.replace(/(^|[\s(“"])([a-z][a-z’']*)/g, (m, a, w) => a + (w === 'px' || w === 'x' ? w : w[0].toUpperCase() + w.slice(1)));
  out.className = 'st-verdict ' + (v.ok ? 'is-ok' : 'is-warn');
}

async function pickPicture(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Please choose a picture (JPG, PNG, WebP or SVG).', { kind: 'error' }); return; }
  const host = input.closest('[data-bind]');
  const path = 'client/assets/' + safeName(file.name);
  state.pictures[path] = await readPicture(file);
  setPath(state.draft, host.getAttribute('data-bind'), path);
  drawSection(true);
  refresh(0);
}

/* ------------------------------------------------------------------ Product Page Try Out */

function tryoutHtml() {
  const prods = state.catalog.products;
  if (!state.slug || !prods.some((p) => p.slug === state.slug)) state.slug = (prods.find((p) => p.slug === 'printed-kurti') || prods[0] || {}).slug || '';
  return html`<div class="st-card"><div class="st-card__body">
      <div class="st-field"><label class="st-label" for="try-product">Product</label><select class="st-input st-select" id="try-product" data-try-product>${prods.map((p) => html`<option value="${p.slug}" ${p.slug === state.slug ? raw('selected') : ''}>${p.name}</option>`)}</select></div>
      <p class="st-note st-note--info">${icon('info', 16)}<span>The preview switches to this product’s page. Your changes here are only for trying; nothing is saved to the product.</span></p>
    </div></div>
    <section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Key Features</h3><p class="st-card__desc">Up to ${LIMITS.highlights} short points, shown next to the price.</p></header><div class="st-card__body" data-try-hl></div></section>
    <section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Description</h3><p class="st-card__desc">Bold, colours, sizes, alignment, spacing, lists, tables, boxes and links, like Microsoft Word.</p></header><div class="st-card__body"><div data-try-editor></div></div></section>
    <section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Specifications</h3><p class="st-card__desc">Up to ${LIMITS.spec_groups} groups and ${LIMITS.spec_rows} rows in all.</p></header><div class="st-card__body" data-try-specs></div></section>
    <button type="button" class="st-btn st-btn--ghost" data-try-reset>Go Back To This Product’s Own Details</button>`;
}

async function wireTryout() {
  const panel = $('[data-st-panel]');
  const slug = state.slug;
  if (!slug) return;
  const detail = await getJson(`/products/${encodeURIComponent(slug)}.json`, {});
  const t = state.productTry[slug] || (state.productTry[slug] = {});
  const desc = t.description_html ?? detail.description_html ?? '';
  const hl = t.highlights ?? detail.highlights ?? [];
  let specs = t.specs ?? detail.specs ?? [];
  if (specs.length && Array.isArray(specs[0])) specs = [{ group: '', rows: specs }];

  const push = () => { saveDraft(); refresh(300, false); };
  createRichEditor(panel.querySelector('[data-try-editor]'), { html: desc, onChange: (out) => { if (out !== (t.description_html ?? detail.description_html ?? '')) { t.description_html = out; push(); } } });

  const drawHl = () => {
    const list = t.highlights ?? hl;
    setHtml(panel.querySelector('[data-try-hl]'), html`${list.map((x, i) => html`<div class="st-row"><input class="st-input" type="text" maxlength="${LIMITS.highlight_chars}" value="${x}" data-hl="${i}" aria-label="Key feature ${i + 1}"><button type="button" class="st-icon-btn st-icon-btn--danger" data-hl-remove="${i}" aria-label="Remove">${icon('trash', 16)}</button></div>`)}
      ${list.length < LIMITS.highlights ? html`<button type="button" class="st-btn st-btn--add" data-hl-add>${icon('plus', 16)}Add a key feature</button>` : html`<p class="st-hint">Limit reached (${LIMITS.highlights}).</p>`}`);
  };
  const drawSpecs = () => {
    const groups = t.specs ?? specs;
    const total = groups.reduce((a, g) => a + g.rows.length, 0);
    setHtml(panel.querySelector('[data-try-specs]'), html`${groups.map((g, gi) => html`<div class="st-item"><header class="st-item__head"><input class="st-input st-input--title" type="text" maxlength="60" value="${g.group}" placeholder="Group name, for example General" data-sg="${gi}" aria-label="Group name"><button type="button" class="st-icon-btn st-icon-btn--danger" data-sg-remove="${gi}" aria-label="Remove group">${icon('trash', 16)}</button></header>
        <div class="st-item__body">${g.rows.map((r, ri) => html`<div class="st-row st-row--spec"><input class="st-input" type="text" maxlength="60" value="${r[0]}" placeholder="Name" data-sr="${gi}.${ri}.0" aria-label="Name"><input class="st-input" type="text" maxlength="300" value="${r[1]}" placeholder="Value" data-sr="${gi}.${ri}.1" aria-label="Value"><button type="button" class="st-icon-btn st-icon-btn--danger" data-sr-remove="${gi}.${ri}" aria-label="Remove row">${icon('close', 16)}</button></div>`)}
        ${total < LIMITS.spec_rows ? html`<button type="button" class="st-btn st-btn--add" data-sr-add="${gi}">${icon('plus', 16)}Add a row</button>` : ''}</div></div>`)}
      ${groups.length < LIMITS.spec_groups ? html`<button type="button" class="st-btn st-btn--add" data-sg-add>${icon('plus', 16)}Add a group</button>` : ''}`);
  };
  drawHl();
  drawSpecs();
  const area = panel.querySelector('.st-panel__body');
  area.oninput = (e) => {
    const el = e.target;
    if (el.hasAttribute('data-hl')) { t.highlights = (t.highlights ?? hl).slice(); t.highlights[Number(el.getAttribute('data-hl'))] = el.value; push(); }
    if (el.hasAttribute('data-sg')) { t.specs = clone(t.specs ?? specs); t.specs[Number(el.getAttribute('data-sg'))].group = el.value; push(); }
    if (el.hasAttribute('data-sr')) { const [gi, ri, ci] = el.getAttribute('data-sr').split('.').map(Number); t.specs = clone(t.specs ?? specs); t.specs[gi].rows[ri][ci] = el.value; push(); }
  };
  area.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-hl-add')) { t.highlights = (t.highlights ?? hl).concat(['']); drawHl(); push(); }
    if (b.hasAttribute('data-hl-remove')) { t.highlights = (t.highlights ?? hl).filter((x, i) => i !== Number(b.getAttribute('data-hl-remove'))); drawHl(); push(); }
    if (b.hasAttribute('data-sg-add')) { t.specs = clone(t.specs ?? specs).concat([{ group: '', rows: [['', '']] }]); drawSpecs(); push(); }
    if (b.hasAttribute('data-sg-remove')) { t.specs = clone(t.specs ?? specs); t.specs.splice(Number(b.getAttribute('data-sg-remove')), 1); drawSpecs(); push(); }
    if (b.hasAttribute('data-sr-add')) { t.specs = clone(t.specs ?? specs); t.specs[Number(b.getAttribute('data-sr-add'))].rows.push(['', '']); drawSpecs(); push(); }
    if (b.hasAttribute('data-sr-remove')) { const [gi, ri] = b.getAttribute('data-sr-remove').split('.').map(Number); t.specs = clone(t.specs ?? specs); t.specs[gi].rows.splice(ri, 1); drawSpecs(); push(); }
    if (b.hasAttribute('data-try-reset')) { delete state.productTry[slug]; drawSection(); push(); }
  };
  if (state.page !== 'product') { state.page = 'product'; syncStageControls(); refresh(0, false); }
}

/* ------------------------------------------------------------------ Shop Wording */

const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (k.startsWith('_')) return;
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object') flatten(v, key, out); else if (typeof v === 'string') out[key] = v;
  });
  return out;
};

function wordingHtml() {
  const langs = (Array.isArray(state.draft.languages_json) ? state.draft.languages_json : ['en']).filter((c) => LANGUAGES[c]);
  if (!langs.includes(state.wordingLang)) state.wordingLang = langs[0] || 'en';
  return html`<div class="st-card"><div class="st-card__body">
      <div class="st-grid-2"><div class="st-field"><label class="st-label" for="w-search">Find A Sentence</label><input class="st-input" id="w-search" type="search" placeholder="Add to cart, delivery, offer…" value="${state.wordingQuery}" data-wording-search></div>
      <div class="st-field"><label class="st-label" for="w-lang">Language</label><select class="st-input st-select" id="w-lang" data-wording-lang>${langs.map((c) => html`<option value="${c}" ${c === state.wordingLang ? raw('selected') : ''}>${LANGUAGES[c].name}</option>`)}</select></div></div>
      <label class="st-switch"><span class="st-switch__text"><span class="st-switch__label">Show Only What I Changed</span></span><input type="checkbox" role="switch" ${state.wordingChangedOnly ? raw('checked') : ''} data-wording-changed><span class="st-switch__track" aria-hidden="true"></span></label>
    </div></div>
    <div class="st-wording" data-wording-list></div>`;
}

async function stringsFor(lang) {
  if (state.strings[lang]) return state.strings[lang];
  const en = state.strings.en || (state.strings.en = await getJson('/strings/en.json', {}));
  state.strings[lang] = lang === 'en' ? en : mergeStrings(en, await getJson(`/strings/${lang}.json`, {}));
  return state.strings[lang];
}

async function drawWordingList() {
  const box = $('[data-wording-list]');
  if (!box) return;
  const base = await stringsFor(state.wordingLang);
  const flat = flatten(base);
  const over = ((state.draft.text_overrides_json || {})[state.wordingLang]) || {};
  const q = state.wordingQuery.trim().toLowerCase();
  let keys = Object.keys(flat).filter((k) => !k.startsWith('status.') && !k.startsWith('errors.'));
  if (state.wordingChangedOnly) keys = keys.filter((k) => over[k] !== undefined);
  if (q) keys = keys.filter((k) => k.toLowerCase().includes(q) || flat[k].toLowerCase().includes(q) || String(over[k] || '').toLowerCase().includes(q));
  const shown = keys.slice(0, 40);
  setHtml(box, html`<p class="st-hint">${keys.length} ${keys.length === 1 ? 'sentence' : 'sentences'}${keys.length > shown.length ? `, showing the first ${shown.length}. Type in “Find a sentence” to narrow it down.` : ''}</p>
    ${shown.map((k) => html`<div class="st-word ${over[k] !== undefined ? 'is-changed' : ''}">
      <p class="st-word__key">${k}</p><p class="st-word__orig">${flat[k]}</p>
      <div class="st-row"><input class="st-input" type="text" maxlength="300" value="${over[k] ?? ''}" placeholder="Type new wording, or leave empty to keep it" data-wording="${k}" aria-label="New wording for ${k}">
      ${over[k] !== undefined ? html`<button type="button" class="st-btn st-btn--ghost" data-reset-wording="${k}">Undo</button>` : ''}</div>
      <p class="st-word__msg" data-wording-msg="${k}"></p></div>`)}`);
}

async function onWording(input) {
  const key = input.getAttribute('data-wording');
  const base = await stringsFor(state.wordingLang);
  const msg = $(`[data-wording-msg="${CSS.escape(key)}"]`);
  const text = input.value;
  const all = state.draft.text_overrides_json && typeof state.draft.text_overrides_json === 'object' ? state.draft.text_overrides_json : (state.draft.text_overrides_json = {});
  all[state.wordingLang] = all[state.wordingLang] || {};
  if (!text.trim()) { delete all[state.wordingLang][key]; msg.textContent = ''; refresh(500); return; }
  const problem = checkOverride(base, key, text);
  if (problem) { msg.textContent = '⚠ ' + problem; msg.className = 'st-word__msg is-warn'; return; }
  msg.textContent = '✓ Looks good.';
  msg.className = 'st-word__msg is-ok';
  all[state.wordingLang][key] = text;
  input.closest('.st-word').classList.add('is-changed');
  refresh(600);
}

/* ------------------------------------------------------------------ Languages and Checks */

function languagesHtml() {
  const on = Array.isArray(state.draft.languages_json) ? state.draft.languages_json : ['en'];
  const main = state.draft.default_language || 'en';
  const opts = [['en', 'English', 'Always Available'], ['ta', 'தமிழ் (Tamil)', 'Draft Translation: Please Have A Native Speaker Check It'], ['hi', 'हिन्दी (Hindi)', state.hasHindi ? 'Available' : 'Needs A Hindi Translation File First (Ask Me To Add It)']];
  return html`<section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Languages On The Shop</h3></header><div class="st-card__body">
    ${opts.map(([c, name, sub]) => html`<label class="st-langrow ${c === 'hi' && !state.hasHindi ? 'is-off' : ''}"><input type="checkbox" data-lang-pick="on" value="${c}" ${on.includes(c) ? raw('checked') : ''} ${c === 'en' || (c === 'hi' && !state.hasHindi) ? raw('disabled') : ''}><span><strong>${name}</strong><span class="st-hint">${sub}</span></span></label>`)}
  </div></section>
  <section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Main Language</h3><p class="st-card__desc">Shown first. The other language gets its own pages (for example /ta/).</p></header><div class="st-card__body st-tiles st-tiles--3">
    ${on.filter((c) => LANGUAGES[c]).map((c) => html`<label class="st-tile st-tile--radio"><input type="radio" name="mainlang" data-lang-pick="main" value="${c}" ${c === main ? raw('checked') : ''}><span class="st-tile__label">${LANGUAGES[c].name}</span></label>`)}
  </div></section>`;
}

function onLanguages() {
  const panel = $('[data-st-panel]');
  const on = ['en'].concat(Array.from(panel.querySelectorAll('[data-lang-pick="on"]:checked')).map((x) => x.value).filter((c) => c !== 'en'));
  state.draft.languages_json = on;
  const main = panel.querySelector('[data-lang-pick="main"]:checked');
  state.draft.default_language = main && on.includes(main.value) ? main.value : 'en';
  drawSection(true);
  syncStageControls();
  refresh(0);
}

function checksHtml() {
  const changed = changedKeys();
  const secFor = (k) => (sections.find((s) => s.keys.includes(k)) || {}).id || 'colours';
  return html`<section class="st-card"><header class="st-card__head"><h3 class="st-card__title">${state.warnings.length ? `${state.warnings.length} ${state.warnings.length === 1 ? 'thing' : 'things'} to look at` : 'No Problems Found'}</h3><p class="st-card__desc">The same checks run again when the shop is built.</p></header>
    <div class="st-card__body">${state.warnings.length ? html`<ul class="st-checks">${state.warnings.map((w) => html`<li>${icon('alert', 16)}<span>${w}</span></li>`)}</ul>` : html`<p class="st-ok">${icon('check-circle', 18)}Everything you set will work on every screen.</p>`}</div></section>
    <section class="st-card"><header class="st-card__head"><h3 class="st-card__title">Changed from the live shop (${changed.length})</h3></header><div class="st-card__body">
      ${changed.length ? html`<ul class="st-changed">${changed.map((k) => html`<li><button type="button" class="st-link" data-checks-go="${secFor(k)}">${KEY_NAMES[k] || k}</button></li>`)}</ul>` : html`<p class="st-hint">Nothing changed yet.</p>`}</div></section>`;
}

/* ------------------------------------------------------------------ stage (preview screens) */

function renderMessage(device) {
  const images = {};
  const sizes = {};
  Object.entries(state.pictures).forEach(([p, x]) => { images[p] = x.url; sizes[p] = x.kb; });
  return {
    type: 'render', settings: state.draft, page: state.page, slug: state.slug, lang: state.lang, theme: state.theme,
    firstVisit: state.firstVisit, popups: state.popups, images, sizes, scrollY: state.scroll[device] || 0,
    productOverride: state.page === 'product' && state.productTry[state.slug] ? { slug: state.slug, ...state.productTry[state.slug] } : null
  };
}

function drawStage() {
  const stage = $('[data-st-stage]');
  const shown = state.device === 'all' ? Object.keys(DEVICES) : [state.device];
  frames.clear();
  setHtml(stage, html`<div class="st-screens st-screens--${state.device === 'all' ? 'all' : 'one'}">${shown.map((d) => html`<figure class="st-device st-device--${d}" data-device="${d}">
    <figcaption class="st-device__bar"><span class="st-tab"><img class="st-tab__icon" src="/client/assets/favicon.svg" alt="" width="16" height="16" data-tab-icon><span class="st-tab__title" data-tab-title>Loading</span></span><span class="st-device__size">${DEVICES[d].label}, ${DEVICES[d].w} px Wide</span></figcaption>
    <div class="st-device__screen" data-screen><iframe class="st-device__frame" title="${DEVICES[d].label} Preview" width="${DEVICES[d].w}" height="${DEVICES[d].h}" src="/preview/frame.html?v=${state.version}"></iframe></div>
  </figure>`)}</div>`);
  stage.querySelectorAll('[data-device]').forEach((card) => frames.set(card.getAttribute('data-device'), { card, iframe: card.querySelector('iframe') }));
  fitScreens();
}

function fitScreens() {
  const stage = $('[data-st-stage]');
  if (!stage || !stage.clientWidth) return;
  const all = state.device === 'all';
  const availW = stage.clientWidth - 48;
  const availH = Math.max(320, window.innerHeight - stage.getBoundingClientRect().top - 80);
  const fitK = (d) => {
    const bezel = d === 'phone' || d === 'tablet' ? 24 : 0;
    const boxW = (all ? (availW > 1100 ? (availW - 84) / 4 : availW > 640 ? (availW - 28) / 2 : availW) : availW) - bezel;
    return Math.min(1, boxW / DEVICES[d].w, all ? 1 : availH / DEVICES[d].h);
  };
  // All Four: the phone and tablet share one height, the laptop and big screen another, so they line up.
  const pairHeight = (a, b) => Math.min(DEVICES[a].h * fitK(a), DEVICES[b].h * fitK(b));
  frames.forEach(({ card, iframe }, d) => {
    const dev = DEVICES[d];
    const k = all ? pairHeight(...(d === 'phone' || d === 'tablet' ? ['phone', 'tablet'] : ['laptop', 'wide'])) / dev.h : fitK(d);
    const screen = card.querySelector('[data-screen]');
    screen.style.width = Math.round(dev.w * k) + 'px';
    screen.style.height = Math.round(dev.h * k) + 'px';
    iframe.style.width = dev.w + 'px';
    iframe.style.height = dev.h + 'px';
    iframe.style.transform = `scale(${k})`;
    card.style.width = Math.round(dev.w * k) + 'px';
  });
}

let timer = null;
function refresh(delay = 300, record = true) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.version++;
    saveDraft();
    if (record) remember();
    frames.forEach(({ iframe }) => { iframe.src = `/preview/frame.html?v=${state.version}`; });
    updateTopBar();
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
    if (msg.favicon) card.querySelector('[data-tab-icon]').src = msg.favicon;
    state.warnings = msg.warnings || [];
    updateTopBar();
    if (state.section === 'checks') drawSection();
  } else if (msg.type === 'navigate') {
    state.page = msg.page;
    state.slug = msg.slug || '';
    Object.keys(state.scroll).forEach((k) => { state.scroll[k] = 0; });
    syncStageControls();
    refresh(0, false);
  } else if (msg.type === 'note') toast(msg.text);
});

function syncStageControls() {
  $('[data-st-page]').value = state.page;
  const wrap = $('[data-st-slug-wrap]');
  const isCat = state.page === 'category';
  const isProd = state.page === 'product';
  wrap.hidden = !(isCat || isProd);
  if (isCat || isProd) {
    const list = isCat ? state.catalog.categories : state.catalog.products;
    $('[data-st-slug-label]').textContent = isCat ? 'Category' : 'Product';
    setHtml($('[data-st-slug]'), html`${list.map((x) => html`<option value="${x.slug}">${x.name}</option>`)}`);
    if (!list.some((x) => x.slug === state.slug)) state.slug = list[0] ? list[0].slug : '';
    $('[data-st-slug]').value = state.slug;
  }
  const langs = (Array.isArray(state.draft.languages_json) ? state.draft.languages_json : ['en']).filter((c) => LANGUAGES[c]);
  $('[data-st-lang-wrap]').hidden = langs.length < 2;
  setHtml($('[data-st-lang]'), html`${langs.map((c) => html`<option value="${c}">${LANGUAGES[c].name}</option>`)}`);
  if (!langs.includes(state.lang)) state.lang = langs.includes(state.draft.default_language) ? state.draft.default_language : langs[0];
  $('[data-st-lang]').value = state.lang;
}

function wireStage() {
  setHtml($('[data-st-page]'), html`${PAGES.map(([v, l]) => html`<option value="${v}">${l}</option>`)}`);
  $('[data-st-page]').addEventListener('change', (e) => { state.page = e.target.value; state.slug = ''; syncStageControls(); refresh(0, false); });
  $('[data-st-slug]').addEventListener('change', (e) => { state.slug = e.target.value; refresh(0, false); });
  $('[data-st-lang]').addEventListener('change', (e) => { state.lang = e.target.value; refresh(0, false); });
  $('[data-st-first]').addEventListener('change', (e) => { state.firstVisit = e.target.checked; refresh(0, false); });
  $('[data-st-popups]').addEventListener('change', (e) => { state.popups = e.target.checked; refresh(0, false); });
  $('[data-st-theme]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]');
    if (!b) return;
    state.theme = b.getAttribute('data-theme');
    $('[data-st-theme]').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
    refresh(0, false);
  });
  const dev = $('[data-st-devices]');
  setHtml(dev, html`${Object.entries(DEVICES).map(([k, d]) => html`<button type="button" role="radio" aria-checked="${k === state.device ? 'true' : 'false'}" data-dev="${k}" title="${d.label} (${d.w} px)">${icon(d.icon, 16)}<span>${d.label}</span></button>`)}
    <button type="button" role="radio" aria-checked="false" data-dev="all" title="All four side by side">${icon('columns', 16)}<span>All Four</span></button>`);
  dev.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dev]');
    if (!b) return;
    state.device = b.getAttribute('data-dev');
    dev.querySelectorAll('[data-dev]').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
    drawStage();
  });
  window.addEventListener('resize', fitScreens);
}

/* ------------------------------------------------------------------ Get Settings */

function displayText() {
  const body = JSON.stringify(state.draft, null, 2).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n');
  return `  "display": ${body},`;
}

function openGetSettings() {
  const dlg = $('[data-st-dialog]');
  const text = displayText();
  const pics = Object.keys(state.pictures).filter((p) => JSON.stringify(state.draft).includes(p));
  setHtml(dlg.querySelector('[data-st-dialog-body]'), html`<header class="st-dialog__head"><h2 class="st-dialog__title">Put Your Changes On The Shop</h2><button type="button" class="st-icon-btn" data-close aria-label="Close">${icon('close', 20)}</button></header>
    <ol class="st-steps">
      ${pics.length ? html`<li><strong>Upload ${pics.length === 1 ? 'this picture' : 'these pictures'}</strong> to GitHub, folder <code>client → assets</code>, with exactly ${pics.length === 1 ? 'this name' : 'these names'}:<ul class="st-files">${pics.map((p) => html`<li><code>${p.replace('client/assets/', '')}</code></li>`)}</ul></li>` : ''}
      <li><strong>Copy Your Settings</strong> with the button below.</li>
      <li>On GitHub, Open <code>client/store.config.json</code> and click the ✏️ pencil.</li>
      <li>Select From The Line <code>"display": {</code> down to the line just above <code>"seo": {</code>, then paste over it. (No <code>"display"</code> line yet? Click at the very start of the <code>"seo": {</code> line and paste there.)</li>
      <li>Click <strong>Commit Changes</strong>. Your shop updates in about 2 minutes.</li>
    </ol>
    <textarea class="st-input st-code" rows="10" readonly data-st-code aria-label="Your settings"></textarea>
    <div class="st-dialog__actions"><button type="button" class="st-btn st-btn--primary" data-st-copy>${icon('copy', 16)}Copy settings</button><button type="button" class="st-btn st-btn--soft" data-st-download>${icon('download', 16)}Download as a file</button></div>
    <p class="st-hint">From Phase 2 the admin’s Publish button does all of this for you.</p>`);
  dlg.querySelector('[data-st-code]').value = text;
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  dlg.querySelector('[data-st-copy]').focus();
}

async function copyCode(dlg) {
  const ta = dlg.querySelector('[data-st-code]');
  let ok = false;
  try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) {
    ta.focus(); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
  }
  const btn = dlg.querySelector('[data-st-copy]');
  btn.textContent = ok ? 'Copied' : 'Select The Text And Copy It';
  btn.classList.toggle('is-done', ok);
  if (!ok) { ta.focus(); ta.select(); }
  setTimeout(() => { setHtml(btn, html`${icon('copy', 16)}Copy settings`); btn.classList.remove('is-done'); }, 2500);
}

function wireDialog() {
  const dlg = $('[data-st-dialog]');
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); return; }
    if (e.target.closest('[data-st-copy]')) copyCode(dlg);
    if (e.target.closest('[data-st-download]')) {
      const blob = new Blob([displayText() + '\n'], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'shop-display-settings.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  });
}

/* ------------------------------------------------------------------ start */

async function start() {
  try { await loadStrings('en'); } catch (e) { /* the studio still works with its own words */ }
  const [live, catalog, fonts, sprite] = await Promise.all([
    getJson('/settings.public.json', {}), getJson('/catalog.json', { categories: [], products: [] }),
    getJson('/assets/fonts/fonts.json', { fonts: [] }), fetch('/icons/sprite.svg').then((r) => r.text()).catch(() => '')
  ]);
  const hi = LANGUAGES.hi.ready === true;
  state.live = pickOwnerKeys(live);
  state.catalog = catalog;
  state.fonts = fonts.fonts || [];
  // Each font tile shows its own font (loaded from the shop's own files; allowed by the shop's security rules).
  state.fonts.forEach((fnt) => {
    const file = (fnt.files || []).find((x) => x.subset === 'latin' && x.weight === 400) || (fnt.files || [])[0];
    if (!file || typeof FontFace !== 'function') return;
    const face = new FontFace(`Studio ${fnt.name}`, `url(${file.file})`);
    document.fonts.add(face);
    face.load().catch(() => {});
  });
  state.icons = [...sprite.matchAll(/id="i-([a-z0-9-]+)"/g)].map((m) => m[1]).filter((n2) => !['x', 'facebook', 'instagram', 'youtube', 'whatsapp'].includes(n2));
  state.hasHindi = hi;
  $('[data-st-shop]').textContent = live.business_name || 'Your Shop';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); state.productTry = JSON.parse(localStorage.getItem(TRY_KEY) || '{}') || {}; } catch (e) { saved = null; }
  state.draft = saved && typeof saved === 'object' ? saved : clone(state.live);
  sections = buildSections({ fonts: state.fonts, icons: state.icons });
  history.list = [JSON.stringify(state.draft)];
  history.at = 0;

  drawRail();
  $('[data-st-rail]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rail]');
    if (!b) return;
    state.section = b.getAttribute('data-rail');
    drawSection();
    document.body.setAttribute('data-view', 'settings');
  });
  wirePanel();
  wireStage();
  syncStageControls();
  drawSection();
  drawStage();
  wireDialog();
  $('[data-st-undo]').addEventListener('click', () => undoRedo(-1));
  $('[data-st-redo]').addEventListener('click', () => undoRedo(1));
  $('[data-st-get]').addEventListener('click', openGetSettings);
  $('[data-st-reset]').addEventListener('click', () => {
    if (!window.confirm('Forget every change here and start again from the live shop?')) return;
    state.draft = clone(state.live);
    state.pictures = {};
    state.productTry = {};
    drawSection();
    syncStageControls();
    refresh(0);
  });
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.key.toLowerCase() === 'z') { e.preventDefault(); undoRedo(e.shiftKey ? 1 : -1); }
    if (e.key.toLowerCase() === 'y') { e.preventDefault(); undoRedo(1); }
  });
  document.querySelectorAll('[data-view-btn]').forEach((b) => b.addEventListener('click', () => {
    document.body.setAttribute('data-view', b.getAttribute('data-view-btn'));
    document.querySelectorAll('[data-view-btn]').forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    fitScreens();
  }));
  document.body.setAttribute('data-view', 'settings');
  updateTopBar();
  if (saved) toast('Your last draft is back. “Start again” clears it.');
}

start();
