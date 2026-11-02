// model_goc.js  (Game of Claws only: two-phase model, see twophase.js.
// Ragnarok keeps using model.js, which is untouched.)
import { MilpBuilder } from './milp.js';

// fromIdx: the (already fixed) day the reachability starts from. 0 = the event start.
function getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv, fromIdx = 0) {
  const reach = [];
  const startDay = srv.plan[fromIdx] || {};

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
      
      for (const t of KINGDOMS) {
        let canReach = prev[t.id];
        if (!canReach) canReach = t.adj.some(nId => prev[nId]);
        
        const heldYesterday = Object.values(prev).some(held => held);
        if (!heldYesterday && t.type === 'lv1') canReach = true;

        reach[g][d][t.id] = canReach;
      }
    }
  }
  return reach;
}

export function getPerfectTargets(srv, mapData) {
  const isGoC = srv.mode === 'goc';
  const DAYS = (srv.endDate && srv.startDate) 
    ? Math.max(1, Math.round((new Date(srv.endDate) - new Date(srv.startDate)) / 86400000) + 1)
    : (isGoC ? 12 : 6);

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const reach = getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv);

  const activeGuilds = GUILDS.filter(g => !( !isGoC && g.isExcluded ));
  const N = activeGuilds.length;
  
  const sortedGuilds = [...activeGuilds].sort((a, b) => 
    (parseInt(b.basePoints || 0, 10)) - (parseInt(a.basePoints || 0, 10))
  );

  const target = {};
  if (N > 0) {
    let mapLv3 = 0, mapLv2 = 0, mapPts = 0;
    
    for (let d = 1; d <= DAYS; d++) {
      for (const t of KINGDOMS) {
        let canReach = false;
        for (let g = 0; g < GUILDS.length; g++) {
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

    const baseLv3 = Math.floor(grandLv3 / N);
    const remLv3 = grandLv3 % N;
    sortedGuilds.forEach((g, i) => {
      const isBottom = i >= (N - remLv3);
      target[g.id].grandLv3 = baseLv3 + (isBottom ? 1 : 0);
    });
    
    for (let i = 0; i < grandLv2; i++) {
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
// opts.pathCells: { day: { lv1TownId: guildId } } (see paths.js)
const PATH_FOOTPRINT_COST = 25;

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
  const isFixedCell = (d, t) => phase === 'lv1' && (t.type !== 'lv1' || !!(pathCells[d] || {})[t.id]);

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const baseMaxDecl = isGoC ? 2 : 3;
  const pointValues = { 'lv3': 3, 'lv2': 2, 'lv1': 1 };

  const target = getPerfectTargets(srv, mapData);
  const reachFull = getReachableMatrix(GUILDS, KINGDOMS, FULL_DAYS, srv, fromIdx);

  const VALID_KINGDOMS = KINGDOMS.filter(t => {
    for (let d = winStart; d <= DAYS; d++) {
      for (let g = 0; g < GUILDS.length; g++) {
        if (reachFull[g][d][t.id]) return true;
      }
    }
    return false;
  });

  const activeGuilds = GUILDS.filter(g => !( !isGoC && g.isExcluded ));
  const N = activeGuilds.length;
  
  const sortedGuilds = [...activeGuilds].sort((a, b) => 
    (parseInt(b.basePoints || 0, 10)) - (parseInt(a.basePoints || 0, 10))
  );

  // 2. VARIABLE CREATION (With UI Locking)
  const own = [];
  for (let g = 0; g < GUILDS.length; g++) {
    own[g] = [];
    const isExcludedRag = !isGoC && GUILDS[g].isExcluded;

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
          else if (isExcludedRag) {
            own[g][d][t.id] = own[g][fromIdx][t.id];
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

  // 3. CORE CONSTRAINTS
  for (let d = winStart; d <= LASTD; d++) {
    for (const t of VALID_KINGDOMS) {
      const holders = GUILDS.map((guild, g) => [1, ownAt(g, d, t.id)]);
      milp.atMost(holders, 1); 
      const before = GUILDS.map((guild, g) => [-1, ownAt(g, d - 1, t.id)]);
      milp.atLeast([...holders, ...before], 0); 
    }

    for (let g = 0; g < GUILDS.length; g++) {
      if (!isGoC && GUILDS[g].isExcluded) continue;

      const declaredTerms = [];
      const maxDecl = (isGoC && GUILDS[g].isSmall) ? 1 : baseMaxDecl;
      // `entering` is exact: 1 iff the guild held NOTHING yesterday.
      // Disaggregated (one row per town) instead of a big-M, for a much tighter LP relaxation.
      const entering = milp.binary(`enter_g${g}_d${d}`);
      const prevVars = VALID_KINGDOMS.map(k => ownAt(g, d - 1, k.id));
      for (const pv of prevVars) milp.atMost([ [1, entering], [1, pv] ], 1);
      milp.atLeast([ [1, entering], ...prevVars.map(pv => [1, pv]) ], 1);

      // No map wipes: if the guild held something yesterday (entering = 0), it must hold something today.
      milp.atLeast([ [1, entering], ...VALID_KINGDOMS.map(k => [1, ownAt(g, d, k.id)]) ], 1);

      // Two-phase planning: every guild is on the map from day 1 (a guild that starts empty enters on day 1).
      // Otherwise phase 1 leaves such guilds off the map for days, and the lv1 path locked for phase 2
      // would depend on them still being empty.
      if (phase === 'scarce' && d === 1) {
        milp.atLeast(VALID_KINGDOMS.map(k => [1, ownAt(g, d, k.id)]), 1);
      }

      for (const t of VALID_KINGDOMS) {
        const now = ownAt(g, d, t.id);
        const before = ownAt(g, d - 1, t.id);

        if (now === 0 && before === 0) continue;

        const gain = milp.continuous(`gain_g${g}_d${d}_${t.id}`, 0, 1);
        declaredTerms.push([1, gain]);
        
        milp.addCost(gain, 1); 

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
      if (phase === 'lv1' && isFixedCell(d, t)) continue;   // only FREE towns can be handed out in this phase
      supply.rest[t.type]++;
      if (d <= DAYS) supply.win[t.type]++;
    }
  }
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
    if (!isGoC && GUILDS[g].isExcluded) continue;

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
      for (let d = winStart; d <= FULL_DAYS; d++) {
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
    
    const basePen = 6000;
    const penLv3 = basePen + (isBot ? offset : -offset); 
    const penLv2 = basePen + (isBot ? offset : -offset);
    const penPts = basePen + (isBot ? offset : -offset);

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
        
        if (phase === 'scarce' && t.type === 'lv1') {
          // No reward for lv1 here. A small cost per lv1 town-day instead, so the solver captures the towns it
          // needs for the path just in time rather than holding them for days (keeps phase 2 flexible).
          milp.addCost(ownAt(g, d, t.id), PATH_FOOTPRINT_COST);
        } else {
          milp.addCost(ownAt(g, d, t.id), -pts * ptReward);
        }
      }
    }

    if (phase !== 'lv1' && lv3Terms.length > 0) {
      const sPosL3 = milp.continuous(`spos_l3_g${g}`, 0, 99);
      const sNegL3 = milp.continuous(`sneg_l3_g${g}`, 0, 99);
      milp.equal([ ...lv3Terms, [-1, sPosL3], [1, sNegL3] ], tgt.mapLv3);
      milp.addCost(sPosL3, penLv3);
      milp.addCost(sNegL3, penLv3);
    }

    if (phase !== 'lv1' && lv2Terms.length > 0) {
      const sPosL2 = milp.continuous(`spos_l2_g${g}`, 0, 99);
      const sNegL2 = milp.continuous(`sneg_l2_g${g}`, 0, 99);
      milp.equal([ ...lv2Terms, [-1, sPosL2], [1, sNegL2] ], tgt.mapLv2);
      milp.addCost(sPosL2, penLv2);
      milp.addCost(sNegL2, penLv2);
    }

    if (phase !== 'scarce') {
      const sPosPts = milp.continuous(`spos_pt_g${g}`, 0, 999);
      const sNegPts = milp.continuous(`sneg_pt_g${g}`, 0, 999);
      milp.equal([ ...pointTerms, [-1, sPosPts], [1, sNegPts] ], tgt.mapPts);
      milp.addCost(sPosPts, penPts);
      milp.addCost(sNegPts, penPts);
    }
  }

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

  return { milp, decode };
}