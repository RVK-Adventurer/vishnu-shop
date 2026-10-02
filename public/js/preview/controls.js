/**
 * preview/controls.js: the building blocks of Shop Studio (the Design preview at /preview/) and,
 * from Phase 2, of the admin's look screens: tiles, switches, sliders, colour and gradient pickers,
 * picture slots with exact-shape checks, ordered lists and list editors.
 *
 * Every control is bound to one setting path ("hero_cover_json.title", "popups_json.0.code") with
 * data-bind; Studio's single event handler reads it back (readBound) and refreshes the preview.
 * Limits come from limits.js and cover.js, so every slider and list stops exactly at its limit.
 */

import { html, raw } from '../html.js';
import { icon } from '../templates.js';
import { parsePaint } from '../theme.js';

/* ------------------------------------------------------------------ draft helpers */

export function getPath(obj, path) {
  return String(path).split('.').reduce((o, k) => (o !== null && o !== undefined && typeof o === 'object' ? o[k] : undefined), obj);
}

export function setPath(obj, path, value) {
  const parts = String(path).split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextIsIndex = /^\d+$/.test(parts[i + 1]);
    if (node[k] === null || typeof node[k] !== 'object') node[k] = nextIsIndex ? [] : {};
    node = node[k];
  }
  const last = parts[parts.length - 1];
  if (value === undefined) { if (Array.isArray(node)) node.splice(Number(last), 1); else delete node[last]; }
  else node[last] = value;
}

/* ------------------------------------------------------------------ paints */

export function paintParts(value) {
  const p = parsePaint(value);
  if (!p) return { kind: 'theme', c1: '#4338CA', c2: '#DB2777', c3: '', angle: 135 };
  return { kind: p.style === 'solid' ? 'solid' : p.style, c1: p.stops[0], c2: p.stops[1] || '#DB2777', c3: p.stops[2] || '', angle: p.angle || 135 };
}

export function paintValue(kind, c1, c2, c3, angle) {
  if (!kind || kind === 'theme') return '';
  if (kind === 'solid') return c1.toUpperCase();
  const stops = [c1, c2, c3].filter(Boolean).map((c) => c.toUpperCase()).join(', ');
  return kind === 'radial' ? `radial-gradient(${stops})` : `linear-gradient(${angle}deg, ${stops})`;
}

/** A CSS background for small previews of a paint (set with element.style, which the policy allows). */
export function paintPreview(value) {
  const p = parsePaint(value);
  if (!p) return '';
  if (p.stops.length === 1) return p.stops[0];
  return p.style === 'radial' ? `radial-gradient(circle at 30% 30%, ${p.stops.join(', ')})` : `linear-gradient(${p.angle}deg, ${p.stops.join(', ')})`;
}

/** Named gradients that suit Indian shops (all readable with white text). */
export const GRADIENT_PRESETS = [
  { name: 'Sunset', value: 'linear-gradient(135deg, #EA580C, #BE185D)' },
  { name: 'Peacock', value: 'linear-gradient(135deg, #0F766E, #1D4ED8)' },
  { name: 'Royal', value: 'linear-gradient(135deg, #312E81, #7C3AED)' },
  { name: 'Lotus', value: 'linear-gradient(135deg, #BE185D, #7C3AED)' },
  { name: 'Kumkum', value: 'linear-gradient(135deg, #9F1239, #E11D48)' },
  { name: 'Mango', value: 'linear-gradient(135deg, #C2410C, #B45309)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #14532D, #15803D)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #0C4A6E, #0369A1)' },
  { name: 'Night', value: 'linear-gradient(135deg, #0F172A, #334155)' },
  { name: 'Temple Gold', value: 'linear-gradient(135deg, #78350F, #B45309, #92400E)' }
];

/** One-tap gradient themes: brand colours plus a matching brand gradient. */
export const GRADIENT_THEMES = [
  { name: 'Sunset Sweets', primary: '#C2410C', secondary: '#9D174D', accent: '#FBBF24', gradient: 'linear-gradient(135deg, #EA580C, #BE185D)' },
  { name: 'Peacock Blue', primary: '#0F766E', secondary: '#1E40AF', accent: '#FACC15', gradient: 'linear-gradient(135deg, #0F766E, #1D4ED8)' },
  { name: 'Royal Silk', primary: '#5B21B6', secondary: '#9D174D', accent: '#F59E0B', gradient: 'linear-gradient(135deg, #312E81, #7C3AED)' },
  { name: 'Lotus Pink', primary: '#BE185D', secondary: '#6D28D9', accent: '#FDE68A', gradient: 'linear-gradient(135deg, #BE185D, #7C3AED)' },
  { name: 'Fresh Leaf', primary: '#15803D', secondary: '#0E7490', accent: '#FACC15', gradient: 'linear-gradient(135deg, #14532D, #15803D)' },
  { name: 'Temple Gold', primary: '#92400E', secondary: '#78350F', accent: '#FBBF24', gradient: 'linear-gradient(135deg, #78350F, #B45309, #92400E)' }
];

/* ------------------------------------------------------------------ field builders */

let n = 0;
const uid = () => 'f' + (++n);
const hintHtml = (hint) => (hint ? html`<p class="st-hint">${hint}</p>` : '');

/** Builders for one section, reading values from the current draft. */
export function fields(draft, opts = {}) {
  const val = (path, def) => { const v = getPath(draft, path); return v === undefined || v === null ? def : v; };

  return {
    group(title, inner, desc = '') {
      return html`<section class="st-card"><header class="st-card__head"><h3 class="st-card__title">${title}</h3>${desc ? html`<p class="st-card__desc">${desc}</p>` : ''}</header><div class="st-card__body">${inner}</div></section>`;
    },
    note(text, kind = 'info') {
      return html`<p class="st-note st-note--${kind}">${icon(kind === 'warn' ? 'alert' : 'info', 16)}<span>${text}</span></p>`;
    },
    text(path, label, { max = 120, placeholder = '', hint = '' } = {}) {
      const id = uid();
      return html`<div class="st-field"><label class="st-label" for="${id}">${label}</label>
        <input class="st-input" id="${id}" type="text" maxlength="${max}" placeholder="${placeholder}" value="${val(path, '')}" data-bind="${path}" data-kind="text">${hintHtml(hint)}</div>`;
    },
    textarea(path, label, { max = 300, placeholder = '', hint = '', rows = 3 } = {}) {
      const id = uid();
      return html`<div class="st-field"><label class="st-label" for="${id}">${label}</label>
        <textarea class="st-input st-textarea" id="${id}" rows="${rows}" maxlength="${max}" placeholder="${placeholder}" data-bind="${path}" data-kind="text">${val(path, '')}</textarea>${hintHtml(hint)}</div>`;
    },
    range(path, label, { min, max, step = 1, unit = '', def, hint = '' }) {
      const id = uid();
      const v = val(path, def);
      return html`<div class="st-field"><div class="st-label-row"><label class="st-label" for="${id}">${label}</label><output class="st-value" data-out>${v}${unit}</output></div>
        <input class="st-range" id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-kind="range" data-unit="${unit}">
        <div class="st-range__ends" aria-hidden="true"><span>${min}${unit}</span><span>${max}${unit}</span></div>${hintHtml(hint)}</div>`;
    },
    switch(path, label, { def = true, hint = '' } = {}) {
      const on = val(path, def) !== false;
      return html`<label class="st-switch"><span class="st-switch__text"><span class="st-switch__label">${label}</span>${hint ? html`<span class="st-hint">${hint}</span>` : ''}</span>
        <input type="checkbox" role="switch" ${on ? raw('checked') : ''} data-bind="${path}" data-kind="switch"><span class="st-switch__track" aria-hidden="true"></span></label>`;
    },
    select(path, label, options, { def = '', hint = '' } = {}) {
      const id = uid();
      const v = val(path, def);
      return html`<div class="st-field"><label class="st-label" for="${id}">${label}</label>
        <select class="st-input st-select" id="${id}" data-bind="${path}" data-kind="select">${options.map(([o, l]) => html`<option value="${o}" ${String(v) === String(o) ? raw('selected') : ''}>${l}</option>`)}</select>${hintHtml(hint)}</div>`;
    },
    /** Picture-like choices: options = [{ value, label, art }]. */
    tiles(path, label, options, { def = '', cols = 3, hint = '' } = {}) {
      const v = val(path, def);
      return html`<div class="st-field"><span class="st-label">${label}</span>
        <div class="st-tiles st-tiles--${cols}" role="radiogroup" aria-label="${label}" data-bind="${path}" data-kind="tiles">
          ${options.map((o) => html`<button type="button" class="st-tile" role="radio" aria-checked="${String(v) === String(o.value) ? 'true' : 'false'}" data-value="${o.value}">
            ${o.art ? html`<span class="st-tile__art" aria-hidden="true">${o.art}</span>` : ''}<span class="st-tile__label">${o.label}</span></button>`)}
        </div>${hintHtml(hint)}</div>`;
    },
    /** Several on/off choices stored as a list. */
    chips(path, label, options, { def = [], hint = '' } = {}) {
      const list = Array.isArray(val(path, def)) ? val(path, def) : [];
      return html`<div class="st-field"><span class="st-label">${label}</span>
        <div class="st-chips" role="group" aria-label="${label}" data-bind="${path}" data-kind="chips">
          ${options.map(([o, l]) => html`<button type="button" class="st-chip" aria-pressed="${list.includes(o) ? 'true' : 'false'}" data-value="${o}">${icon('check', 14, 'st-chip__tick')}${l}</button>`)}
        </div>${hintHtml(hint)}</div>`;
    },
    color(path, label, { def = '#4338CA', hint = '' } = {}) {
      const v = String(val(path, def) || def).toUpperCase();
      const id = uid();
      return html`<div class="st-field st-color" data-bind="${path}" data-kind="color"><label class="st-label" for="${id}">${label}</label>
        <div class="st-color__row"><span class="st-color__well"><input type="color" value="${/^#[0-9A-F]{6}$/.test(v) ? v : def}" data-c="pick" aria-label="${label}: Pick"></span>
          <input class="st-input st-color__hex" id="${id}" type="text" maxlength="7" value="${v}" spellcheck="false" data-c="hex" aria-label="${label}: Colour code"></div>${hintHtml(hint)}</div>`;
    },
    /** Theme colour, one colour, a gradient or a round glow, with a live preview bar. */
    paint(path, label, { def = '', hint = '', allowTheme = true, themeLabel = 'Theme Colour' } = {}) {
      const p = paintParts(val(path, def));
      const kinds = [allowTheme ? ['theme', themeLabel] : null, ['solid', 'One Colour'], ['linear', 'Gradient'], ['radial', 'Glow']].filter(Boolean);
      const kind = !allowTheme && p.kind === 'theme' ? 'linear' : p.kind;
      return html`<div class="st-field st-paint" data-bind="${path}" data-kind="paint">
        <span class="st-label">${label}</span>
        <div class="st-seg" role="radiogroup" aria-label="${label}: Type">${kinds.map(([k, l]) => html`<button type="button" role="radio" aria-checked="${kind === k ? 'true' : 'false'}" data-p-kind="${k}">${l}</button>`)}</div>
        <div class="st-paint__bar" data-paint-bar aria-hidden="true"></div>
        <div class="st-paint__stops" ${kind === 'theme' ? raw('hidden') : ''}>
          <span class="st-color__well"><input type="color" value="${p.c1}" data-p="c1" aria-label="${label}: Colour 1"></span>
          <span class="st-color__well" ${kind === 'solid' ? raw('hidden') : ''}><input type="color" value="${p.c2}" data-p="c2" aria-label="${label}: Colour 2"></span>
          <span class="st-color__well" ${kind === 'solid' || !p.c3 ? raw('hidden') : ''}><input type="color" value="${p.c3 || '#F59E0B'}" data-p="c3" aria-label="${label}: Colour 3"></span>
          <button type="button" class="st-mini" data-p-third ${kind === 'solid' ? raw('hidden') : ''}>${p.c3 ? 'Remove Third Colour' : 'Add Third Colour'}</button>
        </div>
        <div class="st-paint__angle" ${kind !== 'linear' ? raw('hidden') : ''}><span class="st-label st-label--small">Direction</span><input class="st-range" type="range" min="0" max="360" step="15" value="${p.angle}" data-p="angle" aria-label="${label}: Direction"><output class="st-value">${p.angle}°</output></div>
        <div class="st-presets" ${kind === 'theme' || kind === 'solid' ? raw('hidden') : ''} data-p-presets>${GRADIENT_PRESETS.map((g) => html`<button type="button" class="st-preset" data-p-preset="${g.value}"><span class="st-preset__dot" data-paint-swatch="${g.value}" aria-hidden="true"></span><span>${g.name}</span></button>`)}</div>
        ${hintHtml(hint)}</div>`;
    },
    /** A picture slot drawn in the exact shape it needs. */
    image(path, label, { slot, shape = '3 / 1', size = '', hint = '', svg = false } = {}) {
      const v = String(val(path, '') || '');
      const pic = v ? (opts.pictures || {})[v.replace(/^\//, '')] : null;
      return html`<div class="st-field st-image" data-bind="${path}" data-kind="image" data-slot="${slot}">
        <span class="st-label">${label}</span>
        <div class="st-image__frame" data-shape="${shape}">
          ${pic ? html`<img src="${pic.url}" alt="">` : v ? html`<img src="/${v.replace(/^\//, '')}" alt="" data-fallback>` : html`<span class="st-image__empty">${icon('image', 22)}<span>${size || 'Choose A Picture'}</span></span>`}
        </div>
        <div class="st-image__actions">
          <label class="st-btn st-btn--soft">${icon('upload', 16)}${v ? 'Change Picture' : 'Choose Picture'}<input type="file" accept="${svg ? 'image/*' : 'image/jpeg,image/png,image/webp'}" data-i="file" hidden></label>
          ${v ? html`<button type="button" class="st-btn st-btn--ghost" data-i="clear">Remove</button>` : ''}
        </div>
        <input class="st-input st-input--small" type="text" value="${v}" placeholder="client/assets/file-name.jpg" data-i="path" aria-label="${label}: File name">
        <p class="st-verdict" data-verdict></p>${hintHtml(hint)}</div>`;
    },
    /** Tick to show, arrows to reorder. */
    order(path, label, { all, names, def }) {
      const raw0 = val(path, def);
      const list = Array.isArray(raw0) ? raw0.filter((x) => all.includes(x)) : def.slice();
      const rows = list.concat(all.filter((x) => !list.includes(x)));
      return html`<div class="st-field"><span class="st-label">${label}</span>
        <ol class="st-order" data-bind="${path}" data-kind="order">${rows.map((name, i) => html`<li class="${list.includes(name) ? 'st-order__row' : 'st-order__row is-off'}" data-name="${name}">
          <label class="st-order__check"><input type="checkbox" ${list.includes(name) ? raw('checked') : ''}><span>${names[name] || name}</span></label>
          <span class="st-order__btns"><button type="button" class="st-icon-btn" data-move="-1" aria-label="Move ${names[name] || name} Up" ${i === 0 ? raw('disabled') : ''}>${icon('chevron-up', 16)}</button><button type="button" class="st-icon-btn" data-move="1" aria-label="Move ${names[name] || name} Down" ${i === rows.length - 1 ? raw('disabled') : ''}>${icon('chevron-down', 16)}</button></span>
        </li>`)}</ol></div>`;
    },
    /** Date and time in India time, stored as "2026-10-20T09:00:00+05:30". */
    datetime(path, label, { hint = '' } = {}) {
      const v = String(val(path, '') || '');
      const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? v.slice(0, 16) : '';
      const id = uid();
      return html`<div class="st-field"><label class="st-label" for="${id}">${label}</label>
        <input class="st-input" id="${id}" type="datetime-local" value="${local}" data-bind="${path}" data-kind="datetime">${hintHtml(hint)}</div>`;
    },
    /** A list of cards (banners, pop-ups, trust items, footer columns). */
    list(path, { label, max, addLabel, title, body, empty = '' }) {
      const items = Array.isArray(val(path, [])) ? val(path, []) : [];
      return html`<div class="st-list" data-list="${path}" data-max="${max}">
        ${label ? html`<div class="st-label-row"><span class="st-label">${label}</span><span class="st-count">${items.length} of ${max}</span></div>` : ''}
        ${!items.length && empty ? html`<p class="st-empty">${empty}</p>` : ''}
        ${items.map((it, i) => html`<article class="st-item" data-index="${i}">
          <header class="st-item__head"><span class="st-item__num" aria-hidden="true">${i + 1}</span><span class="st-item__title">${title(it, i)}</span>
            <span class="st-item__tools"><button type="button" class="st-icon-btn" data-list-move="-1" aria-label="Move up" ${i === 0 ? raw('disabled') : ''}>${icon('chevron-up', 16)}</button><button type="button" class="st-icon-btn" data-list-move="1" aria-label="Move down" ${i === items.length - 1 ? raw('disabled') : ''}>${icon('chevron-down', 16)}</button><button type="button" class="st-icon-btn st-icon-btn--danger" data-list-remove aria-label="Remove">${icon('trash', 16)}</button></span></header>
          <div class="st-item__body">${body(`${path}.${i}`, it, i)}</div></article>`)}
        ${items.length < max ? html`<button type="button" class="st-btn st-btn--add" data-list-add>${icon('plus', 16)}${addLabel}</button>` : html`<p class="st-hint">Limit reached (${max}).</p>`}
      </div>`;
    }
  };
}

/* ------------------------------------------------------------------ reading a control back */

const toIst = (local) => (local ? `${local}:00+05:30` : undefined);
const OPTIONAL_TEXT = /^(hero_cover_json|popups_json|hero_banners_json)\./;

/**
 * Reads the control the owner just used and writes it into the draft. Returns false when nothing
 * changed, 'redraw' when the section must be drawn again, otherwise true.
 */
export function readBound(target, draft) {
  const host = target.closest('[data-bind]');
  if (!host) return false;
  const path = host.getAttribute('data-bind');
  const kind = host.getAttribute('data-kind');
  switch (kind) {
    case 'text': setPath(draft, path, host.value === '' && OPTIONAL_TEXT.test(path) ? undefined : host.value); return true;
    case 'select': setPath(draft, path, host.value); return true;
    case 'switch': setPath(draft, path, host.checked); return true;
    case 'range': {
      setPath(draft, path, Number(host.value));
      const out = host.closest('.st-field').querySelector('[data-out]');
      if (out) out.textContent = host.value + (host.getAttribute('data-unit') || '');
      return true;
    }
    case 'datetime': setPath(draft, path, toIst(host.value)); return true;
    case 'tiles': {
      const b = target.closest('[data-value]');
      if (!b) return false;
      setPath(draft, path, b.getAttribute('data-value'));
      host.querySelectorAll('[data-value]').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      return 'tiles';
    }
    case 'chips': {
      const b = target.closest('[data-value]');
      if (!b) return false;
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      setPath(draft, path, Array.from(host.querySelectorAll('[aria-pressed="true"]')).map((x) => x.getAttribute('data-value')));
      return true;
    }
    case 'color': {
      const pick = host.querySelector('[data-c="pick"]');
      const hex = host.querySelector('[data-c="hex"]');
      let v = (target === pick ? pick.value : hex.value).trim().toUpperCase();
      if (/^[0-9A-F]{6}$/.test(v)) v = '#' + v;
      if (!/^#[0-9A-F]{6}$/.test(v)) { hex.classList.add('is-bad'); return false; }
      hex.classList.remove('is-bad');
      if (target === pick) hex.value = v; else pick.value = v;
      setPath(draft, path, v);
      return true;
    }
    case 'paint': {
      const q = (s) => host.querySelector(s);
      const kindBtn = target.closest('[data-p-kind]');
      if (kindBtn) host.querySelectorAll('[data-p-kind]').forEach((b) => b.setAttribute('aria-checked', b === kindBtn ? 'true' : 'false'));
      const preset = target.closest('[data-p-preset]');
      if (preset) {
        const pp = paintParts(preset.getAttribute('data-p-preset'));
        q('[data-p="c1"]').value = pp.c1;
        q('[data-p="c2"]').value = pp.c2;
        q('[data-p="c3"]').parentElement.hidden = !pp.c3;
        if (pp.c3) q('[data-p="c3"]').value = pp.c3;
        q('[data-p="angle"]').value = pp.angle;
        host.querySelectorAll('[data-p-kind]').forEach((b) => b.setAttribute('aria-checked', b.getAttribute('data-p-kind') === 'linear' ? 'true' : 'false'));
      }
      const thirdBtn = target.closest('[data-p-third]');
      if (thirdBtn) q('[data-p="c3"]').parentElement.hidden = !q('[data-p="c3"]').parentElement.hidden;
      const sel = host.querySelector('[data-p-kind][aria-checked="true"]');
      const k = sel ? sel.getAttribute('data-p-kind') : 'theme';
      const third = !q('[data-p="c3"]').parentElement.hidden && k !== 'solid';
      const angle = Number(q('[data-p="angle"]').value);
      setPath(draft, path, paintValue(k, q('[data-p="c1"]').value, q('[data-p="c2"]').value, third ? q('[data-p="c3"]').value : '', angle) || undefined);
      q('.st-paint__stops').hidden = k === 'theme';
      q('[data-p="c2"]').parentElement.hidden = k === 'solid';
      q('[data-p-third]').hidden = k === 'solid';
      q('[data-p-third]').textContent = third ? 'Remove Third Colour' : 'Add Third Colour';
      if (k === 'solid') q('[data-p="c3"]').parentElement.hidden = true;
      q('.st-paint__angle').hidden = k !== 'linear';
      q('.st-paint__angle output').textContent = angle + '°';
      q('[data-p-presets]').hidden = k === 'theme' || k === 'solid';
      return 'paint';
    }
    case 'image': {
      if (target.getAttribute('data-i') === 'path') { setPath(draft, path, target.value.trim() || undefined); return true; }
      if (target.closest('[data-i="clear"]')) { setPath(draft, path, undefined); return 'redraw'; }
      return false;
    }
    case 'order': {
      const rows = Array.from(host.querySelectorAll('.st-order__row'));
      rows.forEach((r, i) => {
        r.classList.toggle('is-off', !r.querySelector('input').checked);
        r.querySelector('[data-move="-1"]').disabled = i === 0;
        r.querySelector('[data-move="1"]').disabled = i === rows.length - 1;
      });
      setPath(draft, path, rows.filter((r) => r.querySelector('input').checked).map((r) => r.getAttribute('data-name')));
      return true;
    }
    default: return false;
  }
}

/** After drawing: paint previews, swatches and picture-frame shapes (style set from script is allowed). */
export function decorate(root, draft) {
  root.querySelectorAll('[data-kind="paint"]').forEach((host) => {
    const bar = host.querySelector('[data-paint-bar]');
    const v = paintPreview(getPath(draft, host.getAttribute('data-bind')));
    bar.style.background = v || '';
    bar.classList.toggle('is-theme', !v);
  });
  root.querySelectorAll('[data-paint-swatch]').forEach((el) => { el.style.background = paintPreview(el.getAttribute('data-paint-swatch')); });
  root.querySelectorAll('[data-swatch]').forEach((el) => { el.style.background = el.getAttribute('data-swatch'); });
  root.querySelectorAll('[data-font]').forEach((el) => { el.style.fontFamily = el.getAttribute('data-font'); });
  root.querySelectorAll('.st-image__frame').forEach((f) => { f.style.aspectRatio = f.getAttribute('data-shape'); });
  root.querySelectorAll('img[data-fallback]').forEach((img) => img.addEventListener('error', () => {
    const s = document.createElement('span');
    s.className = 'st-image__empty';
    s.textContent = 'Not Uploaded Yet';
    img.replaceWith(s);
  }, { once: true }));
}
