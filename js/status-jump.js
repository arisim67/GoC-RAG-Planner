// js/status-jump.js
// The red chips and the list of problems under Status jump to what's wrong: the town in the grid,
// every problem on a day, the guilds declaring too many towns, or the day a guild is wiped. The
// section opens if it was folded, and the cells flash so they're easy to spot.

import { expandSection } from './collapse.js';

const FLASH_MS = 2400;

function flash(els) {
  els.forEach(el => {
    el.classList.remove('jump-flash');
    void el.offsetWidth; // restart the animation if it's already running
    el.classList.add('jump-flash');
    setTimeout(() => el.classList.remove('jump-flash'), FLASH_MS);
  });
}

// Bring a cell into view: centered, so the sticky Town column and the section links don't cover it.
function bringIntoView(el) {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'center' });
}

// Put the keyboard on a grid cell too, so the arrow keys carry on from it.
function focusCell(td) {
  const sel = td && td.querySelector('select');
  if (sel && !sel.disabled) sel.focus({ preventScroll: true });
}

export function statusJump(btn) {
  const { kind, day, k, g } = btn.dataset;

  if (kind === 'declares') {
    const sec = document.getElementById('sec-declares');
    expandSection(sec);
    const cells = [...sec.querySelectorAll('.dc-bad')].map(el => el.closest('td'));
    if (!cells.length) return;
    bringIntoView(cells[0]);
    flash(cells);
    return;
  }

  const grid = document.getElementById('capture-grid');
  expandSection(grid);
  const table = grid.querySelector('table.ptbl');
  if (!table) return;

  if (kind === 'cell') {
    const td = table.querySelector(`tbody td[data-d="${day}"][data-k="${CSS.escape(k)}"]`);
    if (!td) return;
    bringIntoView(td);
    flash([td]);
    focusCell(td);
  } else if (kind === 'day') {
    const cells = [...table.querySelectorAll(`tbody td.cell-err[data-d="${day}"]`)];
    if (!cells.length) return;
    bringIntoView(cells[0]);
    flash(cells);
    focusCell(cells[0]);
  } else if (kind === 'wipe') {
    // A wiped guild holds nothing that day, so show the day's column, with that guild's towns the
    // day before (what it lost).
    const head = table.querySelector(`thead tr:first-child th:nth-child(${Number(day) + 4})`);
    const lost = [...table.querySelectorAll(`tbody td[data-d="${Number(day) - 1}"][data-g="${CSS.escape(g)}"]`)];
    if (head) bringIntoView(head);
    flash([head, ...lost].filter(Boolean));
  }
}
