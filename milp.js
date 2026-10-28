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
    const starts = [0];
    const indices = [];
    const values = [];
    
    for (const row of this.rows) {
      indices.push(...row.cols);
      values.push(...row.coefs);
      starts.push(indices.length);
    }

    return {
      numCols: this.columnCount,
      numRows: this.rows.length,
      colCost: Float64Array.from(this.cost),
      colLower: Float64Array.from(this.lower),
      colUpper: Float64Array.from(this.upper),
      rowLower: Float64Array.from(this.rows, r => r.lower),
      rowUpper: Float64Array.from(this.rows, r => r.upper),
      integrality: Int32Array.from(this.integer, i => (i ? 1 : 0)),
      matrix: {
        format: 'csr',
        numRows: this.rows.length,
        numCols: this.columnCount,
        starts: Int32Array.from(starts),
        indices: Int32Array.from(indices),
        values: Float64Array.from(values),
      },
    };
  }
}