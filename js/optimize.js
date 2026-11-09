// js/optimize.js
// ⚡ Auto-Optimize: runs the HiGHS solver in a Web Worker (Ragnarok single solve, GoC two-phase).

import { activeSrv, save } from './state.js';
import { showToast } from './ui.js';
import { renderAll } from './render.js';
import { getMapData } from './maps/index.js';
import { buildModel } from './solver/model_ragnarok.js';
import { setBtnLabel } from './icons.js';

const solverWorker = new Worker(new URL('./solver/worker.js', import.meta.url), { type: 'module' });

// HiGHS log forwarding: lines are printed to the console and kept in window.highsLog.
// In DevTools, run  copy(window.highsLog.join('\n'))  to copy the whole log.
window.highsLog = [];
solverWorker.addEventListener('message', e => {
  if (e.data && e.data.status === 'log') {
    window.highsLog.push(e.data.text);
    console.log('[HiGHS]', e.data.text);
  }
});

// A helper function to turn the Worker's message events into a clean async Promise
function runHighsSolver(matrixData, options) {
  return new Promise((resolve, reject) => {
    const handler = e => {
      if (e.data.status === 'success') {
        solverWorker.removeEventListener('message', handler);
        resolve(e.data.result);
      } else if (e.data.status === 'error') {
        solverWorker.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };
    solverWorker.addEventListener('message', handler);
    solverWorker.postMessage({ type: 'SOLVE', payload: matrixData, options });
  });
}

export function undoOptimize() {
  const s = activeSrv();
  if (!s || !s.undoPlan) return;
  s.plan = JSON.parse(JSON.stringify(s.undoPlan));
  delete s.undoPlan;
  save();
  renderAll();
}

export async function autoOptimize() {
  let sec = 0;
  let optTimer;
  let currentLabel = 'Finding Optimal Plan';
  const srv = activeSrv();
  if (!srv) return;

  // Game of Claws plans are solved in several steps and take a while: let the user know up front. How
  // long is driven mostly by the number of guilds, and much more steeply than one to one, so the
  // estimate follows the guild count instead of quoting one range that is far too long for most events.
  if (srv.mode === 'goc') {
    const est = (srv.guilds || []).length <= 11 ? 'around 1-5 minutes' : 'up to around 10 minutes';
    showToast(
      `Game of Claws plans take ${est} to optimize. Please keep this browser open until it finishes.`,
      false,
      10000,
    );
  }

  const btn = document.getElementById('opt-btn'); // Use your actual button ID here
  let originalText = 'Auto-Optimize'; // Fallback text

  if (btn) {
    originalText = setBtnLabel(btn, 'Finding Optimal Plan... (0s)'); // keeps the icon
    btn.style.pointerEvents = 'none';
    optTimer = setInterval(() => {
      sec++;
      setBtnLabel(btn, `${currentLabel}... (${sec}s)`);
    }, 1000);
  }

  try {
    // 1. Snapshot for the undo button
    srv.undoPlan = JSON.parse(JSON.stringify(srv.plan));
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
      // Progress goes to the console only; the button keeps showing "Finding Optimal Plan... (Ns)".
      const onProgress = label => console.log(`[TwoPhase] ${label}`);
      // Loaded on demand: if twophase.js / paths.js are missing from the site, only Auto-Optimize fails, not the whole page.
      const { solveGoc } = await import('./solver/twophase.js');
      srv.plan = await solveGoc(srv, mapData, runHighsSolver, { onProgress });
    }

    srv.lastSolveTime = sec;

    save();
    renderAll();

    if (btn) {
      setBtnLabel(btn, '✓ Perfect Plan Found');
      btn.style.color = 'var(--green)';
    }
  } catch (err) {
    console.error('Optimizer crashed:', err);
    // Replace alert() with our new in-app toast
    showToast(err.message || 'Solver encountered an error.', true);
    if (btn) {
      setBtnLabel(btn, 'Failed');
      btn.style.color = 'var(--red)';
    }
  } finally {
    // 🚨 GUARANTEE TIMER STOPS
    clearInterval(optTimer);

    if (btn) {
      setTimeout(() => {
        setBtnLabel(btn, originalText);
        btn.style.pointerEvents = 'auto'; // Restore clickability
        btn.style.color = '';
      }, 3000);
    }
  }
}
