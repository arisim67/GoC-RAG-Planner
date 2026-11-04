// js/solver/worker.js
import loadHighs from '../../vendor/highs/highs.mjs';

let highsInstance = null;

// HiGHS prints its progress log to stdout/stderr; forward every line to the main thread
// so it shows up in the normal page console (see js/app.js) instead of a hidden worker context.
const sendLog = (text) => self.postMessage({ status: 'log', text });

async function initSolver() {
  if (!highsInstance) {
    highsInstance = await loadHighs({
      locateFile: (file) => new URL('../../vendor/highs/' + file, import.meta.url).href,
      print: sendLog,
      printErr: sendLog
    });
  }
  return highsInstance;
}

self.onmessage = async function(e) {
  const { type, payload, options } = e.data;
  
  if (type === 'SOLVE') {
    let model = null;
    try {
      const solver = await initSolver();
      
      model = solver.createModel();
      
      // SMART SCALING: Detect GoC based on the mathematical size of the matrix
      const numVars = payload.colCost ? payload.colCost.length : 0;
      const isMassiveMap = numVars > 3000; 

      // Game of Claws solves (options given) log their progress to the page console; Ragnarok stays silent as before.
      model.options.set("output_flag", !!options);
      model.options.set("log_to_console", !!options);

      if (options) {
        // Explicit settings from the caller (used by the rolling-horizon windows)
        model.options.set("time_limit", options.timeLimit ?? 120.0);
        model.options.set("mip_rel_gap", 0);
        model.options.set("mip_abs_gap", options.absGap ?? 6000);
        model.options.set("mip_heuristic_effort", options.heuristicEffort ?? 0.3);
      } else if (isMassiveMap) {
        // GoC mode. The objective is dominated by the constant-ish -pts*10000 town reward,
        // so a RELATIVE gap is meaningless (3% = dozens of points of imbalance).
        // Use an ABSOLUTE gap of ~1 point of imbalance (6000) instead.
        model.options.set("time_limit", 3600.0);
        model.options.set("mip_rel_gap", 0);
        model.options.set("mip_abs_gap", 6000);
        model.options.set("mip_heuristic_effort", 0.2);
        model.options.set("mip_detect_symmetry", "on");
      } else {
        // Ragnarok Perfection Mode: 60 Seconds, 0.5% Gap. Forces absolute perfect point/dorm distribution.
        model.options.set("time_limit", 60.0);    
        model.options.set("mip_rel_gap", 0.005);
      }
      
      model.passModel(payload);

      // A plan to start from (Game of Claws clean-up windows). HiGHS verifies it and quietly ignores
      // anything that does not fit the model, so a bad start can only cost time, never correctness.
      if (options && options.warmStart) {
        try { model.setSolution({ colValue: options.warmStart }); }
        catch (err) { sendLog(`warm start ignored: ${err}`); }
      }

      const runStatus = model.run();
      const statuses = solver.constants.modelStatus;
      
      if (runStatus.modelStatus !== statuses.optimal && runStatus.modelStatus !== statuses.timeLimit) {
         throw new Error(`Solver failed to find a valid plan. (Status Code: ${runStatus.modelStatus})`);
      }

      const { colValue } = model.getSolution();
      
      // CATCH SILENT TIMEOUTS
      let foundAssignment = false;
      if (colValue) {
        for (let i = 0; i < colValue.length; i++) {
          if (colValue[i] > 0.5) { foundAssignment = true; break; }
        }
      }
      
      if (!foundAssignment) {
        const timeStr = options ? `${options.timeLimit ?? 120}-second` : (isMassiveMap ? "1-hour" : "60-second");
        throw new Error(`Solver hit the ${timeStr} time limit without finding a valid plan.`);
      }

      self.postMessage({ status: 'success', result: colValue });

    } catch (err) {
      self.postMessage({ status: 'error', error: err.toString() });
    } finally {
      // Free WASM memory on every path (success or error).
      if (model) { try { model.dispose(); } catch (_) {} }
    }
  }
};