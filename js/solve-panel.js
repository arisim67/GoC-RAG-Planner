// js/solve-panel.js
// The panel shown while Auto-Optimize runs: a little planning grid that keeps filling in with the
// guilds' colors, how long it has been running, what the solver is working on, a tip that changes
// every few seconds, and a Stop button. The animation only loops; the solver can't say how far along
// it is, so there is deliberately no progress bar.

import { esc } from './ui.js';
import { icon } from './icons.js';

const ROWS = 5;
const COLS = 9;
const TIP_MS = 7000;
const CELL_MS = 260;

const TIPS = [
  'Click a guild under <b>Spotlight</b> above the grid to see only its towns.',
  'Planning a day or two yourself before Auto-Optimize makes it finish faster.',
  'Arrow keys move around the grid, and typing a guild’s first letters picks it.',
  '<b>Ctrl+C</b> and <b>Ctrl+V</b> copy and paste blocks of cells in the grid.',
  'Not happy with the result? <b>Undo</b> puts your plan back exactly as it was.',
  'Click a red pill under <b>Status</b> to jump straight to the problem.',
  '<b>History</b> keeps saved copies of each server, even deleted ones.',
  'Click a section’s title to fold it away until you need it.',
  'Click the dot next to a guild to give it any color.',
  '<b>Share</b> in the message template editor sends your format to other planners.',
];

const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// What the solver is working on, in plain words (from the progress lines twophase.js sends).
export function phaseText(label) {
  if (/^Phase 1/.test(label)) return 'Sharing out Darkwick and the dorms…';
  if (/^Phase 2/.test(label)) return 'Evening out the points…';
  if (/^Clean-up/.test(label)) return 'Polishing the plan…';
  return label;
}

// colors: the guilds' colors. note: a line about how long it usually takes. onStop: Stop clicked.
export function showSolvePanel({ colors, note, phase, onStop }) {
  const palette = colors.length ? colors : ['#a08cff'];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pick = () => palette[Math.floor(Math.random() * palette.length)];

  const el = document.createElement('div');
  el.className = 'solve-panel';
  el.innerHTML = `
    <div class="sp-art" aria-hidden="true">
      ${Array.from({ length: ROWS * COLS }, (_, i) => {
        const filled = reduce || Math.random() < 0.55;
        return `<span class="sp-cell${filled ? ' on' : ''}" style="--c:${pick()};--d:${i % COLS}"></span>`;
      }).join('')}
    </div>
    <div class="sp-body">
      <div class="sp-title">Working out your plan <span class="sp-time">0:00</span></div>
      <div class="sp-phase" aria-live="polite">${esc(phase || 'Getting started…')}</div>
      <div class="sp-note">${esc(note)}</div>
      <div class="sp-tip"><span class="sp-tip-label">Tip</span><span class="sp-tip-text"></span></div>
    </div>
    <button type="button" class="btn-tool btn-tool-sm sp-stop" title="Stop Auto-Optimize and keep your plan as it was">
      ${icon('x')} Stop
    </button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));

  // Tips: start somewhere different each run, then step through them.
  const tipEl = el.querySelector('.sp-tip-text');
  let tip = Math.floor(Math.random() * TIPS.length);
  const showTip = () => {
    tipEl.classList.remove('in');
    void tipEl.offsetWidth;
    tipEl.innerHTML = TIPS[tip];
    tipEl.classList.add('in');
    tip = (tip + 1) % TIPS.length;
  };
  showTip();
  const tipTimer = setInterval(showTip, TIP_MS);

  // The grid: one cell at a time is handed to another guild (or emptied), like a plan being reworked.
  const cells = [...el.querySelectorAll('.sp-cell')];
  const cellTimer = reduce
    ? null
    : setInterval(() => {
        const c = cells[Math.floor(Math.random() * cells.length)];
        const on = Math.random() < 0.8;
        if (on) c.style.setProperty('--c', pick());
        c.classList.toggle('on', on);
        c.classList.remove('pop');
        void c.offsetWidth;
        c.classList.add('pop');
      }, CELL_MS);

  const stopBtn = el.querySelector('.sp-stop');
  stopBtn.addEventListener('click', () => {
    stopBtn.disabled = true;
    onStop();
  });

  return {
    tick(sec) {
      el.querySelector('.sp-time').textContent = fmt(sec);
    },
    phase(text) {
      el.querySelector('.sp-phase').textContent = text;
    },
    close() {
      clearInterval(tipTimer);
      clearInterval(cellTimer);
      el.classList.remove('open');
      setTimeout(() => el.remove(), 250);
    },
  };
}
