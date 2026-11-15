// js/solve-panel.js
// The panel shown while Auto-Optimize runs: one of the ghouls (a different one each run) doing the
// paperwork at a counter whose top is a little planning grid that keeps changing color, how long it has
// been running, what the solver is working on, a tip that changes every few seconds, and a Stop button.
// When a run finishes, another ghoul shows off their special move for a moment before it closes.
// The solver can't say how far along it is, so there is deliberately no progress bar.

import { esc } from './ui.js';
import { icon } from './icons.js';
import { ghoulHTML, repickGhoul } from './ghouls.js';

const TIP_MS = 7000;
const WIN_MS = 3200; // how long the finished panel stays: about one battle animation
const CELL_MS = 320;

// The desk: like the ones the ghouls work at in the game, drawn at the same angle as the paper in the
// animations, in the theme's colors, with a little planning grid on top. Each working animation comes in
// two layers (images/ghouls/working/<name>-back.webp: body, coat and legs; <name>.webp: arms, head,
// paper and props), all cropped to the same 273 x 300 frame, and the desk goes between them, so the
// ghoul sits behind it, legs hidden, with the whole paper and stamp on top.
// Px in that frame, from the skeleton: the paper's left corner (L), along its back edge (A), along its
// front edge (B). The desk is given in those units: s across its depth, t along its length.
const L = [33.6, 228.0];
const A = [78.7, -39.4];
const B = [62.0, 31.9];
const [S0, S1] = [-0.4, 1.12]; // front and back edges
const [T0, T1] = [-0.6, 2.6]; // the two ends
const HEIGHT = 66; // the front panel, in px
const VIEW = { x: -45, y: 0, w: 335, h: 398 }; // the drawing's frame: the ghoul's, plus room for the desk
const ROWS = 4;
const COLS = 12;
const at = (s, t) => [L[0] + A[0] * s + B[0] * t, L[1] + A[1] * s + B[1] * t];
const pts = list => list.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const down = (p, k) => [p[0], p[1] + k];
const face = (p, q, cls) => `<polygon class="${cls}" points="${pts([p, q, down(q, HEIGHT), down(p, HEIGHT)])}"/>`;

function deskSVG(pick) {
  const fl = at(S0, T0); // the far end of the front edge
  const fr = at(S0, T1); // the near corner
  const br = at(S1, T1); // the right end's back corner
  const lerp = (u, k) => [fl[0] + (fr[0] - fl[0]) * u, fl[1] + (fr[1] - fl[1]) * u + k];
  // the planning grid: a mat on the top with cells that keep changing hands
  const ms = [S0 + 0.12, S1 - 0.12];
  const mt = [T0 + 0.15, T1 - 0.15];
  let cells = '';
  for (let i = 0; i < COLS; i++)
    for (let j = 0; j < ROWS; j++) {
      const t0 = mt[0] + ((mt[1] - mt[0]) * i) / COLS + 0.015;
      const t1 = mt[0] + ((mt[1] - mt[0]) * (i + 1)) / COLS - 0.015;
      const s0 = ms[0] + ((ms[1] - ms[0]) * j) / ROWS + 0.025;
      const s1 = ms[0] + ((ms[1] - ms[0]) * (j + 1)) / ROWS - 0.025;
      const on = Math.random() < 0.7;
      cells += `<polygon class="sp-cell${on ? ' on' : ''}" points="${pts([at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)])}" style="--c:${pick()}"/>`;
    }
  return `<svg class="sp-counter" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" aria-hidden="true">
    ${face(fl, fr, 'sp-counter-front')}
    <polygon class="sp-counter-panel" points="${pts([lerp(0.04, 8), lerp(0.96, 8), lerp(0.96, HEIGHT - 9), lerp(0.04, HEIGHT - 9)])}"/>
    <polygon class="sp-counter-kick" points="${pts([down(fl, HEIGHT - 4), down(fr, HEIGHT - 4), down(fr, HEIGHT), down(fl, HEIGHT)])}"/>
    ${face(fr, br, 'sp-counter-end')}
    <polygon class="sp-counter-edge" points="${pts([fl, fr, down(fr, 3), down(fl, 3)])}"/>
    <polygon class="sp-counter-top" points="${pts([fl, at(S1, T0), br, fr])}"/>
    <polygon class="sp-counter-mat" points="${pts([at(ms[0], mt[0]), at(ms[1], mt[0]), at(ms[1], mt[1]), at(ms[0], mt[1])])}"/>
    ${cells}
  </svg>`;
}

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

// colors: the guilds' colors. note: a line about how long it usually takes. phase: what it starts on.
// onStop: Stop clicked.
export function showSolvePanel({ colors = [], note, phase, onStop }) {
  repickGhoul('working');
  const palette = colors.length ? colors : ['#a08cff'];
  const pick = () => palette[Math.floor(Math.random() * palette.length)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'solve-panel';
  el.innerHTML = `
    <div class="sp-art" aria-hidden="true">
      ${ghoulHTML('working', 'sp-ghoul sp-ghoul-back', '-back')}${deskSVG(pick)}${ghoulHTML('working', 'sp-ghoul')}
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
  let tipTimer = setInterval(showTip, TIP_MS);
  // Clicking anywhere on the panel (except Stop) shows the next tip right away.
  let done = null; // set once the plan is ready: a click then closes the panel
  el.addEventListener('click', e => {
    if (done) return done();
    if (e.target.closest('.sp-stop')) return;
    clearInterval(tipTimer);
    showTip();
    tipTimer = setInterval(showTip, TIP_MS);
  });

  // The counter's grid: one cell at a time goes to another guild (or is cleared), like a plan being reworked.
  const cells = [...el.querySelectorAll('.sp-cell')];
  const cellTimer = reduce
    ? null
    : setInterval(() => {
        const c = cells[Math.floor(Math.random() * cells.length)];
        const on = Math.random() < 0.8;
        if (on) c.style.setProperty('--c', pick());
        c.classList.toggle('on', on);
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
    // The plan is ready: a ghoul's special move and the time it took, then the panel closes by itself
    // (or on a click). then() runs once it has closed.
    finish(took, then) {
      clearInterval(tipTimer);
      clearInterval(cellTimer);
      repickGhoul('battle');
      el.classList.add('sp-done');
      el.querySelector('.sp-art').outerHTML = `<div class="sp-win">${ghoulHTML('battle', 'sp-win-ghoul')}</div>`;
      el.querySelector('.sp-title').innerHTML = `Your plan is ready <span class="sp-time">${esc(took)}</span>`;
      el.querySelector('.sp-phase').textContent = 'Not happy with it? Undo puts your old plan back.';
      el.querySelector('.sp-note').textContent = '';
      el.querySelector('.sp-stop').remove();
      let closed = false;
      done = () => {
        if (closed) return;
        closed = true;
        this.close();
        then?.();
      };
      setTimeout(done, WIN_MS);
    },
  };
}
