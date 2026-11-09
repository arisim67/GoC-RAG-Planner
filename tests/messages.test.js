import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyPlans, formatMessages, DEFAULT_TEMPLATE } from '../js/messages.js';
import { calcDec } from '../js/calc.js';
import { getMapData } from '../js/maps/index.js';
import { fixture } from './helpers.js';

const level = { lv3: 3, lv2: 2, lv1: 1 };

for (const name of ['goc-wetland', 'ragnarok-poseidon']) {
  const srv = fixture(name);
  const kingdoms = getMapData(srv.mode, srv.mapKey).kingdoms;
  const type = Object.fromEntries(kingdoms.map(k => [k.id, k.type]));
  const valid = new Set(kingdoms.map(k => k.id));
  const townsOn = (d, gid) =>
    Object.entries(srv.plan[d] || {})
      .filter(([k, g]) => g === gid && valid.has(k))
      .map(([k]) => k);
  const plans = dailyPlans(srv);
  const { dec } = calcDec(srv);

  test(`${name}: guilds with no towns and no declares are left out`, () => {
    plans.forEach(({ d, guilds }) => {
      for (const g of srv.guilds) {
        const listed = guilds.some(x => x.g.id === g.id);
        const idle = townsOn(d, g.id).length === 0 && (dec[g.id][d] || []).length === 0;
        assert.equal(listed, !idle, `D${d + 1} ${g.name}`);
      }
    });
  });

  test(`${name}: guilds joining the map place def on the town they declare, with no backup advice`, () => {
    plans.forEach(({ d, guilds }) =>
      guilds.forEach(x => {
        if (townsOn(d, x.g.id).length > 0) return;
        assert.ok(x.declares.includes(x.defTown), `D${d + 1} ${x.g.name}`);
        assert.equal(x.defNote, '');
      }),
    );
  });

  test(`${name}: guilds being wiped place def on their highest-level town`, () => {
    plans.forEach(({ d, guilds }) =>
      guilds.forEach(x => {
        const before = townsOn(d, x.g.id);
        if (before.length === 0 || townsOn(d + 1, x.g.id).length > 0 || x.declares.length > 0) return;
        const best = Math.max(...before.map(k => level[type[k]]));
        assert.ok(before.includes(x.defTown), `D${d + 1} ${x.g.name}`);
        assert.equal(level[type[x.defTown]], best);
      }),
    );
  });

  test(`${name}: backup advice names one town, taken by the highest-listed guild`, () => {
    const order = id => srv.guilds.findIndex(g => g.id === id);
    plans.forEach(({ d, guilds }) =>
      guilds.forEach(x => {
        if (!x.defNote || x.giveaways.length === 0) return;
        const named = x.giveaways.filter(k => x.defNote.includes(` ${k} `));
        assert.equal(named.length, 1, `D${d + 1} ${x.g.name}: ${x.defNote}`);
        const rank = k => {
          const taker = srv.guilds.find(g => (dec[g.id][d] || []).includes(k));
          return taker ? order(taker.id) : Infinity;
        };
        assert.equal(rank(named[0]), Math.min(...x.giveaways.map(rank)));
      }),
    );
  });
}

test('the backup town is the one taken by the highest-listed guild (worked example)', () => {
  const srv = fixture('goc-wetland');
  const day10 = dailyPlans(srv)[9].guilds.find(x => x.g.name === 'Guild 2');
  assert.deepEqual([...day10.giveaways].sort(), ['Darkwick', 'J', 'N']);
  assert.equal(day10.defNote, 'or place smallest team on J if not available for battle phase');
});

test('default template keeps the original format', () => {
  const srv = fixture('ragnarok-poseidon');
  const [day1] = formatMessages(srv, dailyPlans(srv), DEFAULT_TEMPLATE);
  assert.match(day1, /^## D1 Wed 10\/21\n### Guild 1\n- Declares: .+\n- Giveaways: .+\n- Place def on .+/);
});

test('custom templates fill every placeholder', () => {
  const srv = fixture('ragnarok-poseidon');
  srv.guilds[0].msgName = 'Chickens ꒰ঌ(•͈⌔•͈)໒꒱';
  const tpl = {
    header: '# [{mm}-{dd}] {weekday} {day} {date} {server}\n',
    guild: '## {guild}\n- Declares: {declares}\n- Loses: {giveaways}\n- Def: {def-town}\n',
    empty: '--',
  };
  const msgs = formatMessages(srv, dailyPlans(srv), tpl);
  assert.ok(msgs[0].startsWith('# [10-21] Wed D1 10/21 Example Ragnarok\n\n## Chickens ꒰ঌ(•͈⌔•͈)໒꒱\n'));
  assert.ok(msgs[1].includes('- Loses: --'));
  assert.ok(!msgs.some(m => /\{[a-z-]+\}/.test(m)), 'no placeholder left unfilled');
});

test('plain guild names are escaped for Discord, message names are not', () => {
  const srv = fixture('ragnarok-poseidon');
  srv.guilds[0].name = 'x_x *star*';
  srv.guilds[1].msgName = '**Bold** guild';
  const [day1] = formatMessages(srv, dailyPlans(srv), DEFAULT_TEMPLATE);
  assert.ok(day1.includes('### x\\_x \\*star\\*'));
  assert.ok(day1.includes('### **Bold** guild'));
});
