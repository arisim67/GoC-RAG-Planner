// js/grid-keys.js
// Editing the Planning Grid from the keyboard, like a spreadsheet:
//   Arrow keys          move between cells (Shift+Arrow selects a block)
//   Type a letter or two pick the guild whose name starts with them (type the same letter again to cycle)
//   Enter, Space or F2  open the cell's full list
//   Delete / Backspace  empty the selected cells
//   Ctrl/⌘+C, X, V      copy, cut and paste the selected cells
//   Escape              leave the grid
// Every change is one Undo step. Nothing here works on view-only plans or while the tutorial is open.

import { state, activeSrv, save } from './state.js';
import { renderAll } from './render.js';
import { recordChange } from './history.js';
import { showToast } from './ui.js';
import { gridRows, posOf, rangeOf, getFillSel, setFillSel, setAfterPaint } from './grid-fill.js';

const TYPE_MS = 900; // letters typed within this long of each other spell one name

let cursor = null; // { srvId, r, d }: the cell you're on
let shiftEnd = null; // the moving corner while Shift+Arrow grows a block
let keyboard = false; // show the cursor outline (only once the keyboard is in use)
let refocus = false; // put focus back on the cursor after the grid is rebuilt
let typed = { text: '', at: 0, cell: '' };
let clip = null; // { srvId, rows: [[{ id, name }]] }

const cellAt = (r, d) => {
  const tr = gridRows()[r];
  return tr ? tr.querySelector(`td[data-d="${d}"]`) : null;
};
const selectAt = (r, d) => {
  const td = cellAt(r, d);
  return td ? td.querySelector('select') : null;
};
const size = () => {
  const rows = gridRows();
  return { rows: rows.length, days: rows.length ? rows[0].querySelectorAll('td[data-d]').length : 0 };
};
const editable = () => {
  const srv = activeSrv();
  return srv && !srv.isViewOnly && !document.querySelector('.tour-card') ? srv : null;
};
const busy = () => document.querySelector('.modal-bg.open, .modal-tpl, .color-pop, #tab-ctx.open');

// ── The cursor ─────────────────────────────────────────────────
function showCursor() {
  const focus = refocus;
  refocus = false;
  document.querySelectorAll('td.kb-cursor').forEach(td => td.classList.remove('kb-cursor'));
  if (!cursor || cursor.srvId !== state.activeId) return;
  const { rows, days } = size();
  if (!rows) return;
  cursor.r = Math.min(cursor.r, rows - 1);
  cursor.d = Math.min(cursor.d, days - 1);
  const td = cellAt(cursor.r, cursor.d);
  if (!td) return;
  if (keyboard) td.classList.add('kb-cursor');
  const sel = focus && td.querySelector('select');
  if (sel) sel.focus({ preventScroll: true });
}
setAfterPaint(showCursor);

// Scroll the cell into view, clear of the sticky Town column and the bar of section links.
function reveal(td) {
  const wrap = td.closest('.tbl-wrap');
  const name = td.parentElement.querySelector('td.kname');
  if (wrap) {
    const c = td.getBoundingClientRect(),
      w = wrap.getBoundingClientRect();
    const left = name ? name.getBoundingClientRect().right : w.left;
    if (c.left < left) wrap.scrollLeft -= left - c.left + 8;
    else if (c.right > w.right) wrap.scrollLeft += c.right - w.right + 8;
  }
  const c = td.getBoundingClientRect();
  const bar = document.querySelector('.jump-bar');
  const top = (bar ? bar.getBoundingClientRect().bottom : 0) + 8;
  if (c.top < top) window.scrollBy(0, c.top - top);
  else if (c.bottom > window.innerHeight - 8) window.scrollBy(0, c.bottom - window.innerHeight + 8);
}

function moveTo(r, d, extend) {
  const { rows, days } = size();
  r = Math.max(0, Math.min(rows - 1, r));
  d = Math.max(0, Math.min(days - 1, d));
  if (extend) {
    shiftEnd = { r, d };
    setFillSel(rangeOf(cursor, shiftEnd), { r: cursor.r, d: cursor.d });
  } else {
    cursor = { srvId: state.activeId, r, d };
    shiftEnd = null;
    setFillSel(null);
  }
  refocus = true;
  showCursor();
  const td = cellAt(r, d);
  if (td) reveal(td);
}

// The cells the next Delete / Copy / Paste works on: the selected block if the cursor is in it,
// otherwise just the cursor's cell.
function target() {
  const sel = getFillSel();
  if (sel && cursor && cursor.r >= sel.r0 && cursor.r <= sel.r1 && cursor.d >= sel.d0 && cursor.d <= sel.d1) {
    return { r0: sel.r0, r1: sel.r1, d0: sel.d0, d1: sel.d1 };
  }
  return { r0: cursor.r, r1: cursor.r, d0: cursor.d, d1: cursor.d };
}

// ── Changing cells ─────────────────────────────────────────────
// changes: [{ r, d, gid }]. Saves, records one Undo step and redraws, keeping the keyboard on the grid.
function apply(srv, changes, label, record = true) {
  const rows = gridRows();
  const before = JSON.parse(JSON.stringify(srv.plan || {}));
  let changed = false;
  changes.forEach(({ r, d, gid }) => {
    const td = rows[r] && rows[r].querySelector(`td[data-d="${d}"]`);
    if (!td) return;
    const kid = td.dataset.k;
    if (((srv.plan[d] || {})[kid] || '') === gid) return;
    if (!srv.plan[d]) srv.plan[d] = {};
    srv.plan[d][kid] = gid;
    changed = true;
  });
  if (!changed) return false;
  if (record) recordChange(srv, label, { plan: before });
  save();
  refocus = true;
  renderAll();
  return true;
}

// Type-ahead: letters typed in quick succession spell the start of a guild's name.
const plain = s =>
  s
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();
function typeAhead(srv, ch) {
  const sel = selectAt(cursor.r, cursor.d);
  if (!sel) return;
  const now = Date.now();
  const cellKey = `${state.activeId}:${cursor.r}:${cursor.d}`;
  const sameCell = typed.cell === cellKey && now - typed.at < TYPE_MS;
  typed.text = sameCell ? typed.text + ch.toLowerCase() : ch.toLowerCase();
  typed.at = now;
  const options = [...sel.options].filter(o => o.value);
  const repeat = [...typed.text].every(c => c === typed.text[0]);
  let pick;
  if (repeat && typed.text.length > 1) {
    // the same letter again: step through the guilds starting with it
    const hits = options.filter(o => plain(o.text).startsWith(typed.text[0]));
    const at = hits.findIndex(o => o.value === sel.value);
    pick = hits.length ? hits[(at + 1) % hits.length] : null;
  } else {
    pick =
      options.find(o => plain(o.text).startsWith(typed.text)) ||
      options.find(o => o.text.toLowerCase().includes(typed.text));
  }
  if (!pick) return;
  const td = cellAt(cursor.r, cursor.d);
  // Several letters for the same cell make one Undo step, not one per letter.
  apply(srv, [{ r: cursor.r, d: cursor.d, gid: pick.value }], `${td.dataset.k} on day ${cursor.d}`, !sameCell);
  typed.cell = cellKey;
}

function clearCells(srv, rng, label) {
  const changes = [];
  for (let r = rng.r0; r <= rng.r1; r++) for (let d = rng.d0; d <= rng.d1; d++) changes.push({ r, d, gid: '' });
  const one = rng.r0 === rng.r1 && rng.d0 === rng.d1;
  return apply(srv, changes, label || (one ? `${cellAt(rng.r0, rng.d0).dataset.k} on day ${rng.d0}` : 'Clear cells'));
}

function copyCells(srv, rng) {
  const rows = [];
  for (let r = rng.r0; r <= rng.r1; r++) {
    const row = [];
    for (let d = rng.d0; d <= rng.d1; d++) {
      const gid = (cellAt(r, d) || {}).dataset?.g || '';
      const g = srv.guilds.find(x => x.id === gid);
      row.push({ id: gid, name: g ? g.name : '' });
    }
    rows.push(row);
  }
  clip = { srvId: srv.id, rows };
  // Also put the guild names on the clipboard, so the block can be pasted into a spreadsheet.
  const text = rows.map(row => row.map(c => c.name).join('\t')).join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
  return rows.length * rows[0].length;
}

// Paste: from the cursor, or repeated across the selected block if one is selected.
function pasteCells(srv) {
  if (!clip) return showToast('Copy some cells first (Ctrl+C).', true, 3000);
  const { rows, days } = size();
  const h = clip.rows.length,
    w = clip.rows[0].length;
  const sel = target();
  const big = sel.r1 - sel.r0 + 1 >= h && sel.d1 - sel.d0 + 1 >= w && (sel.r1 > sel.r0 || sel.d1 > sel.d0);
  const rng = big
    ? sel
    : { r0: sel.r0, d0: sel.d0, r1: Math.min(rows - 1, sel.r0 + h - 1), d1: Math.min(days - 1, sel.d0 + w - 1) };
  // From another server, guilds are matched by name.
  const idOf = c => {
    if (!c.id) return '';
    if (clip.srvId === srv.id) return c.id;
    const g = srv.guilds.find(x => x.name === c.name);
    return g ? g.id : '';
  };
  const changes = [];
  for (let r = rng.r0; r <= rng.r1; r++) {
    for (let d = rng.d0; d <= rng.d1; d++)
      changes.push({ r, d, gid: idOf(clip.rows[(r - rng.r0) % h][(d - rng.d0) % w]) });
  }
  setFillSel(rng, { r: rng.r0, d: rng.d0 });
  cursor = { srvId: state.activeId, r: rng.r0, d: rng.d0 };
  if (!apply(srv, changes, 'Paste')) {
    refocus = true;
    showCursor();
  }
}

function openList() {
  const sel = selectAt(cursor.r, cursor.d);
  if (!sel) return;
  sel.focus({ preventScroll: true });
  try {
    sel.showPicker();
  } catch (_) {
    /* the browser can't open it from code; it has focus, so Alt+Down / Space opens it */
  }
}

// ── Keys ───────────────────────────────────────────────────────
const MOVES = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

function onKey(e) {
  if (e.altKey || e.defaultPrevented || busy()) return;
  const srv = editable();
  if (!srv) return;
  const a = document.activeElement;
  const onCell = a && a.matches && a.matches('table.ptbl select.csel');
  if (onCell) {
    const p = posOf(a.closest('td'));
    if (!cursor || cursor.srvId !== state.activeId || cursor.r !== p.r || cursor.d !== p.d) {
      cursor = { srvId: state.activeId, ...p };
      shiftEnd = null;
    }
  } else if (!(cursor && cursor.srvId === state.activeId && (!a || a === document.body))) {
    return; // the keyboard is somewhere else on the page
  }
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key;
  const letter = !mod && k.length === 1 && /[\p{L}\p{N}]/u.test(k);
  if (!letter) typed.at = 0; // any other key ends the name being typed

  if (mod) {
    const key = k.toLowerCase();
    if (key === 'c' || key === 'x') {
      e.preventDefault();
      keyboard = true;
      const rng = target();
      const n = copyCells(srv, rng);
      if (key === 'x') clearCells(srv, rng, 'Cut');
      showToast(`${key === 'x' ? 'Cut' : 'Copied'} ${n} ${n === 1 ? 'cell' : 'cells'}.`, false, 2000);
    } else if (key === 'v') {
      e.preventDefault();
      keyboard = true;
      pasteCells(srv);
    } else if (key === 'z' || key === 'y') {
      refocus = true; // Undo / Redo (history.js) redraws the grid; stay on the cell
      keyboard = true;
      setTimeout(() => {
        refocus = false; // nothing to undo: don't grab the focus on some later redraw
      });
    } else if (key === 'a') {
      e.preventDefault();
      keyboard = true;
      const { rows, days } = size();
      cursor = { srvId: state.activeId, r: 0, d: 0 };
      shiftEnd = { r: rows - 1, d: days - 1 };
      setFillSel(rangeOf(cursor, shiftEnd), { r: 0, d: 0 });
      refocus = true;
      showCursor();
    }
    return;
  }

  if (k === 'Tab') {
    keyboard = true; // the browser moves to the next cell; focusin below follows it
    return;
  }
  if (MOVES[k]) {
    e.preventDefault();
    keyboard = true;
    const [dr, dd] = MOVES[k];
    const from = e.shiftKey ? shiftEnd || { r: cursor.r, d: cursor.d } : cursor;
    moveTo(from.r + dr, from.d + dd, e.shiftKey);
  } else if (k === 'Home' || k === 'End') {
    e.preventDefault();
    keyboard = true;
    moveTo(cursor.r, k === 'Home' ? 0 : size().days - 1, e.shiftKey);
  } else if (k === 'Enter' || k === ' ' || k === 'F2') {
    e.preventDefault();
    keyboard = true;
    openList();
  } else if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault();
    keyboard = true;
    clearCells(srv, target());
  } else if (k === 'Escape') {
    keyboard = false;
    cursor = null;
    shiftEnd = null;
    showCursor();
    if (onCell) a.blur();
  } else if (letter) {
    e.preventDefault(); // the browser's own type-to-select would save every letter separately
    keyboard = true;
    setFillSel(null);
    typeAhead(srv, k);
  }
}
// Capture, so this runs before Undo/Redo and the Escape handlers redraw the page.
document.addEventListener('keydown', onKey, true);

// Clicking a cell puts the cursor there; clicking anywhere else leaves the grid.
document.addEventListener(
  'mousedown',
  e => {
    keyboard = false;
    const td = e.target.closest && e.target.closest('table.ptbl td[data-d]');
    const a = document.activeElement;
    // Clicks on cells don't move the focus (grid-fill.js stops them), so let go of a focused cell.
    if (a && a.matches && a.matches('table.ptbl select.csel') && (!td || !td.contains(a))) a.blur();
    if (td && !e.shiftKey) {
      cursor = { srvId: state.activeId, ...posOf(td) };
      shiftEnd = null;
    } else if (!td && !(e.target.closest && e.target.closest('.fill-handle'))) {
      cursor = null;
    }
    showCursor();
  },
  true,
);

// Tabbing into a cell (or a browser that focuses it on click) moves the cursor there too. A guild
// picked from the open list redraws the grid, so the focus comes back to the same cell.
document.addEventListener('focusin', e => {
  const sel = e.target;
  if (!sel.matches || !sel.matches('table.ptbl select.csel')) return;
  cursor = { srvId: state.activeId, ...posOf(sel.closest('td')) };
  shiftEnd = null;
  if (keyboard) showCursor();
});
document.addEventListener(
  'change',
  e => {
    if (e.target.matches && e.target.matches('table.ptbl select.csel') && document.activeElement === e.target) {
      refocus = true;
    }
  },
  true,
);
