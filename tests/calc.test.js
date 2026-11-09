import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcScores, calcOcc, calcDec, validateAdj, validateWipes, kPts } from '../js/calc.js';
import { numDays } from '../js/state.js';
import { getMapData } from '../js/maps/index.js';
import { fixture } from './helpers.js';

for (const name of ['goc-wetland', 'ragnarok-poseidon']) {
  const srv = fixture(name);
  const days = numDays(srv);
  const kingdoms = getMapData(srv.mode, srv.mapKey).kingdoms;

  test(`${name}: every point on the map goes to someone`, () => {
    const { cumul } = calcScores(srv);
    const awarded = srv.guilds.reduce((sum, g) => sum + cumul[g.id][days - 1], 0);
    let held = 0;
    for (let d = 1; d <= days; d++) {
      for (const k of kingdoms) if (srv.plan[d] && srv.plan[d][k.id]) held += kPts(k.type);
    }
    assert.equal(awarded, held);
  });

  test(`${name}: occupation totals add up`, () => {
    const occ = calcOcc(srv);
    for (const g of srv.guilds) {
      const o = occ[g.id];
      assert.equal(o.total, o.lv1 + o.lv2 + o.lv3);
    }
  });

  test(`${name}: the example plan is legal`, () => {
    assert.deepEqual(validateAdj(srv), []);
    assert.deepEqual(validateWipes(srv), []);
  });

  test(`${name}: declares and giveaways match each other`, () => {
    const { dec, give } = calcDec(srv);
    for (let d = 0; d < days; d++) {
      const declared = srv.guilds.flatMap(g => dec[g.id][d] || []).sort();
      const given = srv.guilds.flatMap(g => give[g.id][d] || []).sort();
      // Every town given away is declared on by someone (towns can also be taken from nobody).
      for (const k of given) assert.ok(declared.includes(k), `D${d + 1}: ${k} given away but nobody declares on it`);
    }
  });
}
