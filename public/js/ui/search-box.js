/**
 * ui/search-box.js — the header search (computers) and the full-screen search (phones), Section 23.8
 * SEARCH OVERLAY: suggestions after a 200 ms pause, keyboard-friendly (ARIA combobox: ↑ ↓ Enter Esc),
 * recent searches on this device, popular categories, and "See all results".
 */

import { loadCatalog } from '../catalog.js';
import { buildIndex, suggest, highlight } from '../search.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { local, debounce, setHtml } from '../state.js';
import { icon, productUrl, categoryUrl, leadVariant, link } from '../templates.js';
import { formatRupees } from '../money.js';
import { openDialog, closeDialog } from './dialog.js';

const RECENT_KEY = 'searches:v1';
let index = null;
let cat = null;

async function ready() {
  if (!index) {
    cat = await loadCatalog();
    index = buildIndex(cat);
  }
}

function recent() {
  return local.get(RECENT_KEY) || [];
}

function remember(q) {
  const v = q.trim();
  if (!v) return;
  local.set(RECENT_KEY, [v, ...recent().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8));
}

function goSearch(q) {
  remember(q);
  location.href = link('/search/?q=') + encodeURIComponent(q.trim());
}

let uid = 0;

function renderSuggestions(box, q, isSheet) {
  const query = q.trim();
  if (!query) {
    if (!isSheet) { box.hidden = true; return []; }
    const r = recent();
    const top = cat ? cat.categories.filter((c) => !c.parent_id).slice(0, 6) : [];
    setHtml(box, html`
      ${r.length ? html`<div class="suggest__group" role="presentation">${t('search.recent')} <button class="btn btn--ghost btn--sm" type="button" data-clear-recent>${t('search.clear_recent')}</button></div>
        <div class="recent-chips">${r.map((x) => html`<button class="recent-chip" type="button" data-recent="${x}">${x}</button>`)}</div>` : ''}
      ${top.length ? html`<div class="suggest__group" role="presentation">${t('search.popular')}</div>
        ${top.map((c) => html`<a class="suggest__row" role="option" id="sg-${++uid}" href="${categoryUrl(c)}"><span class="suggest__icon">${icon('grid', 20)}</span><span class="suggest__name">${c.name}</span></a>`)}` : ''}
      ${!r.length && !top.length ? html`<p class="muted">${t('search.start_typing')}</p>` : ''}`);
    box.hidden = false;
    return Array.from(box.querySelectorAll('[role="option"]'));
  }
  const { products, categories } = suggest(index, cat, query);
  setHtml(box, html`
    ${products.map((p) => {
      const v = leadVariant(p);
      const img = (p.images || [])[0];
      return html`<a class="suggest__row" role="option" id="sg-${++uid}" href="${productUrl(p)}">
        ${img ? html`<img class="suggest__thumb" src="${img.thumb || img.card}" alt="" width="40" height="40" loading="lazy">` : html`<span class="suggest__icon">${icon('box', 20)}</span>`}
        <span class="suggest__name">${highlight(p.name, query)}</span>${v ? html`<span class="suggest__meta">${formatRupees(v.price)}</span>` : ''}</a>`;
    })}
    ${categories.map((c) => html`<a class="suggest__row" role="option" id="sg-${++uid}" href="${categoryUrl(c)}"><span class="suggest__icon">${icon('grid', 20)}</span><span class="suggest__name">${highlight(c.name, query)}</span><span class="suggest__meta">${t('search.in_categories')}</span></a>`)}
    <a class="suggest__row suggest__all" role="option" id="sg-${++uid}" href="${link('/search/?q=' + encodeURIComponent(query))}" data-see-all><span class="suggest__icon">${icon('search', 20)}</span><span class="suggest__name">${t('search.see_all', { q: query })}</span></a>`);
  box.hidden = false;
  return Array.from(box.querySelectorAll('[role="option"]'));
}

function wireForm(form) {
  if (form.dataset.searchWired) return;
  form.dataset.searchWired = '1';
  const input = form.querySelector('[data-search-input]');
  const listId = input.getAttribute('aria-controls');
  const box = document.getElementById(listId);
  const isSheet = !!(box && box.hasAttribute('data-suggest-sheet'));
  let options = [];
  let active = -1;

  const setActive = (i) => {
    options.forEach((o, k) => o.setAttribute('aria-selected', k === i ? 'true' : 'false'));
    active = i;
    if (i >= 0 && options[i]) {
      input.setAttribute('aria-activedescendant', options[i].id);
      options[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const update = async () => {
    await ready();
    options = renderSuggestions(box, input.value, isSheet);
    input.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
    setActive(-1);
  };
  const debounced = debounce(update, 200);

  input.addEventListener('focus', () => { ready().then(() => { if (isSheet || input.value.trim()) update(); }); });
  input.addEventListener('input', debounced);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && options.length) { e.preventDefault(); setActive((active + 1) % options.length); }
    else if (e.key === 'ArrowUp' && options.length) { e.preventDefault(); setActive(active <= 0 ? options.length - 1 : active - 1); }
    else if (e.key === 'Enter' && active >= 0 && options[active]) { e.preventDefault(); remember(input.value); location.href = options[active].getAttribute('href'); }
    else if (e.key === 'Escape' && !isSheet && !box.hidden) { e.preventDefault(); box.hidden = true; input.setAttribute('aria-expanded', 'false'); setActive(-1); }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim()) goSearch(input.value);
  });

  box.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-recent]');
    if (chip) { goSearch(chip.getAttribute('data-recent')); return; }
    if (e.target.closest('[data-clear-recent]')) { local.remove(RECENT_KEY); update(); return; }
    const row = e.target.closest('a.suggest__row');
    if (row) remember(input.value);
  });

  if (!isSheet) {
    document.addEventListener('click', (e) => {
      if (!form.contains(e.target) && !box.hidden) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); }
    });
  }
}

export function initSearch() {
  document.querySelectorAll('[data-search-form]').forEach(wireForm);
  const q = new URLSearchParams(location.search).get('q');
  if (q && document.body.dataset.page === 'search') {
    document.querySelectorAll('[data-search-input]').forEach((i) => { i.value = q; });
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-search]');
    if (!btn) return;
    e.preventDefault();
    const dlg = openDialog('search-overlay', { opener: btn });
    if (dlg) {
      const input = dlg.querySelector('[data-search-input]');
      setTimeout(() => { input.focus(); input.dispatchEvent(new Event('focus')); }, 60);
    }
  });
}

export { closeDialog };
