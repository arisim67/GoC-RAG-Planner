// milp.js

export class MilpBuilder {
  constructor() {
    this.names = [];
    this.cost = [];
    this.lower = [];
    this.upper = [];
    this.integer = [];
    this.rows = [];
  }

  variable(name, { lower, upper, isInteger, cost }) {
  if (!Number.isFinite(cost) || Number.isNaN(lower) || Number.isNaN(upper) || lower > upper) {
    throw new Error(`Bad variable ${name}: [${lower}, ${upper}] cost=${cost}`);
  }
    const col = this.names.length;
    this.names.push(name);
    this.cost.push(cost);
    this.lower.push(lower);
    this.upper.push(upper);
    this.integer.push(isInteger);
    return { col };
  }

  binary(name, cost = 0) {
    return this.variable(name, { lower: 0, upper: 1, isInteger: true, cost });
  }

  continuous(name, lower, upper, cost = 0) {
    return this.variable(name, { lower, upper, isInteger: false, cost });
  }

  addCost(v, cost) {
    if (typeof v !== 'number') {
      this.cost[v.col] += cost;
    }
  }

  constrain(terms, lower, upper) {
  if (Number.isNaN(lower) || Number.isNaN(upper)) throw new Error('NaN bound in constraint');
  for (const [k] of terms) {
    if (!Number.isFinite(k)) throw new Error(`Non-finite coefficient: ${k}`);
  }
    const merged = new Map();
    let constant = 0;
    
    for (const [k, v] of terms) {
      if (typeof v === 'number') {
        constant += k * v;
      } else {
        merged.set(v.col, (merged.get(v.col) || 0) + k);
      }
    }

    for (const [col, k] of merged) {
      if (k === 0) merged.delete(col);
    }

    lower -= constant;
    upper -= constant;
    
    if (merged.size === 0) {
      if (lower > 1e-9 || upper < -1e-9) {
        throw new Error(`Constant constraint cannot hold: ${lower} <= 0 <= ${upper}`);
      }
      return;
    }

    this.rows.push({
      cols: [...merged.keys()],
      coefs: [...merged.values()],
      lower,
      upper,
    });
  }

  atMost(terms, upper) {
    this.constrain(terms, -Infinity, upper);
  }

  atLeast(terms, lower) {
    this.constrain(terms, lower, Infinity);
  }

  equal(terms, value) {
    this.constrain(terms, value, value);
  }

  get columnCount() {
    return this.names.length;
  }

  toArrays() {
    const numCols = this.columnCount;
    const numRows = this.rows.length;
    
    // 1. Calculate how many items are in each column
    const colCounts = new Int32Array(numCols);
    let nnz = 0;
    for (const row of this.rows) {
      for (const col of row.cols) {
        colCounts[col]++;
        nnz++;
      }
    }

    // 2. Create the CSC (Compressed Sparse Column) pointers
    const start = new Int32Array(numCols + 1);
    for (let i = 0; i < numCols; i++) {
      start[i + 1] = start[i] + colCounts[i];
    }

    // 3. Populate the column-major indices and values
    const index = new Int32Array(nnz);
    const value = new Float64Array(nnz);
    
    // Keep a running tracker of where we are in each column
    const currentPos = new Int32Array(start);

    for (let r = 0; r < numRows; r++) {
      const row = this.rows[r];
      for (let j = 0; j < row.cols.length; j++) {
        const c = row.cols[j];
        const val = row.coefs[j];
        
        const pos = currentPos[c]++;
        index[pos] = r;
        value[pos] = val;
      }
    }

    // 4. Return the exact schema, using Array.from() to ensure standard arrays
    return {
      numCols,
      numRows,
      colCost: Array.from(this.cost),
      colLower: Array.from(this.lower),
      colUpper: Array.from(this.upper),
      rowLower: this.rows.map(r => r.lower),
      rowUpper: this.rows.map(r => r.upper),
      integrality: this.integer.map(i => (i ? 1 : 0)),
      matrix: {
        format: 'csc',
        numRows,
        numCols,
        starts: Array.from(start),
        indices: Array.from(index),
        values: Array.from(value),
      },
    };
  }
}