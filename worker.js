// worker.js
import loadHighs from './solver/node_modules/highs/build/highs.mjs';

let highsInstance = null;

async function initSolver() {
  if (!highsInstance) {
    highsInstance = await loadHighs({
      locateFile: (file) => './solver/node_modules/highs/build/' + file
    });
  }
  return highsInstance;
}

self.onmessage = async function(e) {
  const { type, payload } = e.data;
  
  if (type === 'SOLVE') {
    try {
      const solver = await initSolver();
      
      const model = solver.createModel();
      model.options.set("output_flag", false);
      
      // 🚨 SMART SCALING: Detect GoC based on the mathematical size of the matrix
      const numVars = payload.colCost ? payload.colCost.length : 0;
      const isMassiveMap = numVars > 3000; 

      if (isMassiveMap) {
        // GoC Survival Mode: 2 Minutes, 5% Gap. Focuses on finding a valid, legal map layout.
        model.options.set("time_limit", 120.0);    
        model.options.set("mip_rel_gap", 0.05); 
      } else {
        // Ragnarok Perfection Mode: 60 Seconds, 0.5% Gap. Forces perfect point/dorm distribution.
        model.options.set("time_limit", 60.0);    
        model.options.set("mip_rel_gap", 0.005);
      }
      
      model.passModel(payload);
      
      const runStatus = model.run();
      const statuses = solver.constants.modelStatus;
      
      if (runStatus.modelStatus !== statuses.optimal && runStatus.modelStatus !== statuses.timeLimit) {
         throw new Error(`Solver failed to find a valid plan. (Status Code: ${runStatus.modelStatus})`);
      }

      const { colValue } = model.getSolution();
      
      let foundAssignment = false;
      if (colValue) {
        for (let i = 0; i < colValue.length; i++) {
          if (colValue[i] > 0.5) { foundAssignment = true; break; }
        }
      }
      
      if (!foundAssignment) {
        const timeStr = isMassiveMap ? "120-second" : "60-second";
        throw new Error(`Solver hit the ${timeStr} time limit without finding a perfect plan. Try manually locking a few Day 1 towns to help jumpstart the math.`);
      }

      model.dispose();

      self.postMessage({ status: 'success', result: colValue });

    } catch (err) {
      self.postMessage({ status: 'error', error: err.toString() });
    }
  }
};