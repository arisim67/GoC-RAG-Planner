// paths.js
// After phase 1 (Darkwick + dorms balanced), work out which lv1 towns each guild MUST hold, and on which
// days, so that every Darkwick / dorm capture stays reachable. Those "path" cells are then locked for phase 2;
// every other lv1 cell is free for the points-balancing step.
//
// Returns { [day]: { [lv1TownId]: guildId } } for days 1..FULL_DAYS.
// rng (optional): a () => [0,1) function. Used to break ties between equally good supports differently,
// which gives phase 2 different locked paths to try. Without it the choice is deterministic.
export function extractPathCells(plan, srv, mapData, FULL_DAYS, rng = null) {
  const ks = mapData.kingdoms;
  const byId = Object.fromEntries(ks.map(k => [k.id, k]));
  const path = {};
  for (let d = 1; d <= FULL_DAYS; d++) path[d] = {};

  for (const guild of srv.guilds) {
    const held = [];
    const req = [];
    for (let d = 0; d <= FULL_DAYS; d++) {
      const towns = ks.filter(k => (plan[d] || {})[k.id] === guild.id);
      held[d] = new Set(towns.map(k => k.id));
      req[d] = new Set(towns.filter(k => k.type !== 'lv1').map(k => k.id)); // Darkwick + dorms: always fixed
    }

    // Walk backwards: every required holding needs either to persist from yesterday, or a held neighbor yesterday.
    for (let d = FULL_DAYS; d >= 1; d--) {
      const prev = held[d - 1];
      for (const x of [...req[d]]) {
        const k = byId[x];
        if (prev.has(x)) {
          req[d - 1].add(x);
          continue;
        } // already held yesterday: keep holding it
        if (k.type === 'lv1' && prev.size === 0) continue; // entering the map from nothing: no path needed
        const cands = k.adj.filter(n => prev.has(n));
        if (cands.length === 0) continue; // not expected in a legal plan
        const choose = arr => (rng ? arr[Math.floor(rng() * arr.length)] : arr[0]);
        const reused = cands.filter(n => req[d - 1].has(n)); // reuse a town we already need
        const dorms = cands.filter(n => byId[n].type !== 'lv1'); // else prefer a dorm/Darkwick
        const pick =
          rng && rng() < 0.3
            ? choose(cands) // (sometimes explore another support)
            : reused.length
              ? choose(reused)
              : dorms.length
                ? choose(dorms)
                : choose(cands);
        req[d - 1].add(pick);

        if (x === 'Darkwick') {
          // needs 1 dorm, or 2 lv1 towns, held the day before
          const hasDorm = [...prev].some(n => byId[n].type === 'lv2');
          if (!hasDorm) {
            const lv1s = [...prev].filter(n => byId[n].type === 'lv1');
            let have = lv1s.filter(n => req[d - 1].has(n)).length;
            for (const n of lv1s) {
              if (have >= 2) break;
              if (!req[d - 1].has(n)) {
                req[d - 1].add(n);
                have++;
              }
            }
          }
        }
      }
    }

    for (let d = 1; d <= FULL_DAYS; d++) {
      for (const x of req[d]) if (byId[x].type === 'lv1') path[d][x] = guild.id;
    }
  }
  return path;
}
