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
    phase: srv.mode === 'goc' ? 'Getting started…' : 'Working out the whole route…',
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
      // RAGNAROK: the original single-solve model (model_ragnarok.js), unchanged.
      // 2. Generate the algebraic matrix and decoder
      console.time('Matrix Generation');
      const { milp, decode } = buildModel(srv, mapData);
      const matrixArrays = milp.toArrays();
      console.timeEnd('Matrix Generation');

      console.log(`Generated ${matrixArrays.numRows} constraints and ${matrixArrays.numCols} binary variables.`);

      // 3. Send to Web Worker to run the Wasm Branch-and-Bound algorithm
      console.time('Wasm Solve Time');
      const result = await runHighsSolver(matrixArrays);
      console.timeEnd('Wasm Solve Time');

      // 4. Decode the binary output array back into town assignments
      srv.plan = decode(result);
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
    const took = sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    showToast(`✓ Plan found in ${took}. Not happy with it? Undo puts your old plan back.`, false, 5000);
  } catch (err) {
    if (err instanceof Stopped) {
      showToast('Auto-Optimize stopped. Your plan is just as it was.', false, 4000);
    } else {
      console.error('Optimizer crashed:', err);
      showToast(err.message || 'Solver encountered an error.', true);
    }
  } finally {
    // Always stop the elapsed-time counter and close the panel, whether the solve worked or not
    clearInterval(optTimer);
    panel.close();
    running = false;
  }
}
