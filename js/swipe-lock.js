// js/swipe-lock.js
// On a touch screen, a table that scrolls sideways (the grid, Declares...) also picked up the sideways part
// of an ordinary up-and-down swipe, so the table twitched left and right as you scrolled the page. Here the
// first few pixels of a swipe decide its direction: a mostly vertical one scrolls the page only, and the
// table is held still until the finger lifts; a mostly sideways one scrolls the table as before.

const WRAP = '.tbl-wrap, .guild-list';
const DECIDE_AT = 8; // pixels of movement before the direction is chosen
const SIDEWAYS_BIAS = 1.4; // sideways has to beat up-and-down by this much to count as sideways

let wrap = null;
let startX = 0;
let startY = 0;
let decided = false;
let held = null; // the element whose sideways scroll is switched off for this swipe

function release() {
  if (held) held.style.overflowX = '';
  held = null;
  wrap = null;
  decided = false;
}

document.addEventListener(
  'touchstart',
  e => {
    release();
    if (e.touches.length !== 1) return;
    const w = e.target.closest && e.target.closest(WRAP);
    if (!w || w.scrollWidth <= w.clientWidth) return;
    wrap = w;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  },
  { passive: true },
);

document.addEventListener(
  'touchmove',
  e => {
    if (!wrap || decided) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx < DECIDE_AT && dy < DECIDE_AT) return;
    decided = true;
    if (dx < dy * SIDEWAYS_BIAS) {
      held = wrap;
      held.style.overflowX = 'hidden';
    }
  },
  { passive: true },
);

document.addEventListener('touchend', release, { passive: true });
document.addEventListener('touchcancel', release, { passive: true });
