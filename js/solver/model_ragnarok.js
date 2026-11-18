// model_ragnarok.js
import { MilpBuilder } from './milp.js';

function getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv) {
  const reach = [];
  const startDay = srv.plan[0] || {};

  for (let g = 0; g < GUILDS.length; g++) {
    const gid = GUILDS[g].id;
    reach[g] = [];

    reach[g][0] = {};
    for (const t of KINGDOMS) {
      reach[g][0][t.id] = startDay[t.id] === gid;
    }

    for (let d = 1; d <= DAYS; d++) {
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
  const DAYS =
    srv.endDate && srv.startDate
      ? Math.max(1, Math.round((new Date(srv.endDate) - new Date(srv.startDate)) / 86400000) + 1)
      : isGoC
        ? 12
        : 6;

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const reach = getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv);

  const activeGuilds = GUILDS.filter(g => !(!isGoC && g.isExcluded));
  const excludedGuilds = GUILDS.filter(g => !isGoC && g.isExcluded);
  const N = activeGuilds.length;

  const target = {};
  GUILDS.forEach(g => {
    target[g.id] = { grandLv3: 0, grandLv2: 0, grandPts: 0, mapLv3: 0, mapLv2: 0, mapPts: 0 };
  });

  // 1. Isolate Excluded Guilds' locked points
  const startDay = srv.plan[0] || {};
  const excludedHeldTowns = new Set();

  excludedGuilds.forEach(g => {
    let eL3 = parseInt(g.baseLv3 || 0, 10);
    let eL2 = parseInt(g.baseLv2 || 0, 10);
    let ePts = parseInt(g.basePoints || 0, 10);

    for (let d = 1; d <= DAYS; d++) {
      for (const t of KINGDOMS) {
        if (startDay[t.id] === g.id) {
          if (d === 1) excludedHeldTowns.add(t.id); // Track permanently blocked towns
          if (t.type === 'lv3') {
            eL3++;
            ePts += 3;
          }
          if (t.type === 'lv2') {
            eL2++;
            ePts += 2;
          }
          if (t.type === 'lv1') {
            ePts += 1;
          }
        }
      }
    }
    target[g.id].grandLv3 = eL3;
    target[g.id].grandLv2 = eL2;
    target[g.id].grandPts = ePts;
  });

  // 2. Calculate reachable points strictly for ACTIVE guilds
  if (N > 0) {
    let mapLv3 = 0,
      mapLv2 = 0,
      mapPts = 0;

    for (let d = 1; d <= DAYS; d++) {
      for (const t of KINGDOMS) {
        // If an excluded guild holds this town, active guilds cannot take it
        if (excludedHeldTowns.has(t.id)) continue;

        let canReach = false;
        for (let g = 0; g < GUILDS.length; g++) {
          if (!isGoC && GUILDS[g].isExcluded) continue; // Ignore excluded guilds' reachability
          if (reach[g][d][t.id]) {
            canReach = true;
            break;
          }
        }

        if (canReach) {
          if (t.type === 'lv3') {
            mapLv3++;
            mapPts += 3;
          }
          if (t.type === 'lv2') {
            mapLv2++;
            mapPts += 2;
          }
          if (t.type === 'lv1') {
            mapPts += 1;
          }
        }
      }
    }

    let grandLv3 = mapLv3,
      grandLv2 = mapLv2,
      grandPts = mapPts;
    const sortedGuilds = [...activeGuilds].sort(
      (a, b) => parseInt(b.basePoints || 0, 10) - parseInt(a.basePoints || 0, 10),
    );

    sortedGuilds.forEach(g => {
      grandLv3 += parseInt(g.baseLv3 || 0, 10);
      grandLv2 += parseInt(g.baseLv2 || 0, 10);
      grandPts += parseInt(g.basePoints || 0, 10);
    });

    const split = splitTargets(sortedGuilds, grandLv3, grandLv2, grandPts);
    sortedGuilds.forEach(g => Object.assign(target[g.id], split[g.id]));

    sortedGuilds.forEach(g => {
      target[g.id].mapLv3 = Math.max(0, target[g.id].grandLv3 - parseInt(g.baseLv3 || 0, 10));
      target[g.id].mapLv2 = Math.max(0, target[g.id].grandLv2 - parseInt(g.baseLv2 || 0, 10));
      target[g.id].mapPts = Math.max(0, target[g.id].grandPts - parseInt(g.basePoints || 0, 10));
    });
  }
  return target;
}

// Share the event's castle days, dorm days and points out between the active guilds, whose order
// (most starting points first) breaks ties. Returns { [guildId]: { grandLv3, grandLv2, grandPts } }.
//
// Castle days: a flat share, the remainder to the guilds at the bottom.
// Dorm days: normally they make up for the castle - handed out one at a time to whoever has least from
//   the castle and dorms so far, so a guild with an extra castle day gets fewer dorms (11/11/11/9 with
//   one guild on two castle days).
//   But when the points left over after an even split land exactly on the guilds WITHOUT an extra castle
//   day, those guilds already come out a point ahead; giving them extra dorms on top would tip it too
//   far. Then the dorms are split evenly instead (9/9/9/9), and the castle difference is made up in towns.
// Points: whatever is left (the towns) goes one point at a time to whoever has the lowest total.
export function splitTargets(sortedGuilds, grandLv3, grandLv2, grandPts) {
  const N = sortedGuilds.length;
  const t = {};
  sortedGuilds.forEach(g => (t[g.id] = { grandLv3: 0, grandLv2: 0, grandPts: 0 }));

  const baseLv3 = Math.floor(grandLv3 / N);
  const remLv3 = grandLv3 % N;
  sortedGuilds.forEach((g, i) => {
    t[g.id].grandLv3 = baseLv3 + (i >= N - remLv3 ? 1 : 0);
  });

  // The guilds without an extra castle day, and how many guilds end a point ahead overall
  const fewerCastle = remLv3 ? N - remLv3 : 0;
  const evenDorms = remLv3 > 0 && grandPts % N === fewerCastle;

  const value = id => t[id].grandLv3 * 3 + t[id].grandLv2 * 2;
  // A dorm goes to whoever has least so far; on a tie, to the guild lower down the list, since the
  // top guild already gets the first-place rewards.
  const giveDorm = () => {
    let best = 0;
    for (let j = 1; j < N; j++) if (value(sortedGuilds[j].id) <= value(sortedGuilds[best].id)) best = j;
    t[sortedGuilds[best].id].grandLv2++;
  };
  if (evenDorms) {
    const base = Math.floor(grandLv2 / N);
    sortedGuilds.forEach(g => (t[g.id].grandLv2 = base));
    for (let i = 0; i < grandLv2 % N; i++) giveDorm();
  } else {
    for (let i = 0; i < grandLv2; i++) giveDorm();
  }

  sortedGuilds.forEach(g => (t[g.id].grandPts = value(g.id)));
  const remaining = grandPts - (grandLv3 * 3 + grandLv2 * 2);
  for (let i = 0; i < remaining; i++) {
    let best = 0;
    for (let j = 1; j < N; j++) {
      const a = t[sortedGuilds[j].id],
        b = t[sortedGuilds[best].id];
      // with even dorms, a tie goes to the guild with fewer castle days, so it gets the extra point
      if (a.grandPts < b.grandPts || (evenDorms && a.grandPts === b.grandPts && a.grandLv3 < b.grandLv3)) best = j;
    }
    t[sortedGuilds[best].id].grandPts++;
  }
  return t;
}

// buildModel(srv, mapData) -> { milp, decode, totals, slacks }
//
// Auto-Optimize solves Ragnarok in two passes over the same model:
//   1. fair: the score targets, as below. Fast, but it stops as soon as the spread is fair, so the plan
//      can still have moves it doesn't need.
//   2. tidy: buildModel(srv, mapData, { fixed }) with fixed = totals(pass 1 result). Every guild must
//      end with exactly the castle days, dorm days and points it got in pass 1, and only the tidiness
//      costs are left, so the solver spends all its time cutting moves. Started from the pass 1 plan.
export function buildModel(srv, mapData, opts = {}) {
  const fixed = opts.fixed || null;
  const milp = new MilpBuilder();
  const isGoC = srv.mode === 'goc';

  const DAYS =
    srv.endDate && srv.startDate
      ? Math.max(1, Math.round((new Date(srv.endDate) - new Date(srv.startDate)) / 86400000) + 1)
      : isGoC
        ? 12
        : 6;

  const GUILDS = srv.guilds;
  const KINGDOMS = mapData.kingdoms;
  const baseMaxDecl = isGoC ? 2 : 3;
  const pointValues = { lv3: 3, lv2: 2, lv1: 1 };

  // Tidiness, in order of importance. All of it only breaks ties between plans that are equally fair:
  // missing a guild's point or occupation target costs about 6000.
  //
  // 1. Fewer moves. Every declare costs DECLARE_COST, so the solver doesn't shuffle towns around for
  //    nothing - a guild losing a town and taking it back later is two declares that change nobody's
  //    total.
  // 2. No declares on the last day. A declare on the final day earns its guild a single day of the town
  //    and has to be made on the day everyone is busy finishing, so it costs a little extra. It stays
  //    BELOW one declare, so the solver never adds a move earlier on just to get rid of one on the last
  //    day: fewer moves wins.
  // 3. The castle: a guild that gets it for two days should have those days at the end, so the run
  //    finishes on it. Taking the castle on the last day is what stops that, so it costs a little more,
  //    but still less than two extra moves elsewhere.
  const DECLARE_COST = 150;
  const FINAL_DECLARE_COST = 100;
  const FINAL_CASTLE_COST = 200;

  const target = getPerfectTargets(srv, mapData);
  const reachFull = getReachableMatrix(GUILDS, KINGDOMS, DAYS, srv);

  const VALID_KINGDOMS = KINGDOMS.filter(t => {
    for (let d = 1; d <= DAYS; d++) {
      for (let g = 0; g < GUILDS.length; g++) {
        if (reachFull[g][d][t.id]) return true;
      }
    }
    return false;
  });

  const activeGuilds = GUILDS.filter(g => !(!isGoC && g.isExcluded));
  const N = activeGuilds.length;

  const sortedGuilds = [...activeGuilds].sort(
    (a, b) => parseInt(b.basePoints || 0, 10) - parseInt(a.basePoints || 0, 10),
  );

  // 2. VARIABLE CREATION (With UI Locking)
  const own = [];
  for (let g = 0; g < GUILDS.length; g++) {
    own[g] = [];
    const isExcludedRag = !isGoC && GUILDS[g].isExcluded;

    for (let d = 0; d <= DAYS; d++) {
      own[g][d] = {};
      for (const t of VALID_KINGDOMS) {
        if (d === 0) {
          own[g][0][t.id] = (srv.plan[0] || {})[t.id] === GUILDS[g].id ? 1 : 0;
        } else {
          // 🚨 THE UI LOCK: If you manually place a guild on a day in the UI,
          // the math engine freezes it permanently to help the solver.
          const manualLockGid = (srv.plan[d] || {})[t.id];

          if (manualLockGid) {
            own[g][d][t.id] = manualLockGid === GUILDS[g].id ? 1 : 0;
          } else if (isExcludedRag) {
            own[g][d][t.id] = own[g][0][t.id];
          } else if (!reachFull[g][d][t.id]) {
            own[g][d][t.id] = 0;
          } else {
            own[g][d][t.id] = milp.binary(`own_g${g}_d${d}_${t.id}`);
          }
        }
      }
    }
  }
  const ownAt = (g, d, tId) => own[g][d][tId];

  // 3. CORE CONSTRAINTS
  for (let d = 1; d <= DAYS; d++) {
    for (const t of VALID_KINGDOMS) {
      const holders = GUILDS.map((guild, g) => [1, ownAt(g, d, t.id)]);
      milp.atMost(holders, 1);
      const before = GUILDS.map((guild, g) => [-1, ownAt(g, d - 1, t.id)]);
      milp.atLeast([...holders, ...before], 0);
    }

    for (let g = 0; g < GUILDS.length; g++) {
      if (!isGoC && GUILDS[g].isExcluded) continue;

      const declaredTerms = [];
      const maxDecl = isGoC && GUILDS[g].isSmall ? 1 : baseMaxDecl;
      const entering = milp.binary(`enter_g${g}_d${d}`);
      const townsYesterday = VALID_KINGDOMS.map(k => [1, ownAt(g, d - 1, k.id)]);

      milp.atMost([...townsYesterday, [999, entering]], 999);

      for (const t of VALID_KINGDOMS) {
        const now = ownAt(g, d, t.id);
        const before = ownAt(g, d - 1, t.id);

        if (now === 0 && before === 0) continue;

        const gain = milp.continuous(`gain_g${g}_d${d}_${t.id}`, 0, 1);
        declaredTerms.push([1, gain]);

        milp.addCost(gain, DECLARE_COST);

        if (d === DAYS) {
          milp.addCost(gain, FINAL_DECLARE_COST);
          // Taking the castle on the last day is what stops the two-day holder finishing on it.
          if (t.type === 'lv3') milp.addCost(gain, FINAL_CASTLE_COST);
        }

        milp.atMost(
          [
            [1, now],
            [-1, before],
            [-1, gain],
          ],
          0,
        );
        milp.atMost(
          [
            [1, gain],
            [-1, now],
          ],
          0,
        );
        milp.atMost(
          [
            [1, gain],
            [1, before],
          ],
          1,
        );

        const adjConstraint = [
          [1, now],
          [-1, before],
        ];
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
          milp.atMost([[1, gain], ...lv2Terms, ...lv1Terms], 0);
        }
      }

      if (declaredTerms.length > 0) {
        milp.atMost(declaredTerms, maxDecl);

        const beachheadTerms = [...declaredTerms];
        let rhs = 1;
        for (const k of VALID_KINGDOMS) {
          const prevVar = ownAt(g, d - 1, k.id);
          if (typeof prevVar === 'number') {
            rhs -= -maxDecl * prevVar;
          } else if (prevVar !== undefined) {
            beachheadTerms.push([-maxDecl, prevVar]);
          }
        }
        milp.atMost(beachheadTerms, rhs);
      }
    }
  }

  // 4. OBJECTIVE & ELASTIC WEIGHTS
  // In the tidy pass (fixed) each total must come out exactly as it did in the fair pass: same slack
  // columns, so pass 1's plan still fits as a starting point, but held at 0 against the pass 1 totals.
  const termsOf = [];
  const slacks = [];
  const slack = (name, max) => {
    const v = milp.continuous(name, 0, fixed ? 0 : max);
    slacks.push(v);
    return v;
  };
  for (let i = 0; i < N; i++) {
    const guild = sortedGuilds[i];
    const g = GUILDS.findIndex(x => x.id === guild.id);
    if (!isGoC && GUILDS[g].isExcluded) continue;

    const tgt = fixed
      ? fixed[g]
      : { lv3: target[guild.id].mapLv3, lv2: target[guild.id].mapLv2, pts: target[guild.id].mapPts };
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
    termsOf[g] = { lv3: lv3Terms, lv2: lv2Terms, pts: pointTerms };

    for (let d = 1; d <= DAYS; d++) {
      for (const t of VALID_KINGDOMS) {
        if (t.type === 'lv3') lv3Terms.push([1, ownAt(g, d, t.id)]);
        if (t.type === 'lv2') lv2Terms.push([1, ownAt(g, d, t.id)]);

        const pts = pointValues[t.type] || 0;
        pointTerms.push([pts, ownAt(g, d, t.id)]);

        if (!fixed) milp.addCost(ownAt(g, d, t.id), -pts * ptReward);
      }
    }

    if (lv3Terms.length > 0) {
      const sPosL3 = slack(`spos_l3_g${g}`, 99);
      const sNegL3 = slack(`sneg_l3_g${g}`, 99);
      milp.equal([...lv3Terms, [-1, sPosL3], [1, sNegL3]], tgt.lv3);
      milp.addCost(sPosL3, penLv3);
      milp.addCost(sNegL3, penLv3);
    }

    if (lv2Terms.length > 0) {
      const sPosL2 = slack(`spos_l2_g${g}`, 99);
      const sNegL2 = slack(`sneg_l2_g${g}`, 99);
      milp.equal([...lv2Terms, [-1, sPosL2], [1, sNegL2]], tgt.lv2);
      milp.addCost(sPosL2, penLv2);
      milp.addCost(sNegL2, penLv2);
    }

    const sPosPts = slack(`spos_pt_g${g}`, 999);
    const sNegPts = slack(`sneg_pt_g${g}`, 999);
    milp.equal([...pointTerms, [-1, sPosPts], [1, sNegPts]], tgt.pts);
    milp.addCost(sPosPts, penPts);
    milp.addCost(sNegPts, penPts);
  }

  const decode = values => {
    const plan = { 0: { ...srv.plan[0] } };
    for (let d = 1; d <= DAYS; d++) {
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

  // Each guild's castle days, dorm days and points in a solver result (the fixed totals for pass 2)
  const totals = values => {
    const val = v => (typeof v === 'number' ? v : Math.round(values[v.col]));
    const sum = terms => terms.reduce((n, [k, v]) => n + k * val(v), 0);
    const out = {};
    termsOf.forEach((t, g) => {
      if (t) out[g] = { lv3: sum(t.lv3), lv2: sum(t.lv2), pts: sum(t.pts) };
    });
    return out;
  };

  return { milp, decode, totals, slacks };
}
