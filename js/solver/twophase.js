// twophase.js  (Game of Claws only)
// GoC planning in two phases, the way it is done by hand:
//   Phase 1: decide who holds Darkwick and every dorm on which day, together with the lv1 "path" towns
//            each guild needs to be able to reach them. Solved a few days at a time WITH LOOKAHEAD, because
//            a Darkwick capture needs a neighboring town held the day before.
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
  commitDays: 4, // phase 1: days committed per window
  lookahead: 4, // phase 1: extra days solved (not committed) so a window sees what comes next
  phase1TimeLimit: 200, // seconds per phase 1 window (best plan found so far is used if it is hit)
  phase1Gap: 500, // stop a window when provably within this many objective units (~1 point = 6000)
  phase2TimeLimit: 120, // seconds per phase 2 attempt
  phase2Gap: 500,
  phase2Attempts: 1, // different locked-path sets to try (stops early once points are perfectly even)
  phase2Budget: 240, // seconds in total for phase 2
  repairWindow: 7, // clean-up: days re-solved at a time when Darkwick / dorms are not even
  repairTimeLimit: 60, // seconds per repair window
  repairBudget: 180, // seconds in total for the all-free clean-up. It skips every window with
  // nothing out of place, so it costs this much only while there is work to do.
  castleWindow: 7, // clean-up: days re-solved at a time when only Darkwick is uneven
  castleTimeLimit: 45, // seconds per Darkwick window
  castleBudget: 135, // seconds in total for the Darkwick clean-up
  refineWindows: [5, 8, 11], // clean-up: days re-solved at a time to even out points
  refineTimeLimit: 40, // seconds per refine window
  refineBudget: 300, // seconds in total for the points clean-up (it stops as soon as points are even,
  // so this only matters on the maps that need the time)
};

export function numDays(srv) {
  if (!srv.endDate || !srv.startDate) return srv.mode === 'goc' ? 12 : 6;
  const ms = new Date(srv.endDate) - new Date(srv.startDate);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How much a set of target misses hurts. The cost per point rises, mirroring the solver's own tiered
// penalty (MISS_TIERS in model_goc.js): "one guild 5 points short" is worse than "five guilds 1 point
// short", even though both are 5 points off in total. The clean-up steps compare candidates on this
// instead of the plain total, so a candidate that shares an unavoidable miss out is kept rather than
// rejected for tying on the total.
const MISS_COST_PTS = [1, 1.33, 1.58]; // = MISS_TIERS_PTS / 6000
const MISS_COST_SCARCE = [1, 1.67, 2.5]; // = MISS_TIERS_SCARCE / 6000
function missCost(devs, tiers) {
  let c = 0;
  for (const dev of devs) {
    for (let i = 0; i < dev; i++) c += tiers[Math.min(i, tiers.length - 1)];
  }
  return c;
}

// How far every guild's map points are from its target, one entry per guild (all 0 = perfectly even)
function pointDevs(plan, srv, mapData, FULL, target) {
  const val = { lv3: 3, lv2: 2, lv1: 1 };
  const devs = [];
  for (const g of srv.guilds) {
    const t = target[g.id];
    if (!t) continue;
    let pts = 0;
    for (let d = 1; d <= FULL; d++)
      for (const k of mapData.kingdoms) if (plan[d][k.id] === g.id) pts += val[k.type] || 0;
    devs.push(Math.abs(pts - t.mapPts));
  }
  return devs;
}

// Total distance of every guild's map points from its target (0 = perfectly even). For reporting.
export function pointsDeviation(plan, srv, mapData, FULL, target) {
  return pointDevs(plan, srv, mapData, FULL, target).reduce((a, b) => a + b, 0);
}

// The same misses weighed by missCost(), for comparing two candidate plans.
export function pointsMissCost(plan, srv, mapData, FULL, target) {
  return missCost(pointDevs(plan, srv, mapData, FULL, target), MISS_COST_PTS);
}

// runSolver(matrixArrays, { timeLimit, absGap }) -> Promise<Float64Array|number[]>
export async function solveGocPhase1(srv, mapData, runSolver, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const work = { ...srv, plan: JSON.parse(JSON.stringify(srv.plan)) }; // user's own placements stay locked
  const nWin = Math.ceil(FULL / o.commitDays);
  let ws = 1;
  for (let w = 0; w < nWin; w++) {
    const size = Math.floor(FULL / nWin) + (w < FULL % nWin ? 1 : 0);
    const we = ws + size - 1;
    const he = Math.min(FULL, we + o.lookahead);
    onProgress(`Phase 1/2 · Darkwick & dorms · window ${w + 1}/${nWin} (days ${ws}-${we})`);
    let decoded;
    try {
      const { milp, decode } = buildModel(work, mapData, { winStart: ws, winEnd: he, phase: 'scarce' });
      const result = await runSolver(milp.toArrays(), { timeLimit: o.phase1TimeLimit, absGap: o.phase1Gap });
      decoded = decode(result);
    } catch (e) {
      // "Every guild on the map from day 1" is planning scaffolding, not a rule of the event, and it is the
      // one thing in here that can make a window impossible to satisfy (more guilds than there are towns to
      // stand on, say). Rather than fail the whole solve, drop it to a penalty and ask again: the worst case
      // is a plan where a guild or two start a day late.
      onProgress(`Phase 1/2 · window ${w + 1}/${nWin} has no plan with every guild placed on day 1 · retrying`);
      const { milp, decode } = buildModel(work, mapData, { winStart: ws, winEnd: he, phase: 'scarce', softDay1: true });
      const result = await runSolver(milp.toArrays(), { timeLimit: o.phase1TimeLimit, absGap: o.phase1Gap });
      decoded = decode(result);
    }
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
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });

  const plan2 = { 0: { ...(srv.plan[0] || {}) } };
  for (let d = 1; d <= FULL; d++) {
    plan2[d] = {};
    for (const k of mapData.kingdoms) if (k.type !== 'lv1') plan2[d][k.id] = phase1Plan[d][k.id] || '';
  }
  const work2 = { ...srv, plan: plan2 };

  let best = null,
    bestDev = Infinity,
    bestCost = Infinity;
  const t0 = Date.now();
  for (let a = 0; a < o.phase2Attempts; a++) {
    if (a > 0 && (Date.now() - t0) / 1000 > o.phase2Budget) break;
    onProgress(
      `Phase 2/2 · balancing points with lv1 towns · try ${a + 1}/${o.phase2Attempts}` +
        (best ? ` (best so far: ${bestDev} off)` : ''),
    );
    try {
      const pathCells = extractPathCells(phase1Plan, srv, mapData, FULL, a === 0 ? null : mulberry32(1000 + a));
      const { milp, decode } = buildModel(work2, mapData, { phase: 'lv1', pathCells, locks });
      const result = await runSolver(milp.toArrays(), { timeLimit: o.phase2TimeLimit, absGap: o.phase2Gap });
      const plan = decode(result);
      const cost = pointsMissCost(plan, srv, mapData, FULL, target);
      if (cost < bestCost) {
        best = plan;
        bestCost = cost;
        bestDev = pointsDeviation(plan, srv, mapData, FULL, target);
      }
      if (bestCost === 0) break;
    } catch (e) {
      console.warn(`[TwoPhase] phase 2 try ${a + 1} failed: ${e.message}`);
      if (a === 0 && !best) throw e; // nothing usable yet: report the failure
    }
  }
  return best;
}

// How far every guild's Darkwick and dorm counts are from their targets (all 0 = perfectly even)
function scarceDevs(plan, srv, mapData, FULL, target) {
  const devs = [];
  for (const g of srv.guilds) {
    const t = target[g.id];
    if (!t) continue;
    let lv3 = 0,
      lv2 = 0;
    for (let d = 1; d <= FULL; d++)
      for (const k of mapData.kingdoms) {
        if (plan[d][k.id] === g.id) {
          if (k.type === 'lv3') lv3++;
          if (k.type === 'lv2') lv2++;
        }
      }
    devs.push(Math.abs(lv3 - t.mapLv3), Math.abs(lv2 - t.mapLv2));
  }
  return devs;
}

// Total distance of every guild's Darkwick and dorm counts from its target (0 = perfectly even)
export function scarceDeviation(plan, srv, mapData, FULL, target) {
  return scarceDevs(plan, srv, mapData, FULL, target).reduce((a, b) => a + b, 0);
}

// The same misses weighed by missCost(), for comparing two candidate plans.
export function scarceMissCost(plan, srv, mapData, FULL, target) {
  return missCost(scarceDevs(plan, srv, mapData, FULL, target), MISS_COST_SCARCE);
}

// Build a clean-up window's model, coping with the one thing that can make a window reaching day 1
// impossible to build at all: "every guild is on the map from day 1" is a hard rule while every guild
// fits on the map, but a guild that joins later has nowhere to stand once the user's own day 1 is
// locked, and that row is then left with no variables to satisfy it. Phase 1 already asks again with
// the rule as a penalty in that case, and the clean-up passes now do the same - before this, any window
// reaching day 1 was thrown away on a plan whose first day does not hold every guild.
function buildWindow(work, mapData, opts) {
  try {
    return buildModel(work, mapData, opts);
  } catch (e) {
    if (opts.winStart !== 1 || opts.softDay1) throw e;
    return buildModel(work, mapData, { ...opts, softDay1: true });
  }
}

// A clean-up window clears the days it is about to re-solve, but the user's own placements are not the
// optimizer's to clear: the model is handed them as locks either way, so wiping them asks it to satisfy
// a row it has no variables left for ("Constant constraint cannot hold") and the whole window is thrown
// out. Any window overlapping a manually planned day used to be skipped for this reason.
function lockedOnly(d, mapData, locks) {
  const row = {};
  for (const k of mapData.kingdoms) {
    const g = (locks[d] || {})[k.id];
    if (g) row[k.id] = g;
  }
  return row;
}

function windowStarts(FULL, K, stride) {
  if (K >= FULL) return [1];
  const starts = [];
  for (let ws = 1; ws + K - 1 <= FULL; ws += stride) starts.push(ws);
  if (starts[starts.length - 1] !== FULL - K + 1) starts.push(FULL - K + 1);
  return starts;
}

// Which days are worth re-solving: the days on which a guild that is ABOVE its Darkwick / dorm target
// is holding one. A surplus has to be given up on one of those days before a guild that is short can
// pick it up, so the windows covering them are tried first. Taking the windows left to right instead
// spends the whole budget on the first few days, and an imbalance late in the event is never reached.
function scarceHeat(plan, srv, mapData, FULL, target, only) {
  const heat = new Array(FULL + 2).fill(0);
  for (const g of srv.guilds) {
    const t = target[g.id];
    if (!t) continue;
    const days3 = [],
      days2 = [];
    for (let d = 1; d <= FULL; d++)
      for (const k of mapData.kingdoms) {
        if (plan[d][k.id] !== g.id) continue;
        if (k.type === 'lv3') days3.push(d);
        if (k.type === 'lv2') days2.push(d);
      }
    if (only !== 'lv2' && days3.length > t.mapLv3) for (const d of days3) heat[d]++;
    if (only !== 'lv3' && days2.length > t.mapLv2) for (const d of days2) heat[d]++;
  }
  return heat;
}

// Darkwick / dorm clean-up. phase1Plan: the plan from phase 1. Returns the best legal plan found.
// This re-solves a window with every cell free, so it can fix either, but it is expensive. It runs
// after the much cheaper repairCastle() below, which often settles Darkwick on its own in seconds -
// and when nothing is left out of place this returns straight away.
export async function repairScarce(srv, mapData, runSolver, phase1Plan, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = phase1Plan;
  let dev = scarceDeviation(plan, srv, mapData, FULL, target); // shown to the user
  let cost = scarceMissCost(plan, srv, mapData, FULL, target); // what candidates are judged on
  if (dev === 0) return plan;
  const t0 = Date.now();
  const K = Math.min(o.repairWindow, FULL);
  for (let pass = 1; pass <= 2 && dev > 0; pass++) {
    let improved = false;
    // Re-read the heat every pass: once a surplus moves, the days worth re-solving move with it.
    let hot = scarceHeat(plan, srv, mapData, FULL, target);
    const covered = ws => {
      let s = 0;
      for (let d = ws; d <= ws + K - 1; d++) s += hot[d] || 0;
      return s;
    };
    const starts = windowStarts(FULL, K, 1).sort((a, b) => covered(b) - covered(a) || a - b);
    for (const ws of starts) {
      if ((Date.now() - t0) / 1000 > o.repairBudget || dev === 0) break;
      if (covered(ws) === 0) continue; // nothing out of place in these days

      const we = ws + K - 1;
      onProgress(`Clean-up · Darkwick & dorms · days ${ws}-${we} (${dev} off)`);
      try {
        const work = { ...srv, plan: JSON.parse(JSON.stringify(plan)) };
        for (let d = ws; d <= we; d++) work.plan[d] = lockedOnly(d, mapData, locks);
        const { milp, decode, warmStart } = buildWindow(work, mapData, {
          winStart: ws,
          winEnd: we,
          repair: true,
          phase: 'scarce',
          locks,
        });
        const result = await runSolver(milp.toArrays(), {
          timeLimit: o.repairTimeLimit,
          absGap: o.phase1Gap,
          warmStart: warmStart(plan),
        });
        const dec = decode(result);
        const cand = JSON.parse(JSON.stringify(plan));
        for (let d = ws; d <= we; d++) cand[d] = dec[d];
        const c2 = scarceMissCost(cand, srv, mapData, FULL, target);
        if (c2 < cost - 1e-9 && checkPlan(cand, srv, mapData, FULL, locks).length === 0) {
          plan = cand;
          cost = c2;
          dev = scarceDeviation(cand, srv, mapData, FULL, target);
          improved = true;
          hot = scarceHeat(plan, srv, mapData, FULL, target); // the days out of place have moved
        }
      } catch (e) {
        console.warn(`[TwoPhase] repair window ${ws}-${we} skipped: ${e.message}`);
      }
    }
    if (!improved) break;
  }
  return plan;
}

// How Darkwick's days are grouped: one unbroken run of days is one stint, the same days scattered are
// several. floor = the number of guilds holding it at all, which is the fewest stints any plan sharing
// it out that way could have.
function castleRuns(plan, mapData, FULL) {
  const lv3 = mapData.kingdoms.find(k => k.type === 'lv3');
  const out = { stints: 0, floor: 0, splits: [] };
  if (!lv3) return out;
  const days = {};
  for (let d = 1; d <= FULL; d++) {
    const g = plan[d][lv3.id];
    if (g) (days[g] = days[g] || []).push(d);
  }
  for (const ds of Object.values(days)) {
    out.floor++; // one stint per holder is the best possible
    let runs = 0;
    for (let i = 0; i < ds.length; i++) if (i === 0 || ds[i] !== ds[i - 1] + 1) runs++;
    out.stints += runs;
    if (runs > 1) out.splits.push(ds);
  }
  return out;
}

// Darkwick clean-up, run when the dorms are already even but Darkwick is not - one guild holding it
// twice while another never does. The dorms stay exactly as they are and only Darkwick and the lv1
// towns are re-solved, which is a much smaller problem than the all-free clean-up above and gives a
// swap between two guilds a real chance of being found. A candidate is kept only if it is legal and
// evens Darkwick out without disturbing the dorms.
export async function repairCastle(srv, mapData, runSolver, plan0, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = plan0;
  let dev = scarceDeviation(plan, srv, mapData, FULL, target);
  let cost = scarceMissCost(plan, srv, mapData, FULL, target);
  if (dev === 0) return plan;
  const t0 = Date.now();
  const K = Math.min(o.castleWindow, FULL);
  let hot = scarceHeat(plan, srv, mapData, FULL, target, 'lv3');
  const covered = ws => {
    let s = 0;
    for (let d = ws; d <= ws + K - 1; d++) s += hot[d] || 0;
    return s;
  };
  for (const ws of windowStarts(FULL, K, 1).sort((a, b) => covered(b) - covered(a) || a - b)) {
    if ((Date.now() - t0) / 1000 > o.castleBudget || dev === 0) break;
    if (covered(ws) === 0) continue;
    const we = ws + K - 1;
    onProgress(`Clean-up · Darkwick · days ${ws}-${we} (${dev} off)`);
    try {
      const work = { ...srv, plan: JSON.parse(JSON.stringify(plan)) };
      for (let d = ws; d <= we; d++)
        for (const k of mapData.kingdoms) {
          if (k.type !== 'lv2' && !(locks[d] || {})[k.id]) work.plan[d][k.id] = '';
        }
      const { milp, decode, warmStart } = buildWindow(work, mapData, {
        winStart: ws,
        winEnd: we,
        repair: true,
        phase: 'castle',
        locks,
      });
      const result = await runSolver(milp.toArrays(), {
        timeLimit: o.castleTimeLimit,
        absGap: o.phase1Gap,
        warmStart: warmStart(plan),
      });
      const dec = decode(result);
      const cand = JSON.parse(JSON.stringify(plan));
      for (let d = ws; d <= we; d++) cand[d] = dec[d];
      const c2 = scarceMissCost(cand, srv, mapData, FULL, target);
      if (c2 < cost - 1e-9 && checkPlan(cand, srv, mapData, FULL, locks).length === 0) {
        plan = cand;
        cost = c2;
        dev = scarceDeviation(cand, srv, mapData, FULL, target);
        hot = scarceHeat(plan, srv, mapData, FULL, target, 'lv3');
      }
    } catch (e) {
      console.warn(`[TwoPhase] Darkwick window ${ws}-${we} skipped: ${e.message}`);
    }
  }
  return plan;
}

// Castle stint clean-up. A guild with two castle days wants them back to back: the same points for half
// the marching. The model already charges CASTLE_STINT_COST for every stint a guild opens, but phase 1
// commits only a few days at a time, so a guild handed Darkwick in an early window looks free to re-use
// in a later one - the stint it already has open is sunk cost that the later window cannot see, and a
// split across the boundary costs it nothing.
//
// The dorms have to move for this, which is why it is not part of the Darkwick clean-up above. On maps
// where Darkwick's neighbors are mostly dorms (Wetland: one Lv1 town and three dorms) the castle order
// is dictated by who is standing on those dorms, so with the dorms pinned there is nothing to re-arrange.
// This pass frees the dorms and Darkwick together, like the dorm clean-up, and keeps a result only when
// it closes a stint, is legal, and is no worse on the scarce towns OR on points anywhere.
export async function consolidateCastle(srv, mapData, runSolver, plan0, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = plan0;
  let runs = castleRuns(plan, mapData, FULL);
  if (runs.stints === runs.floor) return plan; // already as few stints as its holders allow
  let cost = scarceMissCost(plan, srv, mapData, FULL, target);
  const t0 = Date.now();
  const K = Math.min(o.repairWindow, FULL);
  // A window is only worth solving if it holds every one of a split guild's castle days - with one of
  // them outside, re-solving the window cannot bring them together.
  const covered = ws => runs.splits.filter(ds => ds[0] >= ws && ds[ds.length - 1] <= ws + K - 1).length;
  for (const ws of windowStarts(FULL, K, 1).sort((a, b) => covered(b) - covered(a) || a - b)) {
    if ((Date.now() - t0) / 1000 > o.castleBudget || runs.stints === runs.floor) break;
    if (covered(ws) === 0) continue;
    const we = ws + K - 1;
    onProgress(`Clean-up · castle days · days ${ws}-${we} (${runs.stints - runs.floor} split)`);
    try {
      const work = { ...srv, plan: JSON.parse(JSON.stringify(plan)) };
      for (let d = ws; d <= we; d++) work.plan[d] = lockedOnly(d, mapData, locks);
      const { milp, decode, warmStart } = buildWindow(work, mapData, {
        winStart: ws,
        winEnd: we,
        repair: true,
        phase: 'scarce',
        locks,
      });
      const result = await runSolver(milp.toArrays(), {
        timeLimit: o.repairTimeLimit,
        absGap: o.phase1Gap,
        warmStart: warmStart(plan),
      });
      const dec = decode(result);
      const cand = JSON.parse(JSON.stringify(plan));
      for (let d = ws; d <= we; d++) cand[d] = dec[d];
      const r2 = castleRuns(cand, mapData, FULL);
      const c2 = scarceMissCost(cand, srv, mapData, FULL, target);
      // Fewer stints, and no worse a share of Darkwick and the dorms. The Lv1 towns in the window get
      // shuffled on the way - a window aims at its own slice of each guild's target, not the whole
      // event's - so the points are not judged here; the points clean-up that runs next puts them
      // back, and solveGocFinish checks that it did.
      const better = r2.stints < runs.stints && c2 <= cost + 1e-9;
      if (better && checkPlan(cand, srv, mapData, FULL, locks).length === 0) {
        plan = cand;
        cost = c2;
        runs = r2;
      }
    } catch (e) {
      console.warn(`[TwoPhase] castle stint window ${ws}-${we} skipped: ${e.message}`);
    }
  }
  return plan;
}

// Points clean-up. Darkwick, dorms and every other plan row stay as they are; only Lv1 towns are re-solved,
// a few days at a time, and a result is kept only if it is legal and brings the points closer to even.
export async function refinePoints(srv, mapData, runSolver, plan0, userOpts = {}) {
  const o = { ...TWO_PHASE_DEFAULTS, ...userOpts };
  const onProgress = o.onProgress || (() => {});
  const FULL = numDays(srv);
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  const locks = JSON.parse(JSON.stringify(srv.plan));
  let plan = plan0;
  let dev = pointsDeviation(plan, srv, mapData, FULL, target); // shown to the user
  let cost = pointsMissCost(plan, srv, mapData, FULL, target); // what candidates are judged on
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
        for (let d = ws; d <= we; d++)
          for (const k of mapData.kingdoms) {
            if (k.type === 'lv1' && !(locks[d] || {})[k.id]) work.plan[d][k.id] = '';
          }
        const { milp, decode, warmStart } = buildWindow(work, mapData, {
          winStart: ws,
          winEnd: we,
          repair: true,
          phase: 'lv1',
          locks,
        });
        const result = await runSolver(milp.toArrays(), {
          timeLimit: o.refineTimeLimit,
          absGap: o.phase2Gap,
          warmStart: warmStart(plan),
        });
        const dec = decode(result);
        const cand = JSON.parse(JSON.stringify(plan));
        for (let d = ws; d <= we; d++) cand[d] = dec[d];
        const c2 = pointsMissCost(cand, srv, mapData, FULL, target);
        if (c2 < cost - 1e-9 && checkPlan(cand, srv, mapData, FULL, locks).length === 0) {
          plan = cand;
          cost = c2;
          dev = pointsDeviation(cand, srv, mapData, FULL, target);
        }
      } catch (e) {
        console.warn(`[TwoPhase] refine window ${ws}-${we} skipped: ${e.message}`);
      }
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
  let phase2 = await solveGocPhase2(srv, mapData, runSolver, repaired, userOpts);
  // Darkwick is easier to even out once phase 2 has filled in every lv1 town: before that the plan
  // holds only the few path towns, which leaves a guild that is short of Darkwick nothing to stand on.
  // It costs seconds, and the points clean-up below puts right the lv1 towns it moves.
  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  if (scarceDeviation(phase2, srv, mapData, FULL, target) > 0) {
    phase2 = await repairCastle(srv, mapData, runSolver, phase2, userOpts);
  }
  // Darkwick shared out correctly can still be split across phase 1's window boundaries, which costs a
  // guild a march for nothing. Closing that needs the dorms free, so it is its own pass.
  const split = castleRuns(phase2, mapData, FULL);
  const joined = await consolidateCastle(srv, mapData, runSolver, phase2, userOpts);
  let plan = await refinePoints(srv, mapData, runSolver, joined, userOpts);
  // Joining a stint shuffles the Lv1 towns in its window, which the points clean-up above is meant to
  // put right. Where it could not, a guild has been left short of its target to save another a march,
  // and that is the wrong trade: fall back to the plan that kept the split.
  if (castleRuns(joined, mapData, FULL).stints < split.stints) {
    const pc = pointsMissCost(plan, srv, mapData, FULL, target);
    if (pc > 1e-9) {
      const kept = await refinePoints(srv, mapData, runSolver, phase2, userOpts);
      if (pointsMissCost(kept, srv, mapData, FULL, target) < pc - 1e-9) plan = kept;
    }
  }
  const problems = checkPlan(plan, srv, mapData, FULL, locks);
  if (problems.length) throw new Error('The optimizer could not build a legal plan this time. Please try again.');
  return plan;
}

export async function solveGoc(srv, mapData, runSolver, userOpts = {}) {
  const phase1Plan = await solveGocPhase1(srv, mapData, runSolver, userOpts);
  return solveGocFinish(srv, mapData, runSolver, phase1Plan, userOpts);
}
