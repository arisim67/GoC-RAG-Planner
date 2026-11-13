import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyPlans,
  formatMessages,
  formatGuildMessage,
  decodeTemplate,
  DEFAULT_TEMPLATE,
  GAME_LIMIT,
} from '../js/messages.js';
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
  assert.match(day1, /^## Day 1 Wed 10\/21\n### Guild 1\n- Declares: .+\n- Giveaways: .+\n- Place def on .+/);
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
  assert.ok(msgs[0].startsWith('# [10-21] Wed Day 1 10/21 Example Ragnarok\n\n## Chickens ꒰ঌ(•͈⌔•͈)໒꒱\n'));
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

test('weekday can be long, and {n} is the bare day number', () => {
  const srv = fixture('ragnarok-poseidon');
  const tpl = { ...DEFAULT_TEMPLATE, header: '{weekday} {n} | {label}', weekday: 'long' };
  const [day1] = formatMessages(srv, dailyPlans(srv), tpl);
  assert.ok(day1.startsWith('Wednesday 1 | Day 1 Wednesday 10/21\n'));
});

test('a day nobody declares or gives anything away uses the quiet message, if set', () => {
  const srv = fixture('ragnarok-poseidon');
  srv.plan[2] = { ...srv.plan[1] }; // Day 2 the same as Day 1: no declares, no giveaways
  const plans = dailyPlans(srv);
  assert.ok(plans[1].guilds.length && plans[1].guilds.every(x => !x.declares.length && !x.giveaways.length));
  const quiet = { ...DEFAULT_TEMPLATE, quiet: '## {label}\nNo moves today, hold your towns!' };
  assert.equal(formatMessages(srv, plans, quiet)[1], '## Day 2 Thu 10/22\nNo moves today, hold your towns!');
  assert.notEqual(formatMessages(srv, plans, quiet)[0], formatMessages(srv, plans, DEFAULT_TEMPLATE)[1]);
  // Left blank: the usual message
  assert.match(formatMessages(srv, plans, DEFAULT_TEMPLATE)[1], /^## Day 2 .*\n### /);
});

test('guild message: in-game format, full names, empty lines dropped, fits the limit', () => {
  const srv = fixture('goc-wetland');
  const plans = dailyPlans(srv);
  for (const p of plans)
    for (const x of p.guilds) {
      const m = formatGuildMessage(srv, p, x.g.id, DEFAULT_TEMPLATE);
      // Over the limit only if even short names can't bring it under
      if (m.length > GAME_LIMIT)
        assert.ok(/\b(Castle|Hota|Sino|Vaga|Frost|Dio|Obsc|Mort|Jabber)\b/.test(m), `Day ${p.d + 1} ${x.g.name}`);
      assert.ok(!/\{[a-z-]+\}/.test(m), 'no placeholder left unfilled');
      assert.equal(m.split('\n')[1], 'GoC:');
      assert.ok(/ for rewards($|\n)/.test(m));
      if (!x.giveaways.length) assert.ok(!m.includes('Giveaway'), 'no Giveaway line without giveaways');
      if (!x.defNote) assert.ok(!m.includes('battle phase'), 'no backup line without backup advice');
      const short = m.includes('Castle') || /\b(Hota|Sino|Vaga|Frost|Dio|Obsc|Mort|Jabber)\b/.test(m);
      const full = formatGuildMessage(srv, p, x.g.id, { ...DEFAULT_TEMPLATE, short: false });
      if (!short && x.giveaways.length)
        assert.ok(m.includes(`• Giveaway: ${x.giveaways.join(' & ')}`), 'full names when it fits');
      assert.equal(full, m);
    }
  // One that may not get its def town in time spells out the backup on its own line
  const withBackup = plans.flatMap(p => p.guilds.map(x => ({ p, x }))).find(({ x }) => x.backup);
  assert.ok(withBackup, 'the fixture has a backup town somewhere');
  const m = formatGuildMessage(srv, withBackup.p, withBackup.x.g.id, DEFAULT_TEMPLATE);
  assert.match(m, /• Place def on \S+ for rewards\n• Smallest team on \S+ if not available for battle phase$/);
  assert.ok(m.includes(`Smallest team on ${withBackup.x.backup} `), 'names the backup town');
  // A guild not in the day gets nothing
  assert.equal(formatGuildMessage(srv, { d: 0, guilds: [] }, srv.guilds[0].id, DEFAULT_TEMPLATE), '');
});

test('guild message: short names when it would be too long, or always if set', () => {
  const srv = fixture('goc-wetland');
  const p = dailyPlans(srv).find(pl => pl.guilds.some(x => x.declares.includes('Darkwick')));
  const x = p.guilds.find(e => e.declares.includes('Darkwick'));
  const full = formatGuildMessage(srv, p, x.g.id, DEFAULT_TEMPLATE);
  assert.ok(full.includes('Darkwick') && full.length <= GAME_LIMIT);
  const always = formatGuildMessage(srv, p, x.g.id, { ...DEFAULT_TEMPLATE, short: true });
  assert.ok(always.includes('Castle') && !always.includes('Darkwick'));
  // A long template pushes it over: short names kick in
  const long = { ...DEFAULT_TEMPLATE, game: DEFAULT_TEMPLATE.game + '\n' + 'x'.repeat(GAME_LIMIT - full.length + 1) };
  const m = formatGuildMessage(srv, p, x.g.id, long);
  assert.ok(m.includes('Castle') && !m.includes('Darkwick'));
});

test('guild message: quiet message when the guild does nothing, if set', () => {
  const srv = fixture('ragnarok-poseidon');
  srv.plan[2] = { ...srv.plan[1] };
  const p = dailyPlans(srv)[1];
  const g = p.guilds[0].g;
  const tpl = { ...DEFAULT_TEMPLATE, gameQuiet: '{weekday} | {date}\n{mode}:\n• Hold, place def on {def}' };
  assert.match(formatGuildMessage(srv, p, g.id, tpl), /^Thu \| 10\/22\nRAG:\n• Hold, place def on .+$/);
});

test('template links: new fields round-trip, old links still open', () => {
  const tpl = { ...DEFAULT_TEMPLATE, weekday: 'long', quiet: 'q', game: 'g {def}', short: true };
  const code = (t => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ h: t.header, g: t.guild, e: t.empty, q: t.quiet, w: t.weekday, i: t.game, iq: '', s: t.short }),
    );
    return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  })(tpl);
  const back = decodeTemplate('https://x.example/#tpl=' + code);
  assert.equal(back.weekday, 'long');
  assert.equal(back.quiet, 'q');
  assert.equal(back.game, 'g {def}');
  assert.equal(back.short, true);
  const old = Buffer.from(JSON.stringify({ h: '## {label}', g: '### {guild}', e: '-' })).toString('base64');
  const o = decodeTemplate(old.replace(/=+$/, ''));
  assert.equal(o.header, '## {label}');
  assert.equal(o.weekday, 'short');
  assert.equal(o.game, DEFAULT_TEMPLATE.game);
  assert.equal(o.short, false);
});
