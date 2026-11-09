// js/grid-fill.js
// Planning grid: select cells and drag the fill handle to copy guilds across days (spreadsheet-style).

import { state, activeSrv, save } from './state.js';
import { renderAll } from './render.js';

// ══════════════════════════════════════════════════════════════
//  SELECT + DRAG TO FILL (SPREADSHEET COPY)
//  - Quick click = open the dropdown. Press-and-hold, drag, or shift-click = select cells
//  - Selected block gets an outline + tint, with a small fill handle on its corner
//  - Drag the handle to repeat the block across days (or down rows)
// ══════════════════════════════════════════════════════════════

const FILL_ACCENT = '#b1a6cc';
const FILL_RGB = '177,166,204';
const CAN_PICKER =
  typeof HTMLSelectElement !== 'undefined' && typeof HTMLSelectElement.prototype.showPicker === 'function';

const HOLD_MS = 250; // press-and-hold this long on a cell to select it (a quick click opens the dropdown)

let fillSel = null; // { srvId, anchor:{r,d}, r0, r1, d0, d1 }  the highlighted block
let selDrag = null; // mouse is down on a cell (plain click, or dragging out a block)
let fillDrag = null; // fill handle is being dragged
let paintedCells = [];
let lastPtr = null;
let autoRaf = 0;

(function injectFillStyles() {
  if (document.getElementById('fill-styles')) return;
  const st = document.createElement('style');
  st.id = 'fill-styles';
  st.textContent = `
    .fill-handle{position:absolute;right:-4px;bottom:-4px;width:7px;height:7px;box-sizing:border-box;
      background:${FILL_ACCENT};border:1px solid var(--bg,#191425);cursor:crosshair;z-index:10;touch-action:none;}
    .fill-handle::after{content:'';position:absolute;inset:-7px;}
    .fill-handle.edge-r{right:0}
    .fill-handle.edge-b{bottom:0}
    table.ptbl td[data-d]{-webkit-user-select:none;user-select:none;}
    @media (pointer:coarse){
      .fill-handle{width:14px;height:14px;right:-7px;bottom:-7px;border-radius:50%;}
      .fill-handle::after{inset:-15px;}
    }
  `;
  document.head.appendChild(st);
})();

// ── grid helpers ──────────────────────────────────────────────
const gridRows = () => document.querySelectorAll('table.ptbl tbody tr');
const kidOf = tr => tr.querySelector('td[data-k]').dataset.k;
const mod = (n, m) => ((n % m) + m) % m;

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest('table.ptbl td[data-d]') : null;
}
function posOf(td) {
  const tr = td.parentElement;
  return { r: Array.prototype.indexOf.call(tr.parentElement.children, tr), d: +td.dataset.d };
}
function rangeOf(a, b) {
  return { r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), d0: Math.min(a.d, b.d), d1: Math.max(a.d, b.d) };
}
const sameRange = (a, b) => a.r0 === b.r0 && a.r1 === b.r1 && a.d0 === b.d0 && a.d1 === b.d1;

// ── painting (outline + tint, via inset box-shadow so sticky columns etc. are unaffected) ──
function clearPaint(removeHandle = true) {
  paintedCells.forEach(td => {
    td.style.boxShadow = '';
  });
  paintedCells = [];
  if (removeHandle) document.querySelectorAll('.fill-handle').forEach(h => h.remove());
}

// outline = block that gets the border; strong = block that gets the darker tint
function paintRange(outline, strong) {
  const rows = gridRows();
  for (let r = outline.r0; r <= outline.r1; r++) {
    const tr = rows[r];
    if (!tr) continue;
    for (let d = outline.d0; d <= outline.d1; d++) {
      const td = tr.querySelector(`td[data-d="${d}"]`);
      if (!td) continue;
      const isStrong = r >= strong.r0 && r <= strong.r1 && d >= strong.d0 && d <= strong.d1;
      const sh = [];
      if (r === outline.r0) sh.push(`inset 0 1px 0 0 ${FILL_ACCENT}`);
      if (r === outline.r1) sh.push(`inset 0 -1px 0 0 ${FILL_ACCENT}`);
      if (d === outline.d0) sh.push(`inset 1px 0 0 0 ${FILL_ACCENT}`);
      if (d === outline.d1) sh.push(`inset -1px 0 0 0 ${FILL_ACCENT}`);
      sh.push(`inset 0 0 0 999px rgba(${FILL_RGB},${isStrong ? 0.2 : 0.08})`);
      td.style.boxShadow = sh.join(',');
      paintedCells.push(td);
    }
  }
}

function placeHandle(rng) {
  const rows = gridRows();
  const tr = rows[rng.r1];
  if (!tr) return;
  const td = tr.querySelector(`td[data-d="${rng.d1}"]`);
  if (!td) return;
  const h = document.createElement('div');
  h.className = 'fill-handle';
  h.title = 'Drag to copy';
  if (rng.d1 === tr.querySelectorAll('td[data-d]').length - 1) h.classList.add('edge-r');
  if (rng.r1 === rows.length - 1) h.classList.add('edge-b');
  h.addEventListener('mousedown', startFill);
  h.addEventListener('touchstart', startFill, { passive: false });
  td.appendChild(h);
}

function setFillSel(rng, anchor) {
  fillSel = rng ? { srvId: state.activeId, anchor: anchor || { r: rng.r0, d: rng.d0 }, ...rng } : null;
  renderFillSel();
}

// Called after every renderAll() (the grid is rebuilt from scratch each time)
export function renderFillSel() {
  clearPaint();
  if (!fillSel) return;
  const srv = activeSrv();
  const rows = gridRows();
  if (!srv || srv.isViewOnly || fillSel.srvId !== state.activeId || !rows.length) {
    fillSel = null;
    return;
  }
  const nD = rows[0].querySelectorAll('td[data-d]').length;
  if (fillSel.r0 >= rows.length || fillSel.d0 >= nD) {
    fillSel = null;
    return;
  }
  fillSel.r1 = Math.min(fillSel.r1, rows.length - 1);
  fillSel.d1 = Math.min(fillSel.d1, nD - 1);
  paintRange(fillSel, fillSel);
  placeHandle(fillSel);
}

// ── fill handle drag ─────────────────────────────────────────
function startFill(e) {
  if (e.cancelable) e.preventDefault();
  e.stopPropagation();
  const srv = activeSrv();
  if (!srv || srv.isViewOnly || !fillSel) return;
  const s = { r0: fillSel.r0, r1: fillSel.r1, d0: fillSel.d0, d1: fillSel.d1 };
  const rows = gridRows();
  const src = [];
  for (let r = s.r0; r <= s.r1; r++) {
    const kid = kidOf(rows[r]),
      row = [];
    for (let d = s.d0; d <= s.d1; d++) row.push((srv.plan[d] || {})[kid] || '');
    src.push(row);
  }
  fillDrag = { sel: s, src, target: s };
  document.body.style.cursor = 'crosshair';
  startAutoScroll();
}

function handleFillMove(x, y) {
  const td = cellFromPoint(x, y);
  if (!td) return;
  const p = posOf(td),
    s = fillDrag.sel;
  const dr = p.r < s.r0 ? p.r - s.r0 : p.r > s.r1 ? p.r - s.r1 : 0;
  const dd = p.d < s.d0 ? p.d - s.d0 : p.d > s.d1 ? p.d - s.d1 : 0;
  const t = { ...s };
  if (Math.abs(dd) >= Math.abs(dr)) {
    t.d0 = Math.min(s.d0, p.d);
    t.d1 = Math.max(s.d1, p.d);
  } // fill sideways
  else {
    t.r0 = Math.min(s.r0, p.r);
    t.r1 = Math.max(s.r1, p.r);
  } // fill up/down
  if (sameRange(t, fillDrag.target)) return;
  fillDrag.target = t;
  clearPaint(false); // keep the handle in the DOM while dragging (touch events need it)
  paintRange(t, s);
}

function commitFill() {
  const { sel: s, src, target: t } = fillDrag;
  fillDrag = null;
  document.body.style.cursor = '';
  if (sameRange(s, t)) {
    renderFillSel();
    return;
  }
  const srv = activeSrv();
  if (!srv) return;
  const rows = gridRows();
  const h = s.r1 - s.r0 + 1,
    w = s.d1 - s.d0 + 1;
  let changed = false;
  for (let r = t.r0; r <= t.r1; r++) {
    const kid = kidOf(rows[r]);
    for (let d = t.d0; d <= t.d1; d++) {
      if (r >= s.r0 && r <= s.r1 && d >= s.d0 && d <= s.d1) continue; // source cells stay as they are
      const gid = src[mod(r - s.r0, h)][mod(d - s.d0, w)]; // repeats the block, like a spreadsheet
      if (!srv.plan[d]) srv.plan[d] = {};
      if ((srv.plan[d][kid] || '') !== gid) {
        srv.plan[d][kid] = gid;
        changed = true;
      }
    }
  }
  setFillSel(t, { r: t.r0, d: t.d0 }); // selection grows to cover what was just filled
  if (changed) {
    save();
    renderAll();
  } // heavy recalculation once, on release
}

// ── cell selection (click, drag, shift-click) ────────────────
document.addEventListener(
  'mousedown',
  e => {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('.fill-handle')) return;
    const td = e.target.closest ? e.target.closest('table.ptbl td[data-d]') : null;
    if (!td) {
      if (fillSel) setFillSel(null);
      return;
    }
    const srv = activeSrv();
    if (!srv || srv.isViewOnly) return;
    const pos = posOf(td);

    if (e.shiftKey && fillSel && fillSel.srvId === state.activeId) {
      // extend from the anchor
      e.preventDefault();
      setFillSel(rangeOf(fillSel.anchor, pos), fillSel.anchor);
      return;
    }
    selDrag = {
      anchor: pos,
      moved: false,
      held: false,
      timer: null,
      last: `${pos.r},${pos.d}`,
      select: td.querySelector('select'),
    };
    if (CAN_PICKER) {
      // Block the native dropdown on press. Quick click → we open it on release.
      // Press-and-hold (or drag) → select the cell instead.
      e.preventDefault();
      const sd = selDrag;
      sd.timer = setTimeout(() => {
        if (selDrag !== sd || sd.moved) return;
        sd.held = true;
        setFillSel(rangeOf(pos, pos), pos);
      }, HOLD_MS);
    } else {
      setFillSel(rangeOf(pos, pos), pos); // no showPicker support: click selects, native dropdown still opens
    }
    startAutoScroll();
  },
  true,
);

function handleSelMove(x, y) {
  const td = cellFromPoint(x, y);
  if (!td) return;
  const pos = posOf(td),
    key = `${pos.r},${pos.d}`;
  if (key === selDrag.last) return;
  selDrag.last = key;
  selDrag.moved = true;
  clearTimeout(selDrag.timer);
  setFillSel(rangeOf(selDrag.anchor, pos), selDrag.anchor);
}

// ── pointer plumbing ─────────────────────────────────────────
function onDragMove(x, y) {
  if (fillDrag) handleFillMove(x, y);
  else if (selDrag) handleSelMove(x, y);
  else if (touchHold && touchHold.fired) handleTouchSelMove(x, y);
}

function handleTouchSelMove(x, y) {
  const td = cellFromPoint(x, y);
  if (!td) return;
  const pos = posOf(td),
    key = `${pos.r},${pos.d}`;
  if (key === touchHold.last) return;
  touchHold.last = key;
  setFillSel(rangeOf(touchHold.anchor, pos), touchHold.anchor);
}

window.addEventListener('mousemove', e => {
  if (!fillDrag && !selDrag) return;
  lastPtr = { x: e.clientX, y: e.clientY };
  onDragMove(e.clientX, e.clientY);
});

window.addEventListener(
  'touchmove',
  e => {
    if (!fillDrag) return;
    if (e.cancelable) e.preventDefault(); // stop the page scrolling while filling
    const t = e.touches[0];
    lastPtr = { x: t.clientX, y: t.clientY };
    onDragMove(t.clientX, t.clientY);
  },
  { passive: false },
);

window.addEventListener('mouseup', () => {
  if (selDrag) {
    const { moved, held, select, timer } = selDrag;
    clearTimeout(timer);
    selDrag = null;
    if (!moved && !held && CAN_PICKER && select) {
      // quick click → open the dropdown
      try {
        select.showPicker();
      } catch (_) {
        select.focus();
      }
    }
  }
  if (fillDrag) commitFill();
});
window.addEventListener('touchend', () => {
  if (fillDrag) commitFill();
});

// Touch: long-press a cell to select it, keep dragging to extend the block (a quick tap still opens the dropdown)
let touchHold = null;
document.addEventListener(
  'touchstart',
  e => {
    const td = e.target.closest ? e.target.closest('table.ptbl td[data-d]') : null;
    if (!td || e.target.closest('.fill-handle')) return;
    const srv = activeSrv();
    if (!srv || srv.isViewOnly) return;
    const t = e.touches[0],
      pos = posOf(td);
    const th = (touchHold = { x: t.clientX, y: t.clientY, fired: false, anchor: pos, last: `${pos.r},${pos.d}` });
    lastPtr = { x: t.clientX, y: t.clientY };
    th.timer = setTimeout(() => {
      if (touchHold !== th) return;
      th.fired = true;
      setFillSel(rangeOf(pos, pos), pos);
      if (navigator.vibrate) navigator.vibrate(10);
      startAutoScroll();
    }, HOLD_MS + 150);
  },
  { passive: true },
);
document.addEventListener(
  'touchmove',
  e => {
    if (!touchHold) return;
    const t = e.touches[0];
    if (touchHold.fired) {
      // long-press done → dragging extends the selection
      if (e.cancelable) e.preventDefault(); // don't scroll the page while selecting
      lastPtr = { x: t.clientX, y: t.clientY };
      onDragMove(t.clientX, t.clientY);
      return;
    }
    if (Math.hypot(t.clientX - touchHold.x, t.clientY - touchHold.y) > 10) {
      // it's a scroll, not a long-press
      clearTimeout(touchHold.timer);
      touchHold = null;
    }
  },
  { passive: false },
);
document.addEventListener(
  'touchend',
  e => {
    if (!touchHold) return;
    clearTimeout(touchHold.timer);
    if (touchHold.fired && e.cancelable) e.preventDefault(); // don't let the long-press also open the dropdown
    touchHold = null;
  },
  { passive: false },
);
document.addEventListener('touchcancel', () => {
  if (touchHold) {
    clearTimeout(touchHold.timer);
    touchHold = null;
  }
});
window.addEventListener('touchcancel', () => {
  if (fillDrag) commitFill();
});

document.addEventListener('keydown', e => {
  // Enter on a single selected cell opens its dropdown (keyboard alternative to the 2nd click)
  if (
    e.key === 'Enter' &&
    CAN_PICKER &&
    fillSel &&
    fillSel.srvId === state.activeId &&
    fillSel.r0 === fillSel.r1 &&
    fillSel.d0 === fillSel.d1 &&
    (document.activeElement === document.body || !document.activeElement)
  ) {
    const td = (gridRows()[fillSel.r0] || document.createElement('tr')).querySelector(`td[data-d="${fillSel.d0}"]`);
    const sel = td && td.querySelector('select');
    if (sel) {
      e.preventDefault();
      try {
        sel.showPicker();
      } catch (_) {
        sel.focus();
      }
    }
    return;
  }
  if (e.key !== 'Escape') return;
  if (fillDrag) {
    fillDrag = null;
    document.body.style.cursor = '';
  }
  if (fillSel) setFillSel(null);
});

// Auto-scroll while dragging near the edge of the grid (so you can reach days that are off-screen)
function startAutoScroll() {
  if (!autoRaf) autoRaf = requestAnimationFrame(autoScrollTick);
}
function autoScrollTick() {
  autoRaf = 0;
  if ((!fillDrag && !selDrag && !(touchHold && touchHold.fired)) || !lastPtr) return;
  let moved = false;
  const wrap = document.querySelector('#capture-grid .tbl-wrap');
  if (wrap) {
    const rc = wrap.getBoundingClientRect();
    let leftEdge = rc.left; // don't treat the sticky name columns as scroll zone
    ['kname', 'ktype'].forEach(c => {
      const el = document.querySelector('table.ptbl td.' + c);
      if (el) leftEdge = Math.max(leftEdge, el.getBoundingClientRect().right);
    });
    const ZONE = 40,
      MAX = 22;
    let vx = 0;
    if (lastPtr.x > rc.right - ZONE) vx = Math.min(MAX, ((lastPtr.x - (rc.right - ZONE)) / ZONE) * MAX);
    else if (lastPtr.x < leftEdge + ZONE) vx = -Math.min(MAX, ((leftEdge + ZONE - lastPtr.x) / ZONE) * MAX);
    if (vx) {
      const b = wrap.scrollLeft;
      wrap.scrollLeft += vx;
      if (wrap.scrollLeft !== b) moved = true;
    }
  }
  let vy = 0;
  if (lastPtr.y < 50) vy = -Math.min(22, ((50 - lastPtr.y) / 50) * 22);
  else if (lastPtr.y > window.innerHeight - 50) vy = Math.min(22, ((lastPtr.y - (window.innerHeight - 50)) / 50) * 22);
  if (vy) {
    const b = window.scrollY;
    window.scrollBy(0, vy);
    if (window.scrollY !== b) moved = true;
  }
  if (moved) onDragMove(lastPtr.x, lastPtr.y);
  autoRaf = requestAnimationFrame(autoScrollTick);
}
