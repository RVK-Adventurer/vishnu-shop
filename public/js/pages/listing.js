/**
 * pages/listing.js — category pages, search results and the "all products" home layout
 * (Section 10.5, 23.2 CATEGORY / SEARCH RESULTS): filters (side panel on large screens, bottom sheet
 * on phones), sort, removable filter chips, 24 per page with "Load more", all kept in the web address.
 */

import { loadCatalog } from '../catalog.js';
import { buildIndex } from '../search.js';
import * as F from '../filters.js';
import { productCard, emptyState, icon, link } from '../templates.js';
import { html } from '../html.js';
import { t } from '../i18n.js';
import { settings } from '../settings.js';
import { setHtml, $ } from '../state.js';
import { setPageMeta } from '../seo.js';
import { watch } from '../ui/breakpoints.js';
import { openDialog, closeDialog } from '../ui/dialog.js';
import { announce } from '../a11y.js';

const PER_PAGE = 24;

export async function init() {
  const root = $('[data-listing]');
  if (!root) return;
  const mode = root.getAttribute('data-mode');
  const cat = await loadCatalog();
  const categoryId = root.getAttribute('data-category');
  const base = categoryId
    ? cat.products.filter((p) => p.category_id === categoryId || (cat.catById[p.category_id] && cat.catById[p.category_id].parent_id === categoryId))
    : cat.products.slice();
  let index = null;
  let state = F.readState(new URLSearchParams(location.search), { mode });
  if (state.q) index = buildIndex(cat);

  const grid = $('[data-grid]', root);
  const countEl = $('[data-result-count]');
  const chipsEl = $('[data-active-filters]', root);
  const moreBtn = $('[data-load-more]', root);
  const emptyEl = $('[data-listing-empty]', root);
  const sortSel = $('[data-sort]', root);
  const form = $('[data-filter-form]');
  const aside = $('[data-filters-aside]');
  const sheet = document.getElementById('filters-sheet');
  const sheetBody = sheet ? $('[data-filters-sheet-body]', sheet) : null;
  const countDot = $('[data-filter-count]', root);
  const titleEl = $('[data-listing-title]');
  const ctx = () => ({ s: settings(), t, cat, now: new Date() });

  /* ---- search page wording */
  if (mode === 'search') {
    const title = state.q ? t('search.results_for', { q: state.q }) : t('search.title_all');
    if (titleEl) titleEl.textContent = title;
    setPageMeta(`${title} — ${settings().business_name || ''}`, title);
  }

  /* ---- filter form placement: side panel (lg+) or bottom sheet */
  let large = false;
  watch('lg', (isLarge) => {
    large = isLarge;
    if (!form) return;
    if (isLarge && aside && !aside.contains(form)) aside.appendChild(form);
    if (!isLarge && sheetBody && !sheetBody.contains(form)) sheetBody.appendChild(form);
    if (isLarge && sheet && sheet.open) closeDialog(sheet);
  });

  /* ---- price slider */
  const bounds = F.priceBounds(base);
  const rMin = form && $('[data-range-min]', form);
  const rMax = form && $('[data-range-max]', form);
  const bMin = form && $('[data-min-box]', form);
  const bMax = form && $('[data-max-box]', form);
  const fill = form && $('[data-range-fill]', form);
  [rMin, rMax].forEach((r) => { if (r) { r.min = String(bounds.min); r.max = String(bounds.max); r.step = '1'; } });
  [bMin, bMax].forEach((b) => { if (b) { b.min = String(bounds.min); b.max = String(bounds.max); b.placeholder = ''; } });
  if (bMin) bMin.placeholder = String(bounds.min);
  if (bMax) bMax.placeholder = String(bounds.max);

  const paintFill = () => {
    if (!fill || !rMin || bounds.max <= bounds.min) return;
    const span = bounds.max - bounds.min;
    const a = ((Number(rMin.value) - bounds.min) / span) * 100;
    const b = ((Number(rMax.value) - bounds.min) / span) * 100;
    fill.style.left = `calc(10px + (100% - 20px) * ${a / 100})`;
    fill.style.right = `calc(10px + (100% - 20px) * ${(100 - b) / 100})`;
  };

  function fillForm() {
    if (!form) return;
    if (rMin) rMin.value = String(state.min ?? bounds.min);
    if (rMax) rMax.value = String(state.max ?? bounds.max);
    if (bMin) bMin.value = state.min === null ? '' : String(state.min);
    if (bMax) bMax.value = state.max === null ? '' : String(state.max);
    form.querySelectorAll('input[name="cat"]').forEach((c) => { c.checked = state.cats.includes(c.value); });
    form.querySelectorAll('input[name="rating"]').forEach((r) => { r.checked = String(state.rating || '') === r.value; });
    const av = form.querySelector('input[name="avail"]');
    if (av) av.checked = state.avail;
    paintFill();
  }

  function readForm() {
    const s = { ...state, page: 1 };
    const vMin = bMin && bMin.value !== '' ? Math.max(0, Math.floor(Number(bMin.value))) : null;
    const vMax = bMax && bMax.value !== '' ? Math.max(0, Math.floor(Number(bMax.value))) : null;
    s.min = vMin !== null && vMin > bounds.min ? vMin : null;
    s.max = vMax !== null && vMax < bounds.max ? vMax : null;
    if (s.min !== null && s.max !== null && s.min > s.max) [s.min, s.max] = [s.max, s.min];
    s.cats = Array.from(form.querySelectorAll('input[name="cat"]:checked')).map((c) => c.value);
    const r = form.querySelector('input[name="rating"]:checked');
    s.rating = r && r.value ? Number(r.value) : null;
    const av = form.querySelector('input[name="avail"]');
    s.avail = !!(av && av.checked);
    return s;
  }

  /* ---- rendering */
  function render({ append = false } = {}) {
    const list = F.apply(base, state, cat, index);
    const shown = list.slice(0, state.page * PER_PAGE);
    if (append) {
      const start = (state.page - 1) * PER_PAGE;
      grid.insertAdjacentHTML('beforeend', html`${list.slice(start, state.page * PER_PAGE).map((p) => productCard(p, ctx()))}`.toString());
    } else {
      setHtml(grid, html`${shown.map((p, i) => productCard(p, ctx(), { eager: i < 2 }))}`);
    }
    if (countEl) countEl.textContent = list.length ? t('listing.count', { n: list.length }) : '';
    if (moreBtn) moreBtn.hidden = shown.length >= list.length;
    if (emptyEl) {
      emptyEl.hidden = list.length > 0;
      if (!list.length) {
        setHtml(emptyEl, state.q && !F.activeCount(state)
          ? emptyState({ iconName: 'search', title: t('search.no_results_title', { q: state.q }), text: t('search.no_results_text'), action: html`<a class="btn btn--primary" href="${link('/search/')}">${t('header.all_products')}</a>` })
          : emptyState({ iconName: 'filter', title: t('listing.empty_title'), text: t('listing.empty_text'), action: html`<button class="btn btn--ghost" type="button" data-clear-filters>${t('filters.clear_all')}</button>` }));
      }
    }
    const chipList = F.chips(state, cat, t);
    setHtml(chipsEl, html`${chipList.map((c) => html`<button class="fchip" type="button" data-chip="${c.key}" aria-label="${t('filters.chip_remove', { label: c.label })}">${c.label}${icon('close', 16)}</button>`)}
      ${chipList.length > 1 ? html`<button class="btn btn--ghost btn--sm" type="button" data-clear-filters>${t('filters.clear_all')}</button>` : ''}`);
    const n = F.activeCount(state);
    if (countDot) { countDot.hidden = !n; countDot.textContent = String(n); }
    if (sortSel) sortSel.value = state.sort;
    history.replaceState(null, '', location.pathname + F.writeState(state) + location.hash);
    return list.length;
  }

  function change(next, { announceCount = true } = {}) {
    state = next;
    if (state.q && !index) index = buildIndex(cat);
    const total = render();
    fillForm();
    if (announceCount) announce(t('listing.count', { n: total }));
  }

  /* ---- events */
  if (form) {
    form.addEventListener('input', (e) => {
      if (e.target === rMin || e.target === rMax) {
        if (Number(rMin.value) > Number(rMax.value)) {
          if (e.target === rMin) rMin.value = rMax.value; else rMax.value = rMin.value;
        }
        if (bMin) bMin.value = Number(rMin.value) <= bounds.min ? '' : rMin.value;
        if (bMax) bMax.value = Number(rMax.value) >= bounds.max ? '' : rMax.value;
        paintFill();
      }
    });
    form.addEventListener('change', (e) => {
      if (e.target === bMin && rMin) rMin.value = bMin.value || String(bounds.min);
      if (e.target === bMax && rMax) rMax.value = bMax.value || String(bounds.max);
      paintFill();
      if (large) change(readForm());       // big screens: apply at once
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      change(readForm());
      if (sheet && sheet.open) closeDialog(sheet);
    });
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear-filters]')) {
      e.preventDefault();
      change(F.clearAll(state));
      if (sheet && sheet.open) closeDialog(sheet);
      return;
    }
    const chip = e.target.closest('[data-chip]');
    if (chip) { change(F.removeChip(state, chip.getAttribute('data-chip'))); return; }
    const opener = e.target.closest('[data-open-filters]');
    if (opener && sheet) { fillForm(); openDialog(sheet, { opener }); }
  });
  if (sortSel) sortSel.addEventListener('change', () => change({ ...state, sort: sortSel.value, page: 1 }));
  if (moreBtn) moreBtn.addEventListener('click', () => {
    state = { ...state, page: state.page + 1 };
    render({ append: true });
    const first = grid.children[(state.page - 1) * PER_PAGE];
    const link = first && first.querySelector('a');
    if (link) link.focus({ preventScroll: false });
  });

  /* ---- first paint: keep the pre-rendered grid when nothing is filtered */
  const untouched = !state.q && !F.activeCount(state) && state.sort === state.defaultSort && state.page === 1 && mode !== 'search';
  fillForm();
  if (!untouched) render();
  else {
    const n = F.activeCount(state);
    if (countDot) { countDot.hidden = !n; }
    if (sortSel) sortSel.value = state.sort;
  }
}
