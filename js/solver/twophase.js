// twophase.js  (Game of Claws only)
// GoC planning in two phases, the way it is done by hand:
//   Phase 1: decide who holds Darkwick and every dorm on which day, together with the lv1 "path" towns
//            each guild needs to be able to reach them. Solved a few days at a time WITH LOOKAHEAD, because
//            a Darkwick capture needs a neighbouring town held the day before.
//   Phase 2: Darkwick, dorms and the path towns are locked. All remaining lv1 towns are handed out over the
//            whole event in ONE solve, to even out total points. Phase 2 is quick, so it is tried with a few
//            different (equally valid) sets of locked paths and the most even result is kept.
//   Clean-up: if Darkwick or dorms still are not perfectly even, a few days at a time are re-solved with
//            everything else fixed (before phase 2). After phase 2, the lv1 towns are re-solved a few days at a
//            time to even out points further. Every candidate must pass checkPlan() and improve things to be kept.
import { buildModel, getPerfectTargets } from './model_goc.js';
import { extractPathCells } from './paths.js';
import { checkPlan } from './check.js';

export const TWO_PHASE_DEFAULTS = {
  commitDays: 4,        // phase 1: days committed per window
  lookahead: 4,         // phase 1: extra days solved (not committed) so a window sees what comes next
  phase1TimeLimit: 200, // seconds per phase 1 window (best plan found so far is used if it is hit)
  phase1Gap: 500,       // stop a window when provably within this many objective units (~1 point = 6000)
  phase2TimeLimit: 120, // seconds per phase 2 attempt
  phase2Gap: 500,
  phase2Attempts: 1,    // different locked-path sets to try (stops early once points are perfectly even)
  phase2Budget: 240,    // seconds in total for phase 2
  repairWindow: 7,      // clean-up: days re-solved at a time when Darkwick / dorms are not even
  repairTimeLimit: 60,  // seconds per repair window
  repairBudget: 180,    // seconds in total for the Darkwick / dorm clean-up
  refineWindows: [5, 8, 11], // clean-up: days re-solved at a time to even out points
  refineTimeLimit: 40,  // seconds per refine window
  refineBudget: 150,    // seconds in total for the points clean-up
};

export function numDays(srv) {
  if (!srv.endDate || !srv.startDate) return srv.mode === 'goc' ? 12 : 6;
  const ms = new Date(srv.endDate) - new Date(srv.startDate);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Total distance of every guild's map points from its target (0 = perfectly even)
export function pointsDeviation(plan, srv, mapData, FULL, target) {
  const val = { lv3: 3, lv2: 2, lv1: 1 };
  let dev = 0;
  for (const g of srv.guilds) {
    const t = target[g.id];
    if (!t) continue;
    let pts = 0;
    for (let d = 1; d <= FULL; d++) for (const k of mapData.kingdoms) if (plan[d][k.id] === g.id) pts += val[k.type] || 0;
    dev += Math.abs(pts - t.mapPts);
  }
  return dev;
}

// runSolver(matrixArrays, { timeLimit, absGap }) -> Promise<Float64Array|number[]>
export async function solveGocPhase1(srv, mapData, runSolver, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const work = { ...srv, plan: JSON.parse(JSON.stringify(srv.plan)) };   // user's own placements stay locked
  const nWin = Math.ceil(FULL / o.commitDays);
  let ws = 1;
  for (let w = 0; w < nWin; w++) {
    const size = Math.floor(FULL / nWin) + (w < FULL % nWin ? 1 : 0);
    const we = ws + size - 1;
    const he = Math.min(FULL, we + o.lookahead);
    onProgress(`Phase 1/2 · Darkwick & dorms · window ${w + 1}/${nWin} (days ${ws}-${we})`);
    const { milp, decode } = buildModel(work, mapData, { winStart: ws, winEnd: he, phase: 'scarce' });
    const result = await runSolver(milp.toArrays(), { timeLimit: o.phase1TimeLimit, absGap: o.phase1Gap });
    const decoded = decode(result);
    for (let d = ws; d <= we; d++) work.plan[d] = decoded[d];
    ws = we + 1;
  }
  return work.plan;
}

export async function solveGocPhase2(srv, mapData, runSolver, phase1Plan, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const locks = JSON.parse(JSON.stringify(srv.plan));
  const target = getPerfectTargets(srv, mapData);

  const plan2 = { 0: { ...(srv.plan[0] || {}) } };
  for (let d = 1; d <= FULL; d++) {
    plan2[d] = {};
    for (const k of mapData.kingdoms) if (k.type !== 'lv1') plan2[d][k.id] = phase1Plan[d][k.id] || '';
  }
  const work2 = { ...srv, plan: plan2 };

  let best = null, bestDev = Infinity;
  const t0 = Date.now();
  for (let a = 0; a < o.phase2Attempts; a++) {
    if (a > 0 && (Date.now() - t0) / 1000 > o.phase2Budget) break;
    onProgress(`Phase 2/2 · balancing points with lv1 towns · try ${a + 1}/${o.phase2Attempts}` + (best ? ` (best so far: ${bestDev} off)` : ''));
    try {
      const pathCells = extractPathCells(phase1Plan, srv, mapData, FULL, a === 0 ? null : mulberry32(1000 + a));
      const { milp, decode } = buildModel(work2, mapData, { phase: 'lv1', pathCells, locks });
      const result = await runSolver(milp.toArrays(), { timeLimit: o.phase2TimeLimit, absGap: o.phase2Gap });
      const plan = decode(result);
      const dev = pointsDeviation(plan, srv, mapData, FULL, target);
      if (dev < bestDev) { best = plan; bestDev = dev; }
      if (bestDev === 0) break;
    } catch (e) {
      console.warn(`[TwoPhase] phase 2 try ${a + 1} failed: ${e.message}`);
      if (a === 0 && !best) throw e;   // nothing usable yet: report the failure
    }
  }
  return best;
}

// Total distance of every guild's Darkwick and dorm counts from its target (0 = perfectly even)
export function scarceDeviation(plan, srv, mapData, FULL, target) {
  let dev = 0;
  for (const g of srv.guilds) {
    const t = target[g.id];
    if (!t) continue;
    let lv3 = 0, lv2 = 0;
    for (let d = 1; d <= FULL; d++) for (const k of mapData.kingdoms) {
      if (plan[d][k.id] === g.id) { if (k.type === 'lv3') lv3++; if (k.type === 'lv2') lv2++; }
    }
    dev += Math.abs(lv3 - t.mapLv3) + Math.abs(lv2 - t.mapLv2);
  }
  return dev;
}

function windowStarts(FULL, K, stride) {
  if (K >= FULL) return [1];
  const starts = [];
  for (let ws = 1; ws + K - 1 <= FULL; ws += stride) starts.push(ws);
  if (starts[starts.length - 1] !== FULL - K + 1) starts.push(FULL - K + 1);
  return starts;
}

// Darkwick / dorm clean-up. phase1Plan: the plan from phase 1. Returns the best legal plan found.
export async function repairScarce(srv, mapData, runSolver, phase1Plan, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData);
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = phase1Plan;
  let dev = scarceDeviation(plan, srv, mapData, FULL, target);
  if (dev === 0) return plan;
  const t0 = Date.now();
  const K = Math.min(o.repairWindow, FULL);
  for (let pass = 1; pass <= 2 && dev > 0; pass++) {
    let improved = false;
    for (const ws of windowStarts(FULL, K, 1)) {
      if ((Date.now() - t0) / 1000 > o.repairBudget || dev === 0) break;
      const we = ws + K - 1;
      onProgress(`Clean-up · Darkwick & dorms · days ${ws}-${we} (${dev} off)`);
      try {
        const work = { ...srv, plan: JSON.parse(JSON.stringify(plan)) };
        for (let d = ws; d <= we; d++) work.plan[d] = {};
        const { milp, decode } = buildModel(work, mapData, { winStart: ws, winEnd: we, repair: true, phase: 'scarce', locks });
        const result = await runSolver(milp.toArrays(), { timeLimit: o.repairTimeLimit, absGap: o.phase1Gap });
        const dec = decode(result);
        const cand = JSON.parse(JSON.stringify(plan));
        for (let d = ws; d <= we; d++) cand[d] = dec[d];
        const d2 = scarceDeviation(cand, srv, mapData, FULL, target);
        if (d2 < dev && checkPlan(cand, srv, mapData, FULL, locks).length === 0) { plan = cand; dev = d2; improved = true; }
      } catch (e) { console.warn(`[TwoPhase] repair window ${ws}-${we} skipped: ${e.message}`); }
    }
    if (!improved) break;
  }
  return plan;
}

// Points clean-up. Darkwick, dorms and every other plan row stay as they are; only Lv1 towns are re-solved,
// a few days at a time, and a result is kept only if it is legal and brings the points closer to even.
export async function refinePoints(srv, mapData, runSolver, plan0, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData);
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = plan0;
  let dev = pointsDeviation(plan, srv, mapData, FULL, target);
  if (dev === 0) return plan;
  const t0 = Date.now();
  for (const K0 of o.refineWindows) {
    const K = Math.min(K0, FULL);
    for (const ws of windowStarts(FULL, K, 2)) {
      if ((Date.now() - t0) / 1000 > o.refineBudget || dev === 0) return plan;
      const we = ws + K - 1;
      onProgress(`Clean-up · points · days ${ws}-${we} (${dev} off)`);
      try {
        const work = { ...srv, plan: JSON.parse(JSON.stringify(plan)) };
        for (let d = ws; d <= we; d++) for (const k of mapData.kingdoms) if (k.type === 'lv1') work.plan[d][k.id] = '';
        const { milp, decode } = buildModel(work, mapData, { winStart: ws, winEnd: we, repair: true, phase: 'lv1', locks });
        const result = await runSolver(milp.toArrays(), { timeLimit: o.refineTimeLimit, absGap: o.phase2Gap });
        const dec = decode(result);
        const cand = JSON.parse(JSON.stringify(plan));
        for (let d = ws; d <= we; d++) cand[d] = dec[d];
        const d2 = pointsDeviation(cand, srv, mapData, FULL, target);
        if (d2 < dev && checkPlan(cand, srv, mapData, FULL, locks).length === 0) { plan = cand; dev = d2; }
      } catch (e) { console.warn(`[TwoPhase] refine window ${ws}-${we} skipped: ${e.message}`); }
    }
    if (K >= FULL) break;
  }
  return plan;
}

// Phases after phase 1: Darkwick / dorm clean-up, phase 2, points clean-up, final legality check.
export async function solveGocFinish(srv, mapData, runSolver, phase1Plan, userOpts = {}) {
  const FULL = numDays(srv);
  const locks = JSON.parse(JSON.stringify(srv.plan));
  const repaired = await repairScarce(srv, mapData, runSolver, phase1Plan, userOpts);
  const phase2 = await solveGocPhase2(srv, mapData, runSolver, repaired, userOpts);
  const plan = await refinePoints(srv, mapData, runSolver, phase2, userOpts);
  const problems = checkPlan(plan, srv, mapData, FULL, locks);
  if (problems.length) throw new Error('The optimizer could not build a legal plan this time. Please try again.');
  return plan;
}

export async function solveGoc(srv, mapData, runSolver, userOpts = {}) {
  const phase1Plan = await solveGocPhase1(srv, mapData, runSolver, userOpts);
  return solveGocFinish(srv, mapData, runSolver, phase1Plan, userOpts);
}