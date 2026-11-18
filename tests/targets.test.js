import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitTargets } from '../js/solver/model_ragnarok.js';

// Guilds in the order getPerfectTargets passes them: most starting points first
const guilds = ['a', 'b', 'c', 'd'].map(id => ({ id }));
const show = t => guilds.map(g => [t[g.id].grandLv3, t[g.id].grandLv2, t[g.id].grandPts]);

test('Ragnarok: castles 1/1/2/2, the extra points land on the guilds without the extra castle day: even dorms', () => {
  // [castle days, dorm days, points]
  assert.deepEqual(show(splitTargets(guilds, 6, 36, 186)), [
    [1, 9, 47],
    [1, 9, 47],
    [2, 9, 46],
    [2, 9, 46],
  ]);
});

test('Ragnarok: castles 1/1/1/2 with one extra point: the dorms make up for the castle', () => {
  assert.deepEqual(show(splitTargets(guilds, 5, 42, 201)), [
    [1, 11, 51],
    [1, 11, 50],
    [1, 11, 50],
    [2, 9, 50],
  ]);
});

test('Ragnarok: everything divides evenly', () => {
  assert.deepEqual(show(splitTargets(guilds, 8, 40, 200)), [
    [2, 10, 50],
    [2, 10, 50],
    [2, 10, 50],
    [2, 10, 50],
  ]);
});

test('Ragnarok: shares always add up to the totals', () => {
  for (const [l3, l2, pts] of [
    [5, 41, 199],
    [6, 37, 187],
    [7, 30, 170],
    [3, 18, 90],
  ]) {
    const t = splitTargets(guilds, l3, l2, pts);
    const sum = k => guilds.reduce((s, g) => s + t[g.id][k], 0);
    assert.deepEqual([sum('grandLv3'), sum('grandLv2'), sum('grandPts')], [l3, l2, pts]);
  }
});
