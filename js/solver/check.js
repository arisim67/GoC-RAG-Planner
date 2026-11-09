// check.js  (Game of Claws)
// Plain-JS legality check of a finished plan. The refinement steps in twophase.js use it so that a solver result
// that ran out of time (and may be half-baked) can never replace a plan that is already legal.
// Returns a list of problems; an empty list means the plan follows the rules.
export function checkPlan(plan, srv, mapData, FULL, locks = null) {
  const ks = mapData.kingdoms;
  const problems = [];
  for (let d = 1; d <= FULL; d++) {
    if (!plan[d] || !plan[d - 1]) {
      problems.push(`missing day ${d}`);
      continue;
    }
    for (const g of srv.guilds) {
      const held = ks.filter(k => plan[d][k.id] === g.id);
      const prev = ks.filter(k => plan[d - 1][k.id] === g.id);
      const gained = held.filter(k => plan[d - 1][k.id] !== g.id);
      if (prev.length && !held.length) problems.push(`${g.name} loses every town on day ${d}`);
      if (gained.length > (g.isSmall ? 1 : 2)) problems.push(`${g.name} declares ${gained.length} towns on day ${d}`);
      for (const k of gained) {
        const adjacent = k.adj.some(a => plan[d - 1][a] === g.id);
        const entering = k.type === 'lv1' && prev.length === 0;
        if (!adjacent && !entering) problems.push(`${g.name} takes ${k.id} on day ${d} without a neighbouring town`);
        if (k.id === 'Darkwick') {
          const lv2 = prev.filter(x => x.type === 'lv2').length;
          const lv1 = prev.filter(x => x.type === 'lv1').length;
          if (lv2 + 0.5 * lv1 < 1 - 1e-9)
            problems.push(`${g.name} takes Darkwick on day ${d} without a dorm or two Lv1 towns`);
        }
      }
    }
  }
  if (locks) {
    for (let d = 1; d <= FULL; d++) {
      for (const k of ks) {
        const want = (locks[d] || {})[k.id];
        if (want && (plan[d] || {})[k.id] !== want) problems.push(`placed town ${k.id} on day ${d} was changed`);
      }
    }
  }
  return problems;
}
