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
  
  if (type === 'INIT_TEST') {
    try {
      const solver = await initSolver();
      self.postMessage({ 
        status: 'success', 
        message: 'HiGHS Wasm is alive and ready to crunch numbers!' 
      });
    } catch (err) {
      self.postMessage({ 
        status: 'error', 
        error: err.toString() 
      });
    }
  }
};