// js/optimize.js
// ⚡ Auto-Optimize: runs the HiGHS solver in a Web Worker (Ragnarok single solve, GoC two-phase).

import { activeSrv, save } from './state.js';
import { showToast } from './ui.js';
import { renderAll } from './render.js';
import { getMapData } from './maps/index.js';
import { buildModel } from './solver/model_ragnarok.js';
import { recordChange, setOptimizedBase } from './history.js';
import { takeVersion } from './versions.js';
import { showSolvePanel, phaseText } from './solve-panel.js';

// HiGHS log forwarding: lines are printed to the console and kept in window.highsLog.
// In DevTools, run  copy(window.highsLog.join('\n'))  to copy the whole log.
window.highsLog = [];
function makeWorker() {
  const w = new Worker(new URL('./solver/worker.js', import.meta.url), { type: 'module' });
  w.addEventListener('message', e => {
    if (e.data && e.data.status === 'log') {
      window.highsLog.push(e.data.text);
      console.log('[HiGHS]', e.data.text);
    }
  });
  return w;
}
let solverWorker = makeWorker();

// Stop: the solver can't be interrupted mid-solve, so its worker is shut down and a fresh one started.
class Stopped extends Error {}
let stopped = false;
let rejectPending = null;

function stopOptimize() {
  stopped = true;
  solverWorker.terminate();
  solverWorker = makeWorker();
  if (rejectPending) rejectPending(new Stopped());
}

// A helper function to turn the Worker's message events into a clean async Promise
function runHighsSolver(matrixData, options) {
  if (stopped) return Promise.reject(new Stopped()); // Stop came between two solves
  const worker = solverWorker;
  return new Promise((resolve, reject) => {
    const handler = e => {
      if (e.data.status === 'success') {
        worker.removeEventListener('message', handler);
        rejectPending = null;
        resolve(e.data.result);
      } else if (e.data.status === 'error') {
        worker.removeEventListener('message', handler);
        rejectPending = null;
        reject(new Error(e.data.error));
      }
    };
    rejectPending = reject;
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'SOLVE', payload: matrixData, options });
  });
}

let running = false;
let runs = 0; // finished runs this visit (the tutorial waits for one)

// For the tutorial: whether a run is going, and how many have finished.
export const optimizeStatus = () => ({ running, runs });

export async function autoOptimize() {
  let sec = 0;
  const srv = activeSrv();
  if (!srv) return;
  if (running) {
    showToast('Auto-Optimize is already running: see the panel in the corner.', false, 3000);
    return;
  }
  running = true;
  stopped = false;
  let took = null; // set when a plan comes back

  // Game of Claws plans are solved in several steps and take a while: say so up front. How long is
  // driven mostly by the number of guilds, and much more steeply than one to one, so the estimate
  // follows the guild count instead of quoting one range that is far too long for most events.
  const est =
    srv.mode !== 'goc'
      ? 'Usually under a minute.'
      : (srv.guilds || []).length <= 11
        ? 'Usually around 1–5 minutes.'
        : 'Can take up to around 10 minutes.';
  const panel = showSolvePanel({
    colors: (srv.guilds || []).map(g => g.color).filter(Boolean),
    note: `${est} Keep this tab open until it finishes.`,
    phase: srv.mode === 'goc' ? 'Getting started…' : 'Sharing out the towns fairly…',
    onStop: stopOptimize,
  });

  // The panel shows the progress, so the button itself stays as it is.
  const optTimer = setInterval(() => {
    sec++;
    panel.tick(sec);
  }, 1000);

  try {
    // 1. Remember the plan as it was, so the optimize can be undone
    takeVersion(srv, 'Before Auto-Optimize');
    const before = JSON.parse(JSON.stringify(srv.plan));
    const mapData = getMapData(srv.mode, srv.mapKey);

    if (srv.mode !== 'goc') {
      // RAGNAROK: model_ragnarok.js, in two passes (see buildModel there).
      // Pass 1 makes the spread fair; it stops as soon as it is, so the plan may still have extra moves.
      const fair = buildModel(srv, mapData);
      const first = await runHighsSolver(fair.milp.toArrays(), { quiet: true, timeLimit: 60, relGap: 0.005 });

      // Pass 2 keeps every guild's totals exactly as pass 1 left them and only cuts moves. It starts from
      // pass 1's plan (slacks at 0, since the totals now match exactly), so it can only make it tidier;
      // the time limit just decides how much tidier. In tests on all three maps it had the fewest moves
      // by 8 seconds every time (another 30 seconds never found a better plan).
      panel.phase('Cutting out extra moves…');
      const tidy = buildModel(srv, mapData, { fixed: fair.totals(first) });
      const start = Array.from(first);
      for (const v of tidy.slacks) start[v.col] = 0;
      let result = first;
      try {
        result = await runHighsSolver(tidy.milp.toArrays(), {
          quiet: true,
          timeLimit: 8,
          absGap: 50,
          warmStart: start,
        });
      } catch (err) {
        if (err instanceof Stopped) throw err;
        console.warn('Tidy pass failed; keeping the fair plan', err);
      }
      srv.plan = tidy.decode(result);
    } else {
      // GAME OF CLAWS: its own two-phase method (model_goc.js + twophase.js).
      // Phase 1 = Darkwick + dorms (+ the lv1 paths to reach them), phase 2 = lv1 towns for points.
      // Progress goes to the console and to the panel's "what it's working on" line.
      const onProgress = label => {
        console.log(`[TwoPhase] ${label}`);
        panel.phase(phaseText(label));
      };
      // Loaded on demand: if twophase.js / paths.js are missing from the site, only Auto-Optimize fails, not the whole page.
      const { solveGoc } = await import('./solver/twophase.js');
      srv.plan = await solveGoc(srv, mapData, runHighsSolver, { onProgress });
    }

    srv.lastSolveTime = sec;
    runs++;
    recordChange(srv, 'Auto-Optimize', { plan: before, optimize: true });
    setOptimizedBase(srv);

    save();
    renderAll();
    took = sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  } catch (err) {
    if (err instanceof Stopped) {
      showToast('Auto-Optimize stopped. Your plan is just as it was.', false, 4000);
    } else {
      console.error('Optimizer crashed:', err);
      showToast(err.message || 'Solver encountered an error.', true, 5000, 'sorry');
    }
  } finally {
    // Always stop the elapsed-time counter. A finished run gets a moment of celebration before the panel
    // closes (it says how long it took and that Undo puts the old plan back); a stopped or failed one
    // closes it straight away.
    clearInterval(optTimer);
    if (took) panel.finish(took);
    else panel.close();
    running = false;
  }
}
