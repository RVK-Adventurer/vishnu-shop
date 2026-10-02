/**
 * preview/controls.js — the "Easy settings" form of the Design preview: every look setting as a
 * plain control (choices, switches, sliders, colour pickers, gradient maker, picture slots, lists).
 * Each control reads and writes one setting in the draft. The Phase 2 admin's look screens reuse
 * these controls, so the owner learns them once.
 *
 * Limits come from limits.js and cover.js; every slider and list stops at its limit.
 */

import { html, raw } from '../html.js';
import { icon } from '../templates.js';
import { THEME_PRESETS } from '../color.js';
import { parsePaint } from '../theme.js';
import { LIMITS } from '../limits.js';
import { COVER_SPEC } from '../cover.js';
import { HOME_SECTIONS, HOME_SECTIONS_DEFAULT, FOOTER_SECTIONS } from '../templates.js';

/* ------------------------------------------------------------------ draft helpers */

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

export function setPath(obj, path, value) {
  const parts = path.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node[parts[i]] || typeof node[parts[i]] !== 'object' || Array.isArray(node[parts[i]])) node[parts[i]] = {};
    node = node[parts[i]];
  }
  if (value === undefined) delete node[parts[parts.length - 1]];
  else node[parts[parts.length - 1]] = value;
}

/* ------------------------------------------------------------------ the form, setting by setting */

const opt = (pairs) => pairs.map((p) => (Array.isArray(p) ? p : [p, p]));
const SECTION_NAMES = {
  banner: 'Banner / cover picture', trust: 'Trust strip', categories: 'Shop by category', pinned: 'Your own product rows',
  bestsellers: 'Bestsellers', new_arrivals: 'New arrivals', deals: 'Deals', recently_viewed: 'Recently viewed', all_products: 'All products (with filters)'
};
const FOOTER_NAMES = { about: 'About', care: 'Customer care', policies: 'Policies', payments: 'We accept (payments)' };
const coverHint = (slot) => {
  const c = COVER_SPEC[slot];
  return `Exactly ${c.ratioText} — best ${c.best[0]} × ${c.best[1]} px (at least ${c.min[0]} × ${c.min[1]}), under ${c.kb} KB.`;
};

/** The groups of the Easy settings form (in the order an owner usually works). */
export function formGroups(fonts = [], iconNames = []) {
  const fontOpts = [['system', 'Phone’s own font (fastest)']].concat(fonts.map((f) => [f.id, f.name]));
  return [
    { id: 'colours', title: 'Brand colours', icon: 'sparkle', items: [
      { type: 'preset', key: 'theme_preset', label: 'Quick theme', hint: 'A starting point — every colour below can be changed freely.' },
      { type: 'color', key: 'primary_color', label: 'Main colour', def: '#4338CA' },
      { type: 'color', key: 'secondary_color', label: 'Second colour', def: '#0F766E' },
      { type: 'color', key: 'accent_color', label: 'Accent colour', def: '#F59E0B' }
    ] },
    { id: 'logo', title: 'Logo, tab icon and tab names', icon: 'store', items: [
      { type: 'image', key: 'logo_path', label: 'Logo', slot: 'logo', svg: true, hint: `SVG, or PNG about 480 × 120 with a clear background. Under ${LIMITS.logo_file_kb} KB.` },
      { type: 'select', key: 'logo_mode', label: 'Show', options: opt([['LOGO_AND_NAME', 'Logo and shop name'], ['LOGO_ONLY', 'Logo only'], ['NAME_ONLY', 'Shop name only']]), def: 'LOGO_AND_NAME' },
      { type: 'range', key: 'logo_height_px', label: 'Logo height on computers', min: LIMITS.logo_height_px.min, max: LIMITS.logo_height_px.max, step: 2, unit: 'px', def: LIMITS.logo_height_px.default, hint: `Allowed ${LIMITS.logo_height_px.min}–${LIMITS.logo_height_px.max} px. Phones always use at most 44 px.` },
      { type: 'image', key: 'favicon_path', label: 'Browser-tab icon (favicon)', slot: 'favicon', svg: true, hint: 'Square PNG 512 × 512 (or SVG), under 200 KB.' },
      { type: 'text', key: 'tab_title_format', label: 'Tab name of each page', max: LIMITS.tab_title_chars, placeholder: '{page} — {shop}', hint: '{page} = the page’s name (required), {shop} = your shop name.' },
      { type: 'text', key: 'tab_title_home', label: 'Tab name of the home page', max: 70, placeholder: 'Raj Sweets — fresh sweets in Coimbatore' }
    ] },
    { id: 'cover', title: 'Cover picture (big banner)', icon: 'eye', items: [
      { type: 'select', key: 'hero_cover_json.mode', label: 'Type of picture', options: opt([['', 'No cover picture (colour banner)'], ['PHOTO', 'Photo — my shop’s words written over it'], ['ARTWORK', 'Finished design — the words are already in the picture']]), def: '' },
      { type: 'image', key: 'hero_cover_json.desktop', label: 'Computer picture (required)', slot: 'desktop', hint: coverHint('desktop'), when: 'cover' },
      { type: 'image', key: 'hero_cover_json.tablet', label: 'Tablet picture (optional)', slot: 'tablet', hint: coverHint('tablet'), when: 'cover' },
      { type: 'image', key: 'hero_cover_json.mobile', label: 'Phone picture (recommended)', slot: 'mobile', hint: coverHint('mobile'), when: 'cover' },
      { type: 'text', key: 'hero_cover_json.alt', label: 'Describe the picture', max: 200, placeholder: 'Sweets on a brass plate', hint: 'For a finished design, type the words written in it.', when: 'cover' },
      { type: 'range', key: 'hero_cover_json.image_opacity', label: 'Picture strength', min: 20, max: 100, step: 5, unit: '%', def: 100, when: 'cover' },
      { type: 'paint', key: 'hero_cover_json.background', label: 'Colour behind the picture', when: 'cover' },
      { type: 'paint', key: 'hero_cover_json.overlay', label: 'Shade over the photo', when: 'photo', def: '#000000' },
      { type: 'range', key: 'hero_cover_json.overlay_opacity', label: 'Shade strength', min: 0, max: 80, step: 5, unit: '%', def: 35, when: 'photo', hint: '30–45 % keeps white words easy to read on any photo.' },
      { type: 'select', key: 'hero_cover_json.overlay_style', label: 'Shade covers', options: opt([['FULL', 'The whole picture'], ['SIDE', 'Fades from the words’ side'], ['BOTTOM', 'Fades from the bottom']]), def: 'FULL', when: 'photo' },
      { type: 'select', key: 'hero_cover_json.text_align', label: 'Words — left / right', options: opt([['LEFT', 'Left'], ['CENTER', 'Centre'], ['RIGHT', 'Right']]), def: 'LEFT', when: 'photo' },
      { type: 'select', key: 'hero_cover_json.text_valign', label: 'Words — up / down', options: opt([['TOP', 'Top'], ['MIDDLE', 'Middle'], ['BOTTOM', 'Bottom']]), def: 'MIDDLE', when: 'photo' },
      { type: 'select', key: 'hero_cover_json.text_color', label: 'Word colour', options: opt([['AUTO', 'Automatic'], ['LIGHT', 'White'], ['DARK', 'Dark']]), def: 'AUTO', when: 'photo' },
      { type: 'text', key: 'hero_cover_json.eyebrow', label: 'Small line above', max: 40, placeholder: 'Welcome to', when: 'photo' },
      { type: 'text', key: 'hero_cover_json.title', label: 'Big title', max: 80, placeholder: '(your shop name)', when: 'photo' },
      { type: 'text', key: 'hero_cover_json.subtitle', label: 'Line under the title', max: 160, placeholder: '(your tagline)', when: 'photo' },
      { type: 'text', key: 'hero_cover_json.button_text', label: 'Button words', max: 30, placeholder: 'Shop now', when: 'photo' },
      { type: 'text', key: 'hero_cover_json.button_link', label: 'Button opens', max: 300, placeholder: '/c/sweets-snacks/', when: 'photo' },
      { type: 'toggle', key: 'hero_cover_json.show_eyebrow', label: 'Show the small line', def: true, when: 'photo' },
      { type: 'toggle', key: 'hero_cover_json.show_subtitle', label: 'Show the line under the title', def: true, when: 'photo' },
      { type: 'toggle', key: 'hero_cover_json.show_button', label: 'Show the button', def: true, when: 'photo' },
      { type: 'range', key: 'hero_cover_json.focal_x', label: 'Keep visible — left ↔ right', min: 0, max: 100, step: 5, unit: '%', def: 50, when: 'photo', hint: 'When a screen trims the photo, this part stays in view.' },
      { type: 'range', key: 'hero_cover_json.focal_y', label: 'Keep visible — top ↕ bottom', min: 0, max: 100, step: 5, unit: '%', def: 50, when: 'photo' },
      { type: 'text', key: 'hero_cover_json.link', label: 'Tapping the picture opens', max: 300, placeholder: '/c/sweets-snacks/', when: 'artwork' }
    ] },
    { id: 'banner', title: 'Banner timing and position', icon: 'clock', items: [
      { type: 'select', key: 'banner_frequency', label: 'Show the banner', options: opt([['ALWAYS', 'On every visit'], ['SESSION', 'Once per visit'], ['DAY', 'Once a day per person']]), def: 'ALWAYS' },
      { type: 'select', key: 'banner_start', label: 'With several banners, start at', options: opt([['FIRST', 'Banner 1 always'], ['RANDOM', 'A random banner each visit'], ['NEXT', 'The next banner each visit']]), def: 'FIRST' },
      { type: 'note', text: 'Move “Banner / cover picture” in the Home page list below to change where it appears.' }
    ] },
    { id: 'areas', title: 'Colours of each area', icon: 'grid', items: [
      { type: 'paint', key: 'header_bg', label: 'Top bar (logo, search, cart)' },
      { type: 'paint', key: 'catbar_bg', label: 'Category bar' },
      { type: 'paint', key: 'announcement_bg', label: 'Announcement bar (very top)' },
      { type: 'paint', key: 'hero_bg', label: 'Welcome banner (no picture)' },
      { type: 'paint', key: 'button_bg', label: 'Main buttons' },
      { type: 'paint', key: 'footer_bg', label: 'Footer' },
      { type: 'paint', key: 'page_bg', label: 'Page background (light colours)' }
    ] },
    { id: 'home', title: 'Home page', icon: 'home', items: [
      { type: 'select', key: 'home_layout', label: 'Home page style', options: opt([['A', 'Sections (choose below)'], ['B', 'Every product on one page']]), def: 'A' },
      { type: 'sections', key: 'home_sections_json', label: 'Sections — tick to show, arrows to reorder', all: HOME_SECTIONS, names: SECTION_NAMES, def: HOME_SECTIONS_DEFAULT },
      { type: 'toggle', key: 'show_category_menu', label: 'Show categories in menus and tiles', def: true },
      { type: 'toggle', key: 'show_all_products_link', label: '“All products” link in the menu bar', def: true },
      { type: 'text', key: 'announcement_text', label: 'Announcement bar text', max: 140, placeholder: '(automatic from your delivery settings)' }
    ] },
    { id: 'trust', title: 'Trust strip', icon: 'shield', items: [
      { type: 'toggle', key: 'show_trust_strip', label: 'Show the trust strip', def: true },
      { type: 'trust', key: 'trust_strip_json', label: `Items (up to ${LIMITS.trust_items})`, icons: iconNames }
    ] },
    { id: 'look', title: 'Look and feel', icon: 'edit', items: [
      { type: 'select', key: 'page_width', label: 'Page width', options: opt([['FULL', 'Full width'], ['WIDE', 'Wide (1600 px)'], ['STANDARD', 'Standard (1280 px)']]), def: 'FULL' },
      { type: 'select', key: 'ui_corners', label: 'Corners', options: opt([['SHARP', 'Sharp'], ['STANDARD', 'Standard'], ['ROUND', 'Round']]), def: 'STANDARD' },
      { type: 'select', key: 'ui_shadows', label: 'Shadows', options: opt([['NONE', 'None'], ['SOFT', 'Soft'], ['STRONG', 'Strong']]), def: 'SOFT' },
      { type: 'select', key: 'ui_spacing', label: 'Spacing', options: opt([['COMPACT', 'Compact'], ['COMFORTABLE', 'Comfortable'], ['AIRY', 'Airy']]), def: 'COMFORTABLE' },
      { type: 'select', key: 'ui_text_size', label: 'Text size', options: opt([['NORMAL', 'Normal'], ['LARGE', 'Large'], ['XLARGE', 'Extra large']]), def: 'NORMAL' },
      { type: 'select', key: 'font_body', label: 'Font', options: fontOpts, def: 'system' },
      { type: 'select', key: 'font_heading', label: 'Heading font', options: fontOpts, def: 'system' }
    ] },
    { id: 'products', title: 'Product cards and pages', icon: 'tag', items: [
      { type: 'select', key: 'product_image_ratio', label: 'Photo shape', options: opt([['SQUARE', 'Square 1 : 1 (most shops)'], ['PORTRAIT', 'Tall 4 : 5 (clothing)'], ['LANDSCAPE', 'Wide 4 : 3']]), def: 'SQUARE' },
      { type: 'select', key: 'product_image_fit', label: 'Photo fit', options: opt([['contain', 'Show whole photo (may leave bands)'], ['cover', 'Fill the box (no blank space)']]), def: 'contain' },
      { type: 'toggle', key: 'reviews_enabled', label: 'Show star ratings', def: true },
      { type: 'select', key: 'sold_counts_mode', label: '“Bought” counts', options: opt([['OFF', 'Off'], ['MONTH', 'Past month'], ['TOTAL', 'All time'], ['BOTH', 'Both']]), def: 'MONTH' },
      { type: 'select', key: 'delivery_display', label: 'Delivery on product pages', options: opt([['DATE', 'Pincode box → date'], ['DAYS', 'Pincode box → number of days'], ['TEXT', 'My own sentence'], ['HIDDEN', 'Hide']]), def: 'DATE' },
      { type: 'text', key: 'delivery_custom_text', label: 'My own delivery sentence', max: LIMITS.delivery_text_chars, placeholder: 'Ships within 24 hours from Coimbatore' }
    ] },
    { id: 'footer', title: 'Footer', icon: 'menu', items: [
      { type: 'sections', key: 'footer_sections_json', label: 'Columns — tick to show, arrows to reorder', all: FOOTER_SECTIONS, names: FOOTER_NAMES, def: FOOTER_SECTIONS },
      { type: 'columns', key: 'footer_columns_json', label: `Your own link columns (up to ${LIMITS.footer_columns}, ${LIMITS.footer_links} links each)` },
      { type: 'toggle', key: 'footer_show_contact', label: 'Show address, phone and WhatsApp', def: true },
      { type: 'toggle', key: 'footer_show_social', label: 'Show social media icons', def: true },
      { type: 'toggle', key: 'footer_show_hours', label: 'Show opening hours', def: true },
      { type: 'textarea', key: 'footer_about_text', label: 'About text', max: LIMITS.footer_text_chars, placeholder: '(your tagline)' },
      { type: 'text', key: 'footer_copyright_text', label: 'Copyright line', max: 120, placeholder: '© {year} {shop}', hint: 'Leave empty to hide it.' }
    ] }
  ];
}

/* ------------------------------------------------------------------ drawing the controls */

let uid = 0;
const id = () => 'lc' + (++uid);

function paintParts(value) {
  const p = parsePaint(value);
  if (!p) return { kind: '', c1: '#4338CA', c2: '#DB2777', c3: '', angle: 135 };
  return { kind: p.style === 'solid' ? 'solid' : p.style, c1: p.stops[0], c2: p.stops[1] || '#DB2777', c3: p.stops[2] || '', angle: p.angle || 135 };
}

export function paintValue(kind, c1, c2, c3, angle) {
  if (!kind) return '';
  if (kind === 'solid') return c1.toUpperCase();
  const stops = [c1, c2, c3].filter(Boolean).map((c) => c.toUpperCase()).join(', ');
  return kind === 'radial' ? `radial-gradient(${stops})` : `linear-gradient(${angle}deg, ${stops})`;
}

function field(item, inner, extra = '') {
  return html`<div class="lab-ctl ${extra}" data-ctl="${item.key}" data-when="${item.when || ''}">${inner}${item.hint ? html`<p class="lab-hint">${item.hint}</p>` : ''}</div>`;
}

function control(item, draft, pictures) {
  const v = item.key ? getPath(draft, item.key) : undefined;
  const fid = id();
  switch (item.type) {
    case 'note':
      return html`<p class="lab-note">${item.text}</p>`;
    case 'preset':
      return field(item, html`<label class="lab-label" for="${fid}">${item.label}</label>
        <select class="select" id="${fid}" data-k="${item.key}" data-t="preset">
          <option value="">— keep my colours —</option>
          ${Object.entries(THEME_PRESETS).map(([k, p]) => html`<option value="${k}" ${v === k ? raw('selected') : ''}>${p.name} — ${p.goodFor}</option>`)}
        </select>`);
    case 'select':
      return field(item, html`<label class="lab-label" for="${fid}">${item.label}</label>
        <select class="select" id="${fid}" data-k="${item.key}" data-t="select">
          ${item.options.map(([val, label]) => html`<option value="${val}" ${(v ?? item.def) === val ? raw('selected') : ''}>${label}</option>`)}
        </select>`);
    case 'toggle':
      return field(item, html`<label class="switch"><input type="checkbox" data-k="${item.key}" data-t="toggle" ${(v ?? item.def) !== false ? raw('checked') : ''}><span class="switch__track" aria-hidden="true"></span><span>${item.label}</span></label>`);
    case 'range': {
      const val = v ?? item.def;
      return field(item, html`<label class="lab-label" for="${fid}">${item.label} <output class="lab-out" data-out="${item.key}">${val}${item.unit}</output></label>
        <input class="lab-range" type="range" id="${fid}" min="${item.min}" max="${item.max}" step="${item.step}" value="${val}" data-k="${item.key}" data-t="range" data-unit="${item.unit}">`);
    }
    case 'text':
      return field(item, html`<label class="lab-label" for="${fid}">${item.label}</label>
        <input class="input" type="text" id="${fid}" maxlength="${item.max || 300}" value="${v ?? ''}" placeholder="${item.placeholder || ''}" data-k="${item.key}" data-t="text">`);
    case 'textarea':
      return field(item, html`<label class="lab-label" for="${fid}">${item.label}</label>
        <textarea class="input lab-textarea" id="${fid}" maxlength="${item.max || 300}" rows="3" placeholder="${item.placeholder || ''}" data-k="${item.key}" data-t="text">${v ?? ''}</textarea>`);
    case 'color':
      return field(item, html`<label class="lab-label" for="${fid}">${item.label}</label>
        <span class="lab-color"><input type="color" id="${fid}" value="${/^#[0-9a-f]{6}$/i.test(v || '') ? v : item.def}" data-k="${item.key}" data-t="color"><code>${v || item.def}</code></span>`);
    case 'paint': {
      const p = paintParts(v ?? item.def);
      return field(item, html`<span class="lab-label">${item.label}</span>
        <div class="lab-paint" data-k="${item.key}" data-t="paint">
          <select class="select select--sm" data-p="kind" aria-label="${item.label}: type">
            <option value="" ${p.kind === '' ? raw('selected') : ''}>Theme colour</option>
            <option value="solid" ${p.kind === 'solid' ? raw('selected') : ''}>One colour</option>
            <option value="linear" ${p.kind === 'linear' ? raw('selected') : ''}>Gradient</option>
            <option value="radial" ${p.kind === 'radial' ? raw('selected') : ''}>Round glow</option>
          </select>
          <span class="lab-paint__colors" ${p.kind === '' ? raw('hidden') : ''}>
            <input type="color" value="${p.c1}" data-p="c1" aria-label="${item.label}: colour 1">
            <input type="color" value="${p.c2}" data-p="c2" aria-label="${item.label}: colour 2" ${p.kind === 'solid' ? raw('hidden') : ''}>
            <label class="lab-mini" ${p.kind === 'solid' ? raw('hidden') : ''}><input type="checkbox" data-p="use3" ${p.c3 ? raw('checked') : ''}> 3rd</label>
            <input type="color" value="${p.c3 || '#F59E0B'}" data-p="c3" aria-label="${item.label}: colour 3" ${!p.c3 || p.kind === 'solid' ? raw('hidden') : ''}>
          </span>
          <span class="lab-paint__angle" ${p.kind !== 'linear' ? raw('hidden') : ''}><input class="lab-range" type="range" min="0" max="360" step="15" value="${p.angle}" data-p="angle" aria-label="${item.label}: angle"><output>${p.angle}°</output></span>
          <span class="lab-swatch" data-swatch-for="${item.key}"></span>
        </div>`);
    }
    case 'image': {
      const pic = v ? pictures[String(v).replace(/^\//, '')] : null;
      return field(item, html`<span class="lab-label">${item.label}</span>
        <div class="lab-image" data-k="${item.key}" data-t="image" data-slot="${item.slot}">
          ${pic ? html`<img class="lab-image__thumb" src="${pic.url}" alt="">` : ''}
          <input class="input" type="text" value="${v || ''}" placeholder="client/assets/…" data-p="path" aria-label="${item.label}: file name">
          <label class="btn btn--secondary btn--sm lab-image__pick">${icon('download', 16)}Try a picture<input type="file" accept="image/*" data-p="file" hidden></label>
          ${v ? html`<button class="btn btn--ghost btn--sm" type="button" data-p="clear">Remove</button>` : ''}
          <p class="lab-image__status" data-status-for="${item.key}"></p>
        </div>`);
    }
    case 'sections': {
      const list = Array.isArray(v) ? v.filter((x) => item.all.includes(x)) : item.def.slice();
      const order = list.concat(item.all.filter((x) => !list.includes(x)));
      return field(item, html`<span class="lab-label">${item.label}</span>
        <ol class="lab-order" data-k="${item.key}" data-t="sections">${order.map((name) => html`<li class="lab-order__row" data-name="${name}">
          <label class="check"><input type="checkbox" ${list.includes(name) ? raw('checked') : ''}><span>${item.names[name] || name}</span></label>
          <span class="lab-order__btns"><button class="icon-btn icon-btn--sm" type="button" data-move="-1" aria-label="Move ${item.names[name] || name} up">${icon('chevron-up', 16)}</button><button class="icon-btn icon-btn--sm" type="button" data-move="1" aria-label="Move ${item.names[name] || name} down">${icon('chevron-down', 16)}</button></span>
        </li>`)}</ol>`);
    }
    case 'trust': {
      const list = Array.isArray(v) ? v : [];
      return field(item, html`<span class="lab-label">${item.label}</span>
        <div class="lab-rows" data-k="${item.key}" data-t="trust">
          ${list.length ? '' : html`<p class="lab-hint">Empty: the shop makes the strip from your settings (secure payments, COD, returns, delivery). Add an item to write your own.</p>`}
          ${list.map((it, i) => html`<div class="lab-row" data-i="${i}">
            <select class="select select--sm" data-f="icon" aria-label="Icon">${(item.icons.length ? item.icons : ['check']).map((n) => html`<option value="${n}" ${it.icon === n ? raw('selected') : ''}>${n}</option>`)}</select>
            <input class="input" type="text" maxlength="${LIMITS.trust_text_chars}" value="${it.text || ''}" placeholder="Free delivery over ₹499" data-f="text" aria-label="Text">
            <input class="input" type="text" maxlength="300" value="${it.link || ''}" placeholder="Link (optional)" data-f="link" aria-label="Link">
            <button class="icon-btn icon-btn--sm" type="button" data-remove="${i}" aria-label="Remove">${icon('trash', 16)}</button>
          </div>`)}
          ${list.length < LIMITS.trust_items ? html`<button class="btn btn--ghost btn--sm" type="button" data-add>${icon('plus', 16)}Add an item</button>` : html`<p class="lab-hint">Limit reached (${LIMITS.trust_items}).</p>`}
        </div>`);
    }
    case 'columns': {
      const cols = Array.isArray(v) ? v : [];
      return field(item, html`<span class="lab-label">${item.label}</span>
        <div class="lab-cols" data-k="${item.key}" data-t="columns">
          ${cols.map((col, ci) => html`<fieldset class="lab-col" data-ci="${ci}"><legend class="sr-only">Column ${ci + 1}</legend>
            <div class="lab-row"><input class="input" type="text" maxlength="40" value="${col.title || ''}" placeholder="Column title, e.g. Shop" data-f="title" aria-label="Column title">
              <button class="icon-btn icon-btn--sm" type="button" data-remove-col="${ci}" aria-label="Remove column">${icon('trash', 16)}</button></div>
            ${(col.links || []).map((l, li) => html`<div class="lab-row lab-row--link" data-li="${li}">
              <input class="input" type="text" maxlength="60" value="${l.text || ''}" placeholder="Link words" data-f="text" aria-label="Link words">
              <input class="input" type="text" maxlength="300" value="${l.href || ''}" placeholder="/c/sarees/ or https://…" data-f="href" aria-label="Link address">
              <button class="icon-btn icon-btn--sm" type="button" data-remove-link="${li}" aria-label="Remove link">${icon('close', 16)}</button></div>`)}
            ${(col.links || []).length < LIMITS.footer_links ? html`<button class="btn btn--ghost btn--sm" type="button" data-add-link>${icon('plus', 16)}Add a link</button>` : ''}
          </fieldset>`)}
          ${cols.length < LIMITS.footer_columns ? html`<button class="btn btn--ghost btn--sm" type="button" data-add-col>${icon('plus', 16)}Add a column</button>` : html`<p class="lab-hint">Limit reached (${LIMITS.footer_columns}).</p>`}
        </div>`);
    }
    default:
      return '';
  }
}

/** The whole Easy settings form as HTML. */
export function renderForm(groups, draft, pictures, openGroups) {
  return html`${groups.map((g) => html`<details class="lab-group" data-group="${g.id}" ${openGroups.has(g.id) ? raw('open') : ''}>
    <summary class="lab-group__head">${icon(g.icon, 18)}<span>${g.title}</span>${icon('chevron-down', 16, 'lab-group__chev')}</summary>
    <div class="lab-group__body">${g.items.map((it) => control(it, draft, pictures))}</div>
  </details>`)}`;
}

/** Shows only the cover controls that matter for the chosen kind of cover picture. */
export function applyWhen(root, draft) {
  const mode = getPath(draft, 'hero_cover_json.mode') || '';
  root.querySelectorAll('[data-when]').forEach((el) => {
    const w = el.getAttribute('data-when');
    if (!w) return;
    el.hidden = w === 'cover' ? !mode : w === 'photo' ? mode !== 'PHOTO' : w === 'artwork' ? mode !== 'ARTWORK' : false;
  });
  root.querySelectorAll('[data-swatch-for]').forEach((el) => {
    const p = parsePaint(getPath(draft, el.getAttribute('data-swatch-for')));
    el.style.background = p ? (p.stops.length > 1 ? `linear-gradient(${p.angle || 135}deg, ${p.stops.join(', ')})` : p.stops[0]) : 'transparent';
    el.hidden = !p;
  });
}

/** Reads one control after the owner changed it and writes the result into the draft. */
export function readControl(target, draft) {
  const host = target.closest('[data-t]');
  if (!host) return false;
  const key = host.getAttribute('data-k');
  const type = host.getAttribute('data-t');
  if (type === 'select' || type === 'text') setPath(draft, key, host.value === '' && key.startsWith('hero_cover_json.') && key !== 'hero_cover_json.mode' ? undefined : host.value);
  else if (type === 'toggle') setPath(draft, key, host.checked);
  else if (type === 'range') {
    setPath(draft, key, Number(host.value));
    const out = host.closest('.lab-ctl').querySelector('[data-out]');
    if (out) out.textContent = host.value + (host.getAttribute('data-unit') || '');
  } else if (type === 'color') {
    setPath(draft, key, host.value.toUpperCase());
    const code = host.parentElement.querySelector('code');
    if (code) code.textContent = host.value.toUpperCase();
  } else if (type === 'preset') {
    const p = THEME_PRESETS[host.value];
    if (p) Object.assign(draft, { theme_preset: host.value, primary_color: p.primary, secondary_color: p.secondary, accent_color: p.accent });
    return 'redraw';
  } else if (type === 'paint') {
    const q = (n) => host.querySelector(`[data-p="${n}"]`);
    const kind = q('kind').value;
    const use3 = q('use3').checked;
    setPath(draft, key, paintValue(kind, q('c1').value, q('c2').value, use3 ? q('c3').value : '', Number(q('angle').value)));
    q('c2').hidden = kind === 'solid';
    q('use3').parentElement.hidden = kind === 'solid';
    q('c3').hidden = !use3 || kind === 'solid';
    host.querySelector('.lab-paint__colors').hidden = !kind;
    host.querySelector('.lab-paint__angle').hidden = kind !== 'linear';
    host.querySelector('.lab-paint__angle output').textContent = q('angle').value + '°';
  } else if (type === 'image') {
    if (target.getAttribute('data-p') === 'path') setPath(draft, key, target.value.trim() || undefined);
  } else if (type === 'sections') {
    setPath(draft, key, Array.from(host.querySelectorAll('.lab-order__row')).filter((r) => r.querySelector('input').checked).map((r) => r.getAttribute('data-name')));
  } else if (type === 'trust') {
    const rows = Array.from(host.querySelectorAll('.lab-row')).map((r) => {
      const item = { icon: r.querySelector('[data-f="icon"]').value, text: r.querySelector('[data-f="text"]').value };
      const l = r.querySelector('[data-f="link"]').value.trim();
      if (l) item.link = l;
      return item;
    });
    setPath(draft, key, rows);
  } else if (type === 'columns') {
    setPath(draft, key, Array.from(host.querySelectorAll('.lab-col')).map((c) => ({
      title: c.querySelector('[data-f="title"]').value,
      links: Array.from(c.querySelectorAll('.lab-row--link')).map((r) => ({ text: r.querySelector('[data-f="text"]').value, href: r.querySelector('[data-f="href"]').value }))
    })));
  }
  if (key.startsWith('hero_cover_json.') && type === 'select' && key === 'hero_cover_json.mode') {
    if (!host.value) setPath(draft, 'hero_cover_json', undefined);
    return 'redraw';
  }
  return true;
}
