/**
 * preview/richtext.js — a Word-style editor for product descriptions (used in Shop Studio's
 * "Product Page Try-Out" today and in the admin's product form from Phase 2).
 *
 * What the owner can do: bold, italic, underline, strike, text colour, highlight, text size,
 * headings, alignment, bullet / numbered / tick lists, indent, line spacing, paragraph spacing,
 * links, tables (add or remove rows and columns, header row, table style), note and warning boxes,
 * quotes, dividers, sub/superscript, clear formatting, undo / redo, and paste from Word or Google Docs.
 *
 * Safety: the shop's security policy blocks inline styles, so every format is stored as one of the
 * allow-listed "rt-…" classes, and the result always goes through sanitizeRichText (html.js), the
 * same cleaner the build uses. Nothing harmful can be pasted or typed in.
 */

import { sanitizeRichText } from '../html.js';
import { LIMITS } from '../limits.js';

/* Colours are applied with the browser's own commands using marker colours, then turned into classes. */
const TEXT_COLOURS = [
  ['rt-c-primary', '#010101', 'Brand Colour'], ['rt-c-accent', '#020202', 'Accent'], ['rt-c-red', '#B91C1C', 'Red'],
  ['rt-c-green', '#15803D', 'Green'], ['rt-c-blue', '#1D4ED8', 'Blue'], ['rt-c-orange', '#C2410C', 'Orange'],
  ['rt-c-purple', '#7E22CE', 'Purple'], ['rt-c-grey', '#64748B', 'Grey']
];
const HIGHLIGHTS = [['rt-hl-yellow', '#FEF08A', 'Yellow'], ['rt-hl-green', '#BBF7D0', 'Green'], ['rt-hl-blue', '#BFDBFE', 'Blue'], ['rt-hl-pink', '#FBCFE8', 'Pink']];
const SIZES = [['1', 'rt-xs', 'Small'], ['2', 'rt-sm', 'A Little Small'], ['3', '', 'Normal'], ['5', 'rt-lg', 'Large'], ['6', 'rt-xl', 'Extra Large']];
const BLOCK_GROUPS = {
  align: ['rt-left', 'rt-center', 'rt-right', 'rt-justify'],
  lh: ['rt-lh-1', 'rt-lh-15', 'rt-lh-2'],
  sp: ['rt-sp-0', 'rt-sp-1', 'rt-sp-2'],
  indent: ['rt-indent-1', 'rt-indent-2', 'rt-indent-3'],
  box: ['rt-note', 'rt-warn']
};
const BLOCKS = 'p, h2, h3, h4, li, blockquote, pre, td, th, caption';

const toHex = (c) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
  if (!m) return String(c || '').toUpperCase();
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const ICON = (name) => `<svg class="icon" width="18" height="18" aria-hidden="true"><use href="/icons/sprite.svg#i-${name}"></use></svg>`;

/** Plain HTML string for the toolbar (owner-facing labels in Capital Case). */
function toolbarHtml() {
  const b = (cmd, label, inner, extra = '') => `<button type="button" class="rte-btn" data-cmd="${cmd}" title="${label}" aria-label="${label}" ${extra}>${inner}</button>`;
  const menu = (id, label, inner, items) => `<div class="rte-menu"><button type="button" class="rte-btn rte-btn--menu" data-menu="${id}" aria-haspopup="true" aria-expanded="false" title="${label}" aria-label="${label}">${inner}<span class="rte-caret" aria-hidden="true"></span></button><div class="rte-pop" data-pop="${id}" hidden>${items}</div></div>`;
  const sep = '<span class="rte-sep" aria-hidden="true"></span>';
  return `<div class="rte-bar" role="toolbar" aria-label="Formatting">
    ${b('undo', 'Undo', '<span class="rte-glyph">↶</span>')}${b('redo', 'Redo', '<span class="rte-glyph">↷</span>')}${sep}
    ${menu('block', 'Paragraph Style', '<span class="rte-text">Style</span>', [['p', 'Normal Text'], ['h2', 'Big Heading'], ['h3', 'Heading'], ['h4', 'Small Heading'], ['blockquote', 'Quote'], ['pre', 'Code']].map(([t, l]) => `<button type="button" data-block="${t}" class="rte-item rte-item--${t}">${l}</button>`).join(''))}
    ${sep}${b('bold', 'Bold', '<b>B</b>')}${b('italic', 'Italic', '<i>I</i>')}${b('underline', 'Underline', '<u>U</u>')}${b('strikeThrough', 'Strike', '<s>S</s>')}
    ${b('superscript', 'Superscript', 'x<sup>2</sup>')}${b('subscript', 'Subscript', 'x<sub>2</sub>')}${sep}
    ${menu('color', 'Text Colour', '<span class="rte-text rte-a">A</span>', TEXT_COLOURS.map(([c, hex, l]) => `<button type="button" class="rte-item rte-swatch-item" data-color="${hex}"><span class="rte-dot ${c}"></span>${l}</button>`).join('') + '<button type="button" class="rte-item" data-color="">Remove Colour</button>')}
    ${menu('hl', 'Highlight', '<span class="rte-text rte-hl">ab</span>', HIGHLIGHTS.map(([c, hex, l]) => `<button type="button" class="rte-item rte-swatch-item" data-hl="${hex}"><span class="rte-dot ${c}"></span>${l}</button>`).join('') + '<button type="button" class="rte-item" data-hl="">Remove Highlight</button>')}
    ${menu('size', 'Text Size', '<span class="rte-text">Size</span>', SIZES.map(([n, c, l]) => `<button type="button" class="rte-item" data-size="${n}">${l}</button>`).join(''))}
    ${sep}${menu('align', 'Alignment', ICON('menu'), [['rt-left', 'Align Left'], ['rt-center', 'Centre'], ['rt-right', 'Align Right'], ['rt-justify', 'Justify']].map(([c, l]) => `<button type="button" class="rte-item" data-blockclass="align:${c}">${l}</button>`).join(''))}
    ${b('insertUnorderedList', 'Bullet List', '<span class="rte-text">• List</span>')}${b('insertOrderedList', 'Numbered List', '<span class="rte-text">1. List</span>')}${b('ticklist', 'Tick List', ICON('check'))}
    ${b('indent', 'Indent More', '<span class="rte-glyph">⇥</span>')}${b('outdent', 'Indent Less', '<span class="rte-glyph">⇤</span>')}
    ${menu('spacing', 'Spacing', '<span class="rte-text">Spacing</span>', '<p class="rte-pop__label">Line Spacing</p>' + [['rt-lh-1', 'Single'], ['', 'Normal'], ['rt-lh-15', '1.5 Lines'], ['rt-lh-2', 'Double']].map(([c, l]) => `<button type="button" class="rte-item" data-blockclass="lh:${c}">${l}</button>`).join('') + '<p class="rte-pop__label">Space After Paragraph</p>' + [['rt-sp-0', 'None'], ['', 'Normal'], ['rt-sp-1', 'More'], ['rt-sp-2', 'Most']].map(([c, l]) => `<button type="button" class="rte-item" data-blockclass="sp:${c}">${l}</button>`).join(''))}
    ${sep}${b('link', 'Add Link', ICON('external'))}
    ${menu('insert', 'Insert', '<span class="rte-text">Insert</span>', '<button type="button" class="rte-item" data-insert="table">Table</button><button type="button" class="rte-item" data-insert="note">Note Box</button><button type="button" class="rte-item" data-insert="warn">Warning Box</button><button type="button" class="rte-item" data-insert="hr">Divider Line</button><button type="button" class="rte-item" data-insert="cols">Two Columns</button>')}
    <span class="rte-table-tools" data-table-tools hidden>${sep}${menu('table', 'Table', '<span class="rte-text">Table</span>', '<button type="button" class="rte-item" data-table="row">Add Row Below</button><button type="button" class="rte-item" data-table="col">Add Column Right</button><button type="button" class="rte-item" data-table="delrow">Remove Row</button><button type="button" class="rte-item" data-table="delcol">Remove Column</button><button type="button" class="rte-item" data-table="head">Header row on / Off</button><p class="rte-pop__label">Table Style</p><button type="button" class="rte-item" data-table="style:">Lines</button><button type="button" class="rte-item" data-table="style:rt-table-striped">Striped</button><button type="button" class="rte-item" data-table="style:rt-table-plain">Plain</button><button type="button" class="rte-item" data-table="style:rt-table-bordered">Bold Border</button><button type="button" class="rte-item" data-table="delete">Delete Table</button>')}</span>
    ${sep}${b('removeFormat', 'Clear Formatting', '<span class="rte-text">Clear</span>')}
  </div>
  <div class="rte-linkbox" data-linkbox hidden><label>Link Address <input class="input" type="text" placeholder="https://… or /c/sweets/" data-link-input></label><button type="button" class="btn btn--primary btn--sm" data-link-ok>Add Link</button><button type="button" class="btn btn--ghost btn--sm" data-link-cancel>Cancel</button></div>
  <div class="rte-tablebox" data-tablebox hidden><label>Rows <input class="input" type="number" min="1" max="20" value="3" data-rows></label><label>Columns <input class="input" type="number" min="1" max="8" value="3" data-cols></label><button type="button" class="btn btn--primary btn--sm" data-table-ok>Insert Table</button><button type="button" class="btn btn--ghost btn--sm" data-table-cancel>Cancel</button></div>`;
}

/**
 * Turns an element into the editor. onChange(cleanHtml) is called after every change (debounced).
 * Returns { setHtml, getHtml, destroy }.
 */
export function createRichEditor(host, { html = '', onChange = () => {}, placeholder = 'Write About The Product…' } = {}) {
  host.classList.add('rte');
  host.innerHTML = toolbarHtml() + `<div class="rte-area prose" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Description" data-placeholder="${placeholder}"></div><p class="rte-count" data-count></p>`;
  const area = host.querySelector('.rte-area');
  const count = host.querySelector('[data-count]');
  const tableTools = host.querySelector('[data-table-tools]');
  area.innerHTML = sanitizeRichText(html).toString();
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* older browsers */ }
  let savedRange = null;
  let timer = null;

  const clean = () => sanitizeRichText(area.innerHTML).toString();
  const emit = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      normalize();
      const out = clean();
      const len = out.length;
      count.textContent = `${len.toLocaleString('en-IN')} of ${LIMITS.description_chars.toLocaleString('en-IN')} characters`;
      count.classList.toggle('is-over', len > LIMITS.description_chars);
      onChange(out);
    }, 250);
  };

  /** Browser commands leave <font> tags and inline styles; turn them into the allowed classes. */
  function normalize() {
    area.querySelectorAll('font').forEach((f) => {
      const span = document.createElement('span');
      const col = toHex(f.getAttribute('color'));
      const c = TEXT_COLOURS.find((x) => x[1] === col);
      if (c) span.classList.add(c[0]);
      const sz = SIZES.find((x) => x[0] === f.getAttribute('size'));
      if (sz && sz[1]) span.classList.add(sz[1]);
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    area.querySelectorAll('[style]').forEach((el) => {
      const st = el.style;
      if (st.backgroundColor) {
        const h = HIGHLIGHTS.find((x) => x[1] === toHex(st.backgroundColor));
        if (h) el.classList.add(h[0]);
      }
      if (st.color) {
        const c = TEXT_COLOURS.find((x) => x[1] === toHex(st.color));
        if (c) el.classList.add(c[0]);
      }
      if (st.textAlign) {
        const a = { left: 'rt-left', center: 'rt-center', right: 'rt-right', justify: 'rt-justify' }[st.textAlign];
        BLOCK_GROUPS.align.forEach((x) => el.classList.remove(x));
        if (a && a !== 'rt-left') el.classList.add(a);
      }
      el.removeAttribute('style');
    });
    area.querySelectorAll('[align]').forEach((el) => el.removeAttribute('align'));
    area.querySelectorAll('div:not(.rt-cols-2)').forEach((d) => {
      if (d.closest('.rt-table-wrap') || d.classList.contains('rt-table-wrap')) return;
      const p = document.createElement('p');
      p.className = d.className;
      while (d.firstChild) p.appendChild(d.firstChild);
      d.replaceWith(p);
    });
    area.querySelectorAll('span:not([class])').forEach((sp) => { while (sp.firstChild) sp.before(sp.firstChild); sp.remove(); });
  }

  const selectionInArea = () => {
    const sel = window.getSelection();
    return sel && sel.rangeCount && area.contains(sel.getRangeAt(0).commonAncestorContainer) ? sel.getRangeAt(0) : null;
  };
  const restore = () => {
    area.focus();
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  };
  const exec = (cmd, val = null) => { restore(); document.execCommand(cmd, false, val); emit(); };

  /** The paragraphs, headings and list items the selection touches. */
  function selectedBlocks() {
    const r = selectionInArea() || savedRange;
    if (!r) return [];
    const all = Array.from(area.querySelectorAll(BLOCKS));
    const hit = all.filter((el) => r.intersectsNode(el) && !el.querySelector(BLOCKS));
    if (hit.length) return hit;
    const node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    const b = node && node.closest(BLOCKS);
    if (b && area.contains(b)) return [b];
    // Loose text directly in the editor: wrap it in a paragraph first.
    document.execCommand('formatBlock', false, 'p');
    const n2 = window.getSelection().anchorNode;
    const b2 = n2 && (n2.nodeType === 1 ? n2 : n2.parentElement).closest(BLOCKS);
    return b2 ? [b2] : [];
  }

  function setBlockClass(group, cls) {
    restore();
    selectedBlocks().forEach((el) => {
      BLOCK_GROUPS[group].forEach((x) => el.classList.remove(x));
      if (cls) el.classList.add(cls);
      if (!el.className) el.removeAttribute('class');
    });
    emit();
  }

  function insertHtml(markup) { restore(); document.execCommand('insertHTML', false, markup); emit(); }

  function tableAt() {
    const r = selectionInArea() || savedRange;
    if (!r) return null;
    const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
    return n ? n.closest('td, th') : null;
  }

  function tableAction(what) {
    const cell = tableAt();
    if (!cell) return;
    const row = cell.parentElement;
    const table = cell.closest('table');
    const idx = Array.from(row.children).indexOf(cell);
    if (what === 'row') {
      const nr = row.cloneNode(true);
      nr.querySelectorAll('td, th').forEach((c) => { const td = document.createElement('td'); td.innerHTML = '<br>'; c.replaceWith(td); });
      if (row.parentElement.tagName === 'THEAD') { let body = table.tBodies[0]; if (!body) { body = table.createTBody(); } body.prepend(nr); } else row.after(nr);
    } else if (what === 'col') {
      table.querySelectorAll('tr').forEach((tr) => { const ref = tr.children[idx]; const c = document.createElement(ref && ref.tagName === 'TH' ? 'th' : 'td'); c.innerHTML = '<br>'; if (ref) ref.after(c); else tr.appendChild(c); });
    } else if (what === 'delrow') {
      if (table.rows.length > 1) row.remove();
    } else if (what === 'delcol') {
      if (row.children.length > 1) table.querySelectorAll('tr').forEach((tr) => { if (tr.children[idx]) tr.children[idx].remove(); });
    } else if (what === 'head') {
      if (table.tHead) {
        const body = table.tBodies[0] || table.createTBody();
        Array.from(table.tHead.rows).reverse().forEach((tr) => { tr.querySelectorAll('th').forEach((th) => { const td = document.createElement('td'); td.innerHTML = th.innerHTML; th.replaceWith(td); }); body.prepend(tr); });
        table.tHead.remove();
      } else {
        const first = table.rows[0];
        const head = table.createTHead();
        first.querySelectorAll('td').forEach((td) => { const th = document.createElement('th'); th.innerHTML = td.innerHTML; th.setAttribute('scope', 'col'); td.replaceWith(th); });
        head.appendChild(first);
      }
    } else if (what.startsWith('style:')) {
      ['rt-table-striped', 'rt-table-plain', 'rt-table-bordered'].forEach((c) => table.classList.remove(c));
      const c = what.slice(6);
      if (c) table.classList.add(c);
    } else if (what === 'delete') {
      (table.closest('.rt-table-wrap') || table).remove();
    }
    emit();
  }

  const closeMenus = () => host.querySelectorAll('[data-pop]').forEach((p) => { p.hidden = true; const btn = host.querySelector(`[data-menu="${p.getAttribute('data-pop')}"]`); if (btn) btn.setAttribute('aria-expanded', 'false'); });

  host.addEventListener('mousedown', (e) => { if (e.target.closest('.rte-bar') && !e.target.closest('input')) e.preventDefault(); });
  document.addEventListener('selectionchange', () => {
    const r = selectionInArea();
    if (r) savedRange = r.cloneRange();
    if (r) tableTools.hidden = !tableAt();
  });
  host.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || !host.contains(t)) return;
    if (t.hasAttribute('data-menu')) {
      const pop = host.querySelector(`[data-pop="${t.getAttribute('data-menu')}"]`);
      const open = pop.hidden;
      closeMenus();
      pop.hidden = !open;
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    const cmd = t.getAttribute('data-cmd');
    if (cmd === 'link') { closeMenus(); host.querySelector('[data-linkbox]').hidden = false; host.querySelector('[data-link-input]').focus(); return; }
    if (cmd === 'ticklist') {
      restore();
      let li = selectedBlocks()[0];
      let ul = li && li.closest('ul');
      if (!ul) { document.execCommand('insertUnorderedList'); const n = window.getSelection().anchorNode; ul = n && (n.nodeType === 1 ? n : n.parentElement).closest('ul'); }
      if (ul) ul.classList.toggle('rt-list-check');
      emit();
      return;
    }
    if (cmd === 'indent' || cmd === 'outdent') {
      restore();
      selectedBlocks().forEach((el) => {
        if (el.tagName === 'LI') { document.execCommand(cmd); return; }
        const cur = BLOCK_GROUPS.indent.findIndex((x) => el.classList.contains(x));
        const next = Math.max(-1, Math.min(2, cur + (cmd === 'indent' ? 1 : -1)));
        BLOCK_GROUPS.indent.forEach((x) => el.classList.remove(x));
        if (next >= 0) el.classList.add(BLOCK_GROUPS.indent[next]);
      });
      emit();
      return;
    }
    if (cmd === 'removeFormat') {
      exec('removeFormat');
      selectedBlocks().forEach((el) => { el.removeAttribute('class'); el.querySelectorAll('span[class]').forEach((sp) => { while (sp.firstChild) sp.before(sp.firstChild); sp.remove(); }); });
      emit();
      return;
    }
    if (cmd) { exec(cmd); return; }
    closeMenus();
    if (t.hasAttribute('data-block')) { exec('formatBlock', t.getAttribute('data-block')); return; }
    if (t.hasAttribute('data-color')) { const v = t.getAttribute('data-color'); if (v) exec('foreColor', v); else { restore(); selectedBlocks().forEach((el) => el.querySelectorAll('[class*="rt-c-"]').forEach((sp) => sp.classList.remove(...TEXT_COLOURS.map((x) => x[0])))); emit(); } return; }
    if (t.hasAttribute('data-hl')) { const v = t.getAttribute('data-hl'); restore(); document.execCommand('styleWithCSS', false, true); if (v) document.execCommand('hiliteColor', false, v); else document.execCommand('hiliteColor', false, 'transparent'); document.execCommand('styleWithCSS', false, false); emit(); return; }
    if (t.hasAttribute('data-size')) { exec('fontSize', t.getAttribute('data-size')); return; }
    if (t.hasAttribute('data-blockclass')) { const [g, c] = t.getAttribute('data-blockclass').split(':'); setBlockClass(g, c); return; }
    if (t.hasAttribute('data-insert')) {
      const k = t.getAttribute('data-insert');
      if (k === 'table') { host.querySelector('[data-tablebox]').hidden = false; return; }
      if (k === 'note') insertHtml('<p class="rt-note">Tip: write your note here.</p><p><br></p>');
      if (k === 'warn') insertHtml('<p class="rt-warn">Please note: write your warning here.</p><p><br></p>');
      if (k === 'hr') insertHtml('<hr><p><br></p>');
      if (k === 'cols') insertHtml('<div class="rt-cols-2"><p>First column text.</p><p>Second column text.</p></div><p><br></p>');
      return;
    }
    if (t.hasAttribute('data-table')) { tableAction(t.getAttribute('data-table')); return; }
    if (t.hasAttribute('data-link-ok')) {
      const url = host.querySelector('[data-link-input]').value.trim();
      host.querySelector('[data-linkbox]').hidden = true;
      if (/^(https?:\/\/|\/|mailto:|tel:)/i.test(url)) exec('createLink', url);
      return;
    }
    if (t.hasAttribute('data-link-cancel')) { host.querySelector('[data-linkbox]').hidden = true; return; }
    if (t.hasAttribute('data-table-ok')) {
      const rows = Math.max(1, Math.min(20, Number(host.querySelector('[data-rows]').value) || 3));
      const cols = Math.max(1, Math.min(8, Number(host.querySelector('[data-cols]').value) || 3));
      host.querySelector('[data-tablebox]').hidden = true;
      const head = `<thead><tr>${Array.from({ length: cols }, (x, i) => `<th scope="col">Heading ${i + 1}</th>`).join('')}</tr></thead>`;
      const body = `<tbody>${Array.from({ length: rows - 1 || 1 }, () => `<tr>${Array.from({ length: cols }, () => '<td><br></td>').join('')}</tr>`).join('')}</tbody>`;
      insertHtml(`<table class="rt-table-striped">${head}${body}</table><p><br></p>`);
      return;
    }
    if (t.hasAttribute('data-table-cancel')) host.querySelector('[data-tablebox]').hidden = true;
  });
  document.addEventListener('click', (e) => { if (!host.contains(e.target)) closeMenus(); });
  area.addEventListener('input', emit);
  area.addEventListener('paste', (e) => {
    const data = e.clipboardData;
    if (!data) return;
    e.preventDefault();
    const htmlIn = data.getData('text/html');
    const text = data.getData('text/plain');
    const safe = htmlIn ? sanitizeRichText(htmlIn.replace(/<!--[\s\S]*?-->/g, '')).toString()
      : text.split(/\n{2,}/).map((para) => `<p>${para.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>')}</p>`).join('');
    document.execCommand('insertHTML', false, safe);
    emit();
  });
  emit();

  return {
    setHtml(h) { area.innerHTML = sanitizeRichText(h).toString(); emit(); },
    getHtml: clean
  };
}
