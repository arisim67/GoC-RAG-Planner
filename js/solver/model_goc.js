// model_goc.js  (Game of Claws only: two-phase model, see twophase.js.
// Ragnarok keeps using model_ragnarok.js, which is untouched.)
import { MilpBuilder } from './milp.js';

// fromIdx: the (already fixed) day the reachability starts from. 0 = the event start.
function getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv, fromIdx = 0) {
  const reach = [];
  const startDay = srv.plan[fromIdx] || {};
  const isGoC = srv.mode === 'goc';

  for (let g = 0; g < GUILDS.length; g++) {
    const gid = GUILDS[g].id;
    reach[g] = [];
    
    reach[g][fromIdx] = {};
    for (const t of KINGDOMS) {
      reach[g][fromIdx][t.id] = (startDay[t.id] === gid);
    }

    for (let d = fromIdx + 1; d <= DAYS; d++) {
      reach[g][d] = {};
      const prev = reach[g][d - 1];

      // Darkwick needs backing, not just a neighbor: the model only lets a guild take it with a dorm
      // or two lv1 towns held the day before (gain <= lv2 + 0.5*lv1, see the constraint below). Without
      // that backing it cannot be taken, so its points must not be counted into anyone's target --
      // otherwise "perfect" is arithmetically out of reach and the solver spends its time chasing
      // points nobody can win. That is what happens on a map whose only castle neighbor is a guild
      // holding a single lv1 town on day 0. Like the rest of this matrix this stays an upper bound: it
      // asks whether the supporting towns were reachable at all, not whether one guild could hold them
      // all at once, so it only ever removes targets that were impossible.
      let backing = 0;
      for (const t of KINGDOMS) {
        if (!prev[t.id]) continue;
        if (t.type === 'lv2') backing += 1;
        else if (t.type === 'lv1') backing += 0.5;
      }

      for (const t of KINGDOMS) {
        let canReach = prev[t.id];
        if (!canReach) canReach = t.adj.some(nId => prev[nId]);
        if (!prev[t.id] && isGoC && t.id === 'Darkwick' && backing < 1) canReach = false;

        const heldYesterday = Object.values(prev).some(held => held);
        if (!heldYesterday && t.type === 'lv1') canReach = true;

        reach[g][d][t.id] = canReach;
      }
    }
  }
  return reach;
}

// opts.respectLocked: take the days already played as given when sharing Darkwick and the dorms out.
// The solver passes it; the Targets column does not, so what you are shown stays the clean-slate ideal
// while the solver aims at what is still achievable. Only srv.plan's filled days count as played, and
// during a solve that is exactly the days you entered by hand.
export function getPerfectTargets(srv, mapData, opts = {}) {
  const isGoC = srv.mode === 'goc';
  const DAYS = (srv.endDate && srv.startDate) 
    ? Math.max(1, Math.round((new Date(srv.endDate) - new Date(srv.startDate)) / 86400000) + 1)
    : (isGoC ? 12 : 6);

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const reach = getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv);

  const activeGuilds = GUILDS.filter(g => !g.isExcluded);
  const N = activeGuilds.length;
  
  const sortedGuilds = [...activeGuilds].sort((a, b) => 
    (parseInt(b.basePoints || 0, 10)) - (parseInt(a.basePoints || 0, 10))
  );

  const target = {};
  if (N > 0) {
    let mapLv3 = 0, mapLv2 = 0, mapPts = 0;

    // A guild that has left keeps the towns it was standing on, and nobody can take them, so those
    // towns are not points anyone can still win: counting them would set everyone a target they
    // cannot reach. Walk the days forward and keep track of which towns are shut away like that -
    // a cell left blank carries yesterday's holder, the same rule the model freezes them by.
    const shut = {};
    const excludedIds = new Set(GUILDS.filter(g => g.isExcluded).map(g => g.id));
    const held = {};
    for (const t of KINGDOMS) held[t.id] = (srv.plan[0] || {})[t.id] || '';

    for (let d = 1; d <= DAYS; d++) {
      shut[d] = {};
      for (const t of KINGDOMS) {
        const cell = (srv.plan[d] || {})[t.id];
        if (cell) held[t.id] = cell;              // explicitly placed, by hand or by an earlier solve
        shut[d][t.id] = excludedIds.has(held[t.id]);
      }
      for (const t of KINGDOMS) {
        if (shut[d][t.id]) continue;
        let canReach = false;
        for (let g = 0; g < GUILDS.length; g++) {
          if (GUILDS[g].isExcluded) continue;     // a guild that has left cannot put a town in play
          if (reach[g][d][t.id]) { canReach = true; break; }
        }
        if (canReach) {
          if (t.type === 'lv3') { mapLv3++; mapPts += 3; }
          if (t.type === 'lv2') { mapLv2++; mapPts += 2; }
          if (t.type === 'lv1') { mapPts += 1; }
        }
      }
    }

    let grandLv3 = mapLv3, grandLv2 = mapLv2, grandPts = mapPts;
    sortedGuilds.forEach(g => {
      grandLv3 += parseInt(g.baseLv3 || 0, 10);
      grandLv2 += parseInt(g.baseLv2 || 0, 10);
      grandPts += parseInt(g.basePoints || 0, 10);
      target[g.id] = { grandLv3: 0, grandLv2: 0, grandPts: 0 };
    });

    // What the days already played have handed out. A guild that has held Darkwick twice cannot be
    // given a target of once: the sums then do not add up, and the solver has to leave somebody else
    // with none at all. Seeding the split with these keeps every guild's share reachable.
    const lockLv3 = {}, lockLv2 = {};
    for (const g of sortedGuilds) { lockLv3[g.id] = 0; lockLv2[g.id] = 0; }
    if (opts.respectLocked) {
      for (let d = 1; d <= DAYS; d++) for (const t of KINGDOMS) {
        if (shut[d] && shut[d][t.id]) continue;
        const who = (srv.plan[d] || {})[t.id];
        if (!who || lockLv3[who] === undefined) continue;
        if (t.type === 'lv3') lockLv3[who]++;
        else if (t.type === 'lv2') lockLv2[who]++;
      }
    }

    // Hand out one at a time to whoever has least so far, later guilds winning ties. With nothing
    // played yet that lands on exactly the old split - a flat share with the remainder going to the
    // guilds at the bottom - and with days played it respects them instead of contradicting them.
    const shareOut = (total, key, seed, weigh) => {
      let placed = 0;
      for (const g of sortedGuilds) { target[g.id][key] = seed[g.id]; placed += seed[g.id]; }
      for (let i = placed; i < total; i++) {
        let bestIdx = 0, best = Infinity;
        for (let j = 0; j < N; j++) {
          const v = weigh(sortedGuilds[j].id);
          if (v <= best) { best = v; bestIdx = j; }
        }
        target[sortedGuilds[bestIdx].id][key]++;
      }
    };
    shareOut(grandLv3, 'grandLv3', lockLv3, gid => target[gid].grandLv3);

    for (const g of sortedGuilds) { target[g.id].grandLv2 = lockLv2[g.id]; }
    let placedLv2 = sortedGuilds.reduce((a, g) => a + lockLv2[g.id], 0);
    for (let i = placedLv2; i < grandLv2; i++) {
      let bestIdx = 0;
      let minVal = Infinity;
      for (let j = 0; j < N; j++) {
        const gid = sortedGuilds[j].id;
        const val = (target[gid].grandLv3 * 3) + (target[gid].grandLv2 * 2);
        if (val < minVal) { minVal = val; bestIdx = j; }
      }
      target[sortedGuilds[bestIdx].id].grandLv2++;
    }

    sortedGuilds.forEach(g => {
      target[g.id].grandPts = (target[g.id].grandLv3 * 3) + (target[g.id].grandLv2 * 2);
    });
    
    const allocatedHTPts = (grandLv3 * 3) + (grandLv2 * 2);
    const remainingPts = grandPts - allocatedHTPts;
    
    for (let i = 0; i < remainingPts; i++) {
      let bestIdx = 0;
      let minPts = Infinity;
      for (let j = 0; j < N; j++) {
        const gid = sortedGuilds[j].id;
        if (target[gid].grandPts < minPts) {
          minPts = target[gid].grandPts;
          bestIdx = j;
        }
      }
      target[sortedGuilds[bestIdx].id].grandPts++;
    }

    sortedGuilds.forEach(g => {
      target[g.id].mapLv3 = Math.max(0, target[g.id].grandLv3 - parseInt(g.baseLv3 || 0, 10));
      target[g.id].mapLv2 = Math.max(0, target[g.id].grandLv2 - parseInt(g.baseLv2 || 0, 10));
      target[g.id].mapPts = Math.max(0, target[g.id].grandPts - parseInt(g.basePoints || 0, 10));
    });
  }
  return target;
}

// opts.winStart / opts.winEnd: solve only days winStart..winEnd (rolling horizon).
// Days before winStart are treated as FIXED, read from srv.plan. Omit both to solve the whole event.
// opts.repair: ALSO treat the days after winEnd as fixed (read from srv.plan) and aim the window at
//   (global target - what the fixed days already give), i.e. re-optimize a slice of a finished plan.
//   The caller must clear the window's cells in srv.plan and pass the user's manual locks as opts.locks.
// opts.locks: plan-shaped object of manually placed cells to respect (defaults to srv.plan).
// opts.phase: 'scarce' = balance only Darkwick + dorms (lv1 towns are just whatever is needed to make
//   them legal, no lv1 reward / points target);  'lv1' = Darkwick + dorms are FIXED from srv.plan for
//   every day, the lv1 'path' cells in opts.pathCells are FIXED too, and only the remaining lv1 cells are
//   chosen, to balance total points;  omitted = everything at once.
//   'castle' = the dorms are FIXED from srv.plan, and only Darkwick and the lv1 towns are chosen, to
//   even out who holds Darkwick. Far fewer choices than 'scarce', which is what makes a late swap of
//   Darkwick between two guilds findable at all.
// opts.pathCells: { day: { lv1TownId: guildId } } (see paths.js)
const PATH_FOOTPRINT_COST = 25;

// Cost of a guild NOT being on the map on day 1, used ONLY when there are more guilds than towns.
// "Everyone on the map from day 1" is not a game rule, it is scaffolding that keeps the two-phase split
// honest, so it must never be the reason no plan exists: one town holds one guild, so with 20 guilds on
// an 18-town map that row is unsatisfiable and the whole model came back infeasible. While it IS
// satisfiable it stays a hard row (so every configuration that already worked is untouched, to the bit);
// past that it becomes this penalty, worth about three lv1 town-days, which still pushes guilds onto the
// map early without swamping the rest of the objective.
const DAY1_LATE_COST = 30000;

// Cost of a guild holding nothing at all on a given day, used in the phases that actually hand out
// lv1 towns. Phase 1 forces everyone onto the map by day 1, but it only fixes Darkwick, the dorms and
// the lv1 cells that serve as paths to them -- every other lv1 cell goes back to phase 2, so a guild
// whose only day-1 town was not a path cell gets dropped again and can sit idle for days. Points alone
// do not prevent this: the solver can leave a guild off early and pay it back later with higher-value
// towns, which balances the totals while wasting that guild's first days. A guild that holds something
// can never be wiped (see the no-map-wipes row), so a guild's idle days are always its first ones, and
// charging per idle day is the same as making it enter as early as it can.
// Deliberately below one point of target miss (MISS_TIERS_PTS[0] = 6000): entering early breaks ties
// between otherwise equal plans, but never buys itself a worse point distribution.
const ABSENT_DAY_COST = 1000;

// Cost of newly capturing Darkwick. Holding the castle two days running is one move; holding it on two
// scattered days is two moves and two declares, for exactly the same points. `gain` is already 1 only
// on the day a guild TAKES a town rather than keeps it, so charging it makes a guild's castle days land
// consecutively whenever the rest of the plan is indifferent.
// Kept well below one point of target miss (MISS_TIERS_PTS[0] = 6000) so fewer moves never buy
// themselves a worse point or dorm distribution. Note this pulls against ABSENT_DAY_COST: consolidating
// the castle can want a lv1 town that a guild still waiting to enter would otherwise take, which is why
// both costs are needed together -- the castle one alone delays a late guild by a day.
const CASTLE_STINT_COST = 2000;

// Penalty for the 1st point a guild is off its target, the 2nd, and every point after that.
// Not every target is reachable (nobody can take Darkwick on day 1, for instance), so some plans have
// to miss by a few points. With ONE flat penalty the solver is indifferent between "one guild 5 points
// short" and "five guilds 1 point short" - both cost 5 x penalty - and it tends to dump the whole miss
// on a single guild. Rising weights make it share an unavoidable miss out instead.
// Every weight stays BELOW the reward for holding the town itself, so the solver still takes every
// reachable town rather than leaving one empty to dodge a penalty.
const MISS_TIERS_PTS = [6000, 8000, 9500];      // points: a lv1 town is worth 10000
const MISS_TIERS_SCARCE = [6000, 10000, 15000]; // Darkwick / dorm counts: a dorm is worth 20000

export function buildModel(srv, mapData, opts = {}) {
  const milp = new MilpBuilder();
  const isGoC = srv.mode === 'goc';
  
  const FULL_DAYS = (srv.endDate && srv.startDate) 
    ? Math.max(1, Math.round((new Date(srv.endDate) - new Date(srv.startDate)) / 86400000) + 1)
    : (isGoC ? 12 : 6);
  const winStart = opts.winStart ?? 1;
  const DAYS = opts.winEnd ?? FULL_DAYS;   // last day solved in this model
  const fromIdx = winStart - 1;            // last fixed day
  const repair = !!opts.repair;
  const LASTD = repair ? Math.min(DAYS + 1, FULL_DAYS) : DAYS;   // last day that has constraints
  const lockSrc = opts.locks || srv.plan;
  const phase = opts.phase || 'full';
  const pathCells = opts.pathCells || {};
  const isFixedCell = (d, t) =>
    (phase === 'lv1' && (t.type !== 'lv1' || !!(pathCells[d] || {})[t.id])) ||
    (phase === 'castle' && t.type === 'lv2');

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const baseMaxDecl = isGoC ? 2 : 3;
  const pointValues = { 'lv3': 3, 'lv2': 2, 'lv1': 1 };

  const target = getPerfectTargets(srv, mapData, { respectLocked: true });
  const reachFull = getReachableMatrix(GUILDS, KINGDOMS, FULL_DAYS, srv, fromIdx);

  const VALID_KINGDOMS = KINGDOMS.filter(t => {
    for (let d = winStart; d <= DAYS; d++) {
      for (let g = 0; g < GUILDS.length; g++) {
        if (reachFull[g][d][t.id]) return true;
      }
    }
    return false;
  });

  const activeGuilds = GUILDS.filter(g => !g.isExcluded);
  const N = activeGuilds.length;
  
  const sortedGuilds = [...activeGuilds].sort((a, b) => 
    (parseInt(b.basePoints || 0, 10)) - (parseInt(a.basePoints || 0, 10))
  );

  // 2. VARIABLE CREATION (With UI Locking)
  const own = [];
  for (let g = 0; g < GUILDS.length; g++) {
    own[g] = [];
    const isExcluded = GUILDS[g].isExcluded;

    for (let d = 0; d <= LASTD; d++) {
      own[g][d] = {};
      for (const t of VALID_KINGDOMS) {
        if (d < winStart || d > DAYS || isFixedCell(d, t)) {
          // Fixed history (day 0 / earlier windows), the fixed days after a repair window,
          // or (lv1 phase) Darkwick / dorms / locked path towns
          const holder = (d < winStart || d > DAYS || t.type !== 'lv1')
            ? (srv.plan[d] || {})[t.id]
            : (pathCells[d] || {})[t.id];
          own[g][d][t.id] = (holder === GUILDS[g].id) ? 1 : 0;
        } else {
          // 🚨 THE UI LOCK: If you manually place a guild on a day in the UI, 
          // the math engine freezes it permanently to help the solver.
          const manualLockGid = (lockSrc[d] || {})[t.id];
          
          if (manualLockGid) {
            own[g][d][t.id] = (manualLockGid === GUILDS[g].id) ? 1 : 0;
          } 
          else if (isExcluded) {
            // Carry yesterday forward. Day 0 is always fixed, so this walks up through the days
            // already played and freezes them on whatever they held on the last of those - which is
            // what "they stopped after day 4" has to mean. fromIdx is winStart - 1, and phase 1
            // starts at day 1, so it would reach back past every day already played.
            own[g][d][t.id] = own[g][d - 1][t.id];
          } 
          else if (!reachFull[g][d][t.id]) {
            own[g][d][t.id] = 0;
          } 
          else {
            own[g][d][t.id] = milp.binary(`own_g${g}_d${d}_${t.id}`);
          }
        }
      }
    }
  }
  const ownAt = (g, d, tId) => own[g][d][tId];

  // Kept so warmStart() below can work out what every variable is worth under a given plan.
  const enterVar = [];        // enterVar[g][d]
  const lateVar = [];         // lateVar[g] (day-1 presence slack, scarce/castle only)
  const absentVar = [];       // absentVar[g][d] (holds nothing that day, lv1 / full phases only)
  const gainVar = [];         // gainVar[g][d][townId]
  const missSpecs = [];       // one per target: { terms, rhs, pos: [{v, cap}], neg: [...] }

  // Can every guild stand somewhere on day 1 at all? One town holds one guild, so this is simply
  // whether there are at least as many towns in play as guilds competing for them. That test is
  // necessary but not sufficient, so the caller can also force the penalty form after a failed solve.
  const day1FitsAll = !opts.softDay1
    && GUILDS.filter(g => !g.isExcluded).length <= VALID_KINGDOMS.length;

  // 3. CORE CONSTRAINTS
  for (let d = winStart; d <= LASTD; d++) {
    for (const t of VALID_KINGDOMS) {
      const holders = GUILDS.map((guild, g) => [1, ownAt(g, d, t.id)]);
      milp.atMost(holders, 1); 
      const before = GUILDS.map((guild, g) => [-1, ownAt(g, d - 1, t.id)]);
      milp.atLeast([...holders, ...before], 0); 
    }

    for (let g = 0; g < GUILDS.length; g++) {
      if (GUILDS[g].isExcluded) continue;

      const declaredTerms = [];
      const maxDecl = (isGoC && GUILDS[g].isSmall) ? 1 : baseMaxDecl;
      // `entering` is exact: 1 iff the guild held NOTHING yesterday.
      // Disaggregated (one row per town) instead of a big-M, for a much tighter LP relaxation.
      const entering = milp.binary(`enter_g${g}_d${d}`);
      (enterVar[g] = enterVar[g] || [])[d] = entering;
      const prevVars = VALID_KINGDOMS.map(k => ownAt(g, d - 1, k.id));
      for (const pv of prevVars) milp.atMost([ [1, entering], [1, pv] ], 1);
      milp.atLeast([ [1, entering], ...prevVars.map(pv => [1, pv]) ], 1);

      // No map wipes: if the guild held something yesterday (entering = 0), it must hold something today.
      milp.atLeast([ [1, entering], ...VALID_KINGDOMS.map(k => [1, ownAt(g, d, k.id)]) ], 1);

      // Two-phase planning: every guild is on the map from day 1 (a guild that starts empty enters on day 1).
      // Otherwise phase 1 leaves such guilds off the map for days, and the lv1 path locked for phase 2
      // would depend on them still being empty.
      // Hard while every guild fits on the map at once, a penalty when they do not (see DAY1_LATE_COST).
      if ((phase === 'scarce' || phase === 'castle') && d === 1) {
        const onMap = VALID_KINGDOMS.map(k => [1, ownAt(g, d, k.id)]);
        if (day1FitsAll) {
          milp.atLeast(onMap, 1);
        } else {
          const late = milp.continuous(`late_g${g}`, 0, 1);
          lateVar[g] = late;
          milp.addCost(late, DAY1_LATE_COST);
          milp.atLeast([ ...onMap, [1, late] ], 1);
        }
      }

      // ... and in the phases that choose the lv1 towns, keep pushing: every day a guild holds nothing
      // costs ABSENT_DAY_COST, so a guild still waiting to enter comes on at the first opportunity
      // instead of being parked and compensated later.
      if (phase === 'lv1' || phase === undefined) {
        const absent = milp.continuous(`absent_g${g}_d${d}`, 0, 1);
        (absentVar[g] = absentVar[g] || [])[d] = absent;
        milp.addCost(absent, ABSENT_DAY_COST);
        milp.atLeast([ ...VALID_KINGDOMS.map(k => [1, ownAt(g, d, k.id)]), [1, absent] ], 1);
      }

      for (const t of VALID_KINGDOMS) {
        const now = ownAt(g, d, t.id);
        const before = ownAt(g, d - 1, t.id);

        if (now === 0 && before === 0) continue;

        const gain = milp.continuous(`gain_g${g}_d${d}_${t.id}`, 0, 1);
        ((gainVar[g] = gainVar[g] || [])[d] = gainVar[g][d] || {})[t.id] = gain;
        declaredTerms.push([1, gain]);
        
        milp.addCost(gain, 1); 
        // Prefer one unbroken castle stint over the same number of scattered castle days.
        if (isGoC && t.type === 'lv3') milp.addCost(gain, CASTLE_STINT_COST);

        milp.atMost([ [1, now], [-1, before], [-1, gain] ], 0);
        milp.atMost([ [1, gain], [-1, now] ], 0);
        milp.atMost([ [1, gain], [1, before] ], 1);

        const adjConstraint = [ [1, now], [-1, before] ];
        for (const nId of t.adj) {
          const nVar = ownAt(g, d - 1, nId);
          if (nVar !== undefined) adjConstraint.push([-1, nVar]);
        }
        if (t.type === 'lv1') {
          adjConstraint.push([-1, entering]);
        }
        milp.atMost(adjConstraint, 0);

        if (isGoC && t.id === 'Darkwick') {
          const lv2Terms = VALID_KINGDOMS.filter(k => k.type === 'lv2').map(k => [-1, ownAt(g, d - 1, k.id)]);
          const lv1Terms = VALID_KINGDOMS.filter(k => k.type === 'lv1').map(k => [-0.5, ownAt(g, d - 1, k.id)]);
          milp.atMost([ [1, gain], ...lv2Terms, ...lv1Terms ], 0);
        }
      }

      if (declaredTerms.length > 0) {
        milp.atMost(declaredTerms, maxDecl);
        // Holding nothing => at most 1 declare (the beachhead).
        milp.atMost([ ...declaredTerms, [maxDecl - 1, entering] ], maxDecl);
      }
    }
  }

  // 4. OBJECTIVE & ELASTIC WEIGHTS
  // Rolling horizon: each window aims for its SHARE of what each guild still needs.
  // share = (reachable town-days in this window) / (reachable town-days left in the event).
  // For a full-event solve winStart = 1 and DAYS = FULL_DAYS, so share = 1 and nothing changes.
  const supply = { win: { lv3: 0, lv2: 0, lv1: 0 }, rest: { lv3: 0, lv2: 0, lv1: 0 } };
  for (let d = winStart; d <= FULL_DAYS; d++) {
    for (const t of KINGDOMS) {
      if (!GUILDS.some((_, g) => reachFull[g][d][t.id])) continue;
      if (phase !== 'scarce' && isFixedCell(d, t)) continue;   // only FREE towns can be handed out in this phase
      supply.rest[t.type]++;
      if (d <= DAYS) supply.win[t.type]++;
    }
  }
  // target = (terms) + slack, where the slack is split into tiers that get more expensive. The solver
  // fills the cheap tier first all by itself, so the n-th point of a miss costs weights[n].
  const tieredMiss = (name, terms, rhs, weights, cap) => {
    const slacks = [];
    const spec = { terms, rhs, pos: [], neg: [] };
    weights.forEach((w, i) => {
      const last = i === weights.length - 1;
      const lim = last ? cap : 1;
      const pos = milp.continuous(`spos${i}_${name}`, 0, lim);
      const neg = milp.continuous(`sneg${i}_${name}`, 0, lim);
      milp.addCost(pos, w);
      milp.addCost(neg, w);
      slacks.push([-1, pos], [1, neg]);
      spec.pos.push({ v: pos, cap: lim });
      spec.neg.push({ v: neg, cap: lim });
    });
    milp.equal([...terms, ...slacks], rhs);
    missSpecs.push(spec);
  };

  const share = (w, r) => (r > 0 ? w / r : 0);
  const ptsOf = (o) => 3 * o.lv3 + 2 * o.lv2 + o.lv1;
  // In repair mode the rest of the event is fixed, so the window must deliver the whole remainder.
  const shareLv3 = repair ? 1 : share(supply.win.lv3, supply.rest.lv3);
  const shareLv2 = repair ? 1 : share(supply.win.lv2, supply.rest.lv2);
  const sharePts = repair ? 1 : share(ptsOf(supply.win), ptsOf(supply.rest));
  const shareLv1 = repair ? 1 : share(supply.win.lv1, supply.rest.lv1);

  for (let i = 0; i < N; i++) {
    const guild = sortedGuilds[i];
    const g = GUILDS.findIndex(x => x.id === guild.id);
    if (GUILDS[g].isExcluded) continue;

    // What this guild already banked in the fixed days of earlier windows
    const got = { lv3: 0, lv2: 0, pts: 0 };
    for (let d = 1; d <= (repair ? FULL_DAYS : winStart - 1); d++) {
      if (repair && d >= winStart && d <= DAYS) continue;   // the window itself is what we are choosing
      for (const t of KINGDOMS) {
        if (((srv.plan[d] || {})[t.id]) === guild.id) {
          if (t.type === 'lv3') got.lv3++;
          if (t.type === 'lv2') got.lv2++;
          got.pts += pointValues[t.type] || 0;
        }
      }
    }
    // lv1 phase: from winStart on, Darkwick / dorms / path towns are already decided
    let fixedFuture = 0;
    if (phase === 'lv1') {
      for (let d = winStart; d <= (repair ? DAYS : FULL_DAYS); d++) {   // repair: days after the window are counted in `got`
        for (const t of KINGDOMS) {
          const holder = t.type !== 'lv1' ? (srv.plan[d] || {})[t.id] : (pathCells[d] || {})[t.id];
          if (holder === guild.id) fixedFuture += pointValues[t.type] || 0;
        }
      }
    }
    const full = target[guild.id];
    const tgt = {
      mapLv3: Math.max(0, full.mapLv3 - got.lv3) * shareLv3,
      mapLv2: Math.max(0, full.mapLv2 - got.lv2) * shareLv2,
      mapPts: Math.max(0, full.mapPts - got.pts - fixedFuture) * (phase === 'lv1' ? shareLv1 : sharePts),
    };
    const isBot = i >= Math.floor(N / 2);
    const offset = i * 10;
    
    // 🚨 THE GREEDY BALANCE PARADIGM 🚨
    // The Town Reward is mathematically HIGHER than the Quota Penalty.
    // This forces the solver to aggressively capture every reachable town on the map,
    // while perfectly feeding those towns to the guilds furthest below their targets.
    const ptReward = 10000;

    // The tiny offset only breaks ties between otherwise equal guilds, as before.
    // 'full' (everything in one solve) is not used by the two-phase pipeline and keeps the old flat
    // penalty: there the Darkwick/dorm miss and the point miss stack, and tiers could out-price a capture.
    const tiers = (base) => (phase === 'full' ? base.slice(0, 1) : base)
      .map(w => w + (isBot ? offset : -offset));

    const lv3Terms = [];
    const lv2Terms = [];
    const pointTerms = [];

    for (let d = winStart; d <= DAYS; d++) {
      for (const t of VALID_KINGDOMS) {
        if (t.type === 'lv3') lv3Terms.push([1, ownAt(g, d, t.id)]);
        if (t.type === 'lv2') lv2Terms.push([1, ownAt(g, d, t.id)]);
        
        if (phase === 'lv1' && isFixedCell(d, t)) continue;   // fixed, already accounted for
        const pts = pointValues[t.type] || 0;
        pointTerms.push([pts, ownAt(g, d, t.id)]);
        
        if ((phase === 'scarce' || phase === 'castle') && t.type === 'lv1') {
          // No reward for lv1 here. A small cost per lv1 town-day instead, so the solver captures the towns it
          // needs for the path just in time rather than holding them for days (keeps phase 2 flexible).
          milp.addCost(ownAt(g, d, t.id), PATH_FOOTPRINT_COST);
        } else {
          milp.addCost(ownAt(g, d, t.id), -pts * ptReward);
        }
      }
    }

    if (phase !== 'lv1' && lv3Terms.length > 0) {
      tieredMiss(`l3_g${g}`, lv3Terms, tgt.mapLv3, tiers(MISS_TIERS_SCARCE), 99);
    }

    if (phase !== 'lv1' && phase !== 'castle' && lv2Terms.length > 0) {
      tieredMiss(`l2_g${g}`, lv2Terms, tgt.mapLv2, tiers(MISS_TIERS_SCARCE), 99);
    }

    if (phase !== 'scarce' && phase !== 'castle') {
      tieredMiss(`pt_g${g}`, pointTerms, tgt.mapPts, tiers(MISS_TIERS_PTS), 999);
    }
  }

  // Every variable's value under `plan`, as a starting point for the solver (model.setSolution).
  // Without one, a re-solve of a window starts from nothing and spends its time limit catching up to
  // the plan it is meant to improve on; with one it starts level and looks for something better.
  // HiGHS checks the start rather than trusting it, so a plan that does not fit this model is simply
  // ignored - it can never make the answer illegal.
  const warmStart = (plan) => {
    const x = new Float64Array(milp.columnCount);
    // What guild g holds at (d, tId) under `plan`: the fixed value where the model fixed the cell.
    const held = (g, d, tId) => {
      const v = own[g][d][tId];
      if (typeof v === 'number') return v;
      return ((plan[d] || {})[tId] === GUILDS[g].id) ? 1 : 0;
    };
    for (let g = 0; g < GUILDS.length; g++) {
      for (let d = 0; d <= LASTD; d++) {
        for (const t of VALID_KINGDOMS) {
          const v = own[g][d][t.id];
          if (typeof v !== 'number') x[v.col] = held(g, d, t.id);
        }
      }
      for (let d = winStart; d <= LASTD; d++) {
        const ev = (enterVar[g] || [])[d];
        if (ev) x[ev.col] = VALID_KINGDOMS.some(k => held(g, d - 1, k.id)) ? 0 : 1;
        const gv = ((gainVar[g] || [])[d]) || {};
        for (const tId in gv) x[gv[tId].col] = (held(g, d, tId) && !held(g, d - 1, tId)) ? 1 : 0;
      }
      // Day-1 presence slack: 1 exactly when the plan leaves this guild off the map on day 1, so an
      // otherwise good warm start is not rejected as inconsistent.
      const lv = lateVar[g];
      if (lv) x[lv.col] = VALID_KINGDOMS.some(k => held(g, 1, k.id)) ? 0 : 1;
      // Same for the per-day "holds nothing" slack, so the warm start stays consistent.
      for (let d = winStart; d <= LASTD; d++) {
        const av = (absentVar[g] || [])[d];
        if (av) x[av.col] = VALID_KINGDOMS.some(k => held(g, d, k.id)) ? 0 : 1;
      }
    }
    // Whatever the plan misses its targets by goes into the slack tiers, cheapest tier first.
    for (const spec of missSpecs) {
      let sum = 0;
      for (const [k, v] of spec.terms) sum += k * (typeof v === 'number' ? v : x[v.col]);
      let left = sum - spec.rhs;
      const tiers = left > 0 ? spec.pos : spec.neg;
      left = Math.abs(left);
      for (const { v, cap } of tiers) {
        const take = Math.min(left, cap);
        x[v.col] = take;
        left -= take;
        if (left <= 1e-9) break;
      }
    }
    return Array.from(x);
  };

  const decode = (values) => {
    const plan = {};
    for (let d = 0; d < winStart; d++) plan[d] = { ...(srv.plan[d] || {}) };
    if (repair) for (let d = DAYS + 1; d <= FULL_DAYS; d++) plan[d] = { ...(srv.plan[d] || {}) };
    for (let d = winStart; d <= DAYS; d++) {
      plan[d] = {};
      for (const t of KINGDOMS) {
        const isReq = VALID_KINGDOMS.some(vk => vk.id === t.id);
        if (!isReq) {
          plan[d][t.id] = '';
          continue;
        }
        
        const holder = GUILDS.find((guild, g) => {
          const v = ownAt(g, d, t.id);
          const val = typeof v === 'number' ? v : values[v.col];
          return val > 0.5;
        });
        plan[d][t.id] = holder ? holder.id : '';
      }
    }
    return plan;
  };

  return { milp, decode, warmStart };
}
