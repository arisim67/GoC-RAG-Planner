// js/messages.js
// Daily messages: works out what each guild does each day (declares, giveaways, where to place def)
// and writes it out using a message template. There are two kinds:
//  - the server message, every guild's part for the day, for Discord;
//  - the guild message, one guild's part, short enough for Tokyo Debunker's in-game chat (150
//    characters), with its own template. Buildings get their short names (Darkwick as "Castle",
//    and so on) when a message would be too long, or always if the template says so.
// Templates are saved once per browser and used for every server. Each guild can also have an
// optional "name in messages" (for emoji and decorations) that only appears in messages, not in the
// tables.
//
// Templates can be shared as a link: everything is packed into the part after "#tpl=", which
// browsers never send to any server. Opening the link shows the template in the editor to try out
// before saving it. The link (or the code after "#tpl=") can also be pasted into the editor.

import { activeSrv, numDays, save } from './state.js';
import { esc, showToast, todayDay } from './ui.js';
import { calcDec } from './calc.js';
import { getMapData } from './maps/index.js';
import { renderDiscord } from './discord-md.js';
import { isOldSite, newSiteUrl } from './move.js';

const TEMPLATE_KEY = 'goc_msg_template';

// The in-game chat's limit for one message.
export const GAME_LIMIT = 150;

// Buildings' short names, used in guild messages that would otherwise go over the limit (or always,
// with the template's "short" setting). Towns are single letters already.
export const SHORT_NAMES = {
  Darkwick: 'Castle',
  Hotarubi: 'Hota',
  Sinostra: 'Sino',
  Vagastrom: 'Vaga',
  Frostheim: 'Frost',
  Dionysia: 'Dio',
  Obscuary: 'Obsc',
  Mortkranken: 'Mort',
  Jabberwock: 'Jabber',
};

// The original message format. Saving this exactly gives the same messages as before templates.
// quiet: the whole message on a day nobody declares or gives away anything ('' = the usual message).
// weekday: 'short' (Mon) or 'long' (Monday). game / gameQuiet: the guild message; short: always use
// the buildings' short names in it (otherwise only when it would be too long).
export const DEFAULT_TEMPLATE = {
  header: '## {label}',
  guild: '### {guild}\n- Declare: {declares}\n- Giveaway: {giveaways}\n- Place def on {def}',
  empty: 'none',
  quiet: '',
  weekday: 'short',
  game: '{weekday} | {date}\n{mode}:\n• Declare: {declares}\n• Giveaway: {giveaways}\n• Place def on {def-town} for rewards\n• {backup}',
  gameQuiet: '',
  short: false,
};
const TEXT_KEYS = ['header', 'guild', 'empty', 'quiet', 'game', 'gameQuiet'];

// Placeholders, with what they stand for (shown in the editor).
const DAY_FIELDS = [
  ['label', 'Day, weekday and date', 'Day 5 Sun 11/08'],
  ['day', 'Day', 'Day 5'],
  ['n', 'Day number', '5'],
  ['weekday', 'Weekday (short or long, set below)', 'Sun'],
  ['date', 'Date', '11/08'],
  ['mm', 'Month', '11'],
  ['dd', 'Day of month', '08'],
  ['server', 'Server name', '43 goc'],
  ['mode', 'Mode', 'GoC'],
];
const GUILD_FIELDS = [
  ['guild', 'Guild (its name in messages, if set)', 'Chickens ꒰ঌ(•͈⌔•͈)໒꒱'],
  ['declares', 'Towns declared', 'A, Darkwick'],
  ['giveaways', 'Towns given away', 'B'],
  ['def', 'Where to place def, with the backup advice', 'C or place smallest team if not available for battle phase'],
  ['def-town', 'Where to place def, town only', 'C'],
];
// In the guild message, lists read "A & B" and def is "C or D" (the town, or the backup town).
const GAME_FIELDS = [
  ['guild', 'Guild (its name in messages, if set)', 'Chickens'],
  ['declares', 'Towns declared', 'Castle & C'],
  ['giveaways', 'Towns given away', 'A'],
  [
    'def',
    'Where to place def, with the backup advice',
    'O or place smallest team on P if not available for battle phase',
  ],
  ['def-town', 'Where to place def, town only', 'O'],
  [
    'backup',
    'The backup advice on its own (blank when there is none)',
    'If not available for battle phase, place smallest team on P',
  ],
];

// Fills in anything missing (templates saved before a field existed) and drops anything unknown.
function normalize(t) {
  const out = { ...DEFAULT_TEMPLATE };
  if (!t || typeof t !== 'object') return out;
  for (const k of TEXT_KEYS) if (typeof t[k] === 'string') out[k] = t[k];
  if (t.weekday === 'long' || t.weekday === 'short') out.weekday = t.weekday;
  out.short = t.short === true;
  return out;
}

export function getTemplate() {
  try {
    const t = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || 'null');
    if (t && typeof t.header === 'string' && typeof t.guild === 'string') return normalize(t);
  } catch (_) {
    /* fall back to the default */
  }
  return normalize(null);
}
const sameTemplate = (a, b) => TEXT_KEYS.every(k => a[k] === b[k]) && a.weekday === b.weekday && a.short === b.short;
const isDefault = t => sameTemplate(normalize(t), normalize(null));
function setTemplate(t) {
  try {
    if (isDefault(t)) localStorage.removeItem(TEMPLATE_KEY);
    else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(normalize(t)));
  } catch (_) {
    showToast('Could not save the template in this browser.', true);
  }
}

// ── Sharing a template ────────────────────────────────────────────
const SHARE_PREFIX = '#tpl=';
const MAX_PART = 4000; // characters per box; real templates are far shorter

// Short keys keep links short. Links made before a field existed leave it out, and get the default.
function encodeTemplate(t) {
  const n = normalize(t);
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      h: n.header,
      g: n.guild,
      e: n.empty,
      q: n.quiet,
      w: n.weekday,
      i: n.game,
      iq: n.gameQuiet,
      s: n.short,
    }),
  );
  let bin = '';
  bytes.forEach(b => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Accepts a whole template link, or just the code after "#tpl=". Returns the template, or null.
export function decodeTemplate(text) {
  const str = String(text || '').trim();
  const m = /#tpl=([A-Za-z0-9_-]+)/.exec(str) || /^([A-Za-z0-9_-]+)$/.exec(str);
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    const ok = v => v === undefined || (typeof v === 'string' && v.length <= MAX_PART);
    if (!d || typeof d.h !== 'string' || typeof d.g !== 'string') return null;
    if (![d.h, d.g, d.e, d.q, d.i, d.iq].every(ok)) return null;
    const t = { header: d.h, guild: d.g, empty: d.e || '', quiet: d.q, weekday: d.w, game: d.i, gameQuiet: d.iq };
    t.short = d.s === true;
    return normalize(t);
  } catch (_) {
    return null;
  }
}

export function templateLink(t) {
  const base = isOldSite() ? newSiteUrl() : location.origin + location.pathname;
  return base + SHARE_PREFIX + encodeTemplate(t);
}

export const hasSharedTemplate = () => location.hash.startsWith(SHARE_PREFIX);

// On page load: a template link opens the template in the editor, to check before saving it.
export function receiveSharedTemplate() {
  if (!hasSharedTemplate()) return;
  const t = decodeTemplate(location.hash);
  history.replaceState(null, '', location.pathname + location.search);
  if (!t) return showToast('That message template link is broken or incomplete.', true);
  if (sameTemplate(t, getTemplate())) return showToast('You already use this message template.', false, 4000);
  if (!activeSrv()) {
    setTemplate(t);
    showToast('✓ Shared message template saved. Your daily messages will use it.', false, 5000);
    return;
  }
  openTemplateEditor(t);
}

// ── What each guild does each day ─────────────────────────────────
// Returns one entry per day: { d, guilds: [{ g, declares, giveaways, defTown, defNote, backup }] }.
// defNote is the backup advice after the def town ("or place smallest team ..."), or ''; backup is
// the town in it (the smallest team's), or ''.
export function dailyPlans(srv) {
  const days = numDays(srv);
  const { dec, give } = calcDec(srv);
  const mapData = getMapData(srv.mode, srv.mapKey);
  const validKids = new Set(mapData.kingdoms.map(k => k.id));
  const kTypeMap = {};
  for (const k of mapData.kingdoms) kTypeMap[k.id] = k.type;
  const typeScore = { lv3: 30, lv2: 20, lv1: 10 }; // castle > dorm > town
  const order = new Map(srv.guilds.map((g, i) => [g.id, i]));

  // A guild giving away several towns places its backup team on just one: the town being declared
  // on by the guild highest in the guild list (comparing the guilds taking the towns, not the guild
  // giving them away). Towns nobody declares on come last; ties keep the giveaway order.
  const backupTown = (giveaways, d) => {
    if (giveaways.length <= 1) return giveaways[0] || '';
    const takerRank = k => {
      const taker = srv.guilds.find(g => (dec[g.id][d] || []).includes(k));
      return taker ? order.get(taker.id) : Infinity;
    };
    return giveaways.map((k, i) => ({ k, i, r: takerRank(k) })).sort((a, b) => a.r - b.r || a.i - b.i)[0].k;
  };

  return Array.from({ length: days }, (_, d) => {
    const guilds = [];
    for (const g of srv.guilds) {
      const declares = dec[g.id][d] || [];
      const giveaways = give[g.id][d] || [];

      // Guilds with no towns going into the day (not on the map yet): if they aren't declaring,
      // there's nothing to tell them, so leave them out; if they are, they're joining the map.
      const hadTowns = Object.entries(srv.plan[d] || {}).some(([k, gid]) => gid === g.id && validKids.has(k));
      if (!hadTowns && declares.length === 0) continue;
      const joining = !hadTowns;

      const held = Object.entries(srv.plan[d + 1] || {})
        .filter(([k, gid]) => gid === g.id && validKids.has(k))
        .map(([k]) => k)
        .filter(k => !declares.includes(k));

      let defTown = '',
        defNote = '',
        backup = '';
      const candidates = [];
      for (const k of held) candidates.push({ id: k, type: kTypeMap[k], isHeld: true });
      for (const k of declares) candidates.push({ id: k, type: kTypeMap[k], isHeld: false });

      if (candidates.length > 0) {
        candidates.sort(
          (a, b) => (typeScore[b.type] || 0) + (b.isHeld ? 100 : 0) - ((typeScore[a.type] || 0) + (a.isHeld ? 100 : 0)),
        );
        const best = candidates[0];
        defTown = best.id;
        // Joining guilds place def on the town they're declaring (no fallback needed). Otherwise,
        // with no held towns, they may not get the declared town in time for the battle phase.
        if (!best.isHeld && !joining) {
          backup = backupTown(giveaways, d);
          defNote = backup
            ? `or place smallest team on ${backup} if not available for battle phase`
            : 'or place smallest team if not available for battle phase';
        }
      } else if (hadTowns) {
        // Being wiped from the map today (towns yesterday, none today): place def on the town
        // they're losing. If they lose several, use the highest level one (castle > dorm > town).
        const losing = Object.entries(srv.plan[d] || {})
          .filter(([k, gid]) => gid === g.id && validKids.has(k))
          .map(([k]) => k)
          .sort((a, b) => (typeScore[kTypeMap[b]] || 0) - (typeScore[kTypeMap[a]] || 0));
        if (losing.length) defTown = losing[0];
      }
      guilds.push({ g, declares, giveaways, defTown, defNote, backup });
    }
    return { d, guilds };
  });
}

// ── Writing the messages ──────────────────────────────────────────
const fill = (text, values) => text.replace(/\{([a-z-]+)\}/g, (m, key) => (key in values ? values[key] : m));
// Escape Discord formatting characters in plain guild names so "x_x" doesn't turn into italics.
// Names in messages are left as typed, so they can use formatting on purpose.
const mdEscape = s => s.replace(/([\\*_~`])/g, '\\$1');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The day's placeholders. Messages say "Day 5" (the tables keep the short "D5").
function dayValues(srv, d, t) {
  const n = d + 1;
  const mode = srv.mode === 'goc' ? 'GoC' : 'RAG';
  const base = { n: String(n), day: `Day ${n}`, server: srv.name || '', mode };
  if (!srv.startDate) return { ...base, label: base.day, weekday: '', date: '', mm: '', dd: '' };
  const [yy, m0, d0] = srv.startDate.split('-');
  const dt = new Date(yy, m0 - 1, d0);
  dt.setDate(dt.getDate() + d);
  const long = WEEKDAYS[dt.getDay()];
  const weekday = t.weekday === 'long' ? long : long.slice(0, 3);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return { ...base, label: `${base.day} ${weekday} ${mm}/${dd}`, weekday, date: `${mm}/${dd}`, mm, dd };
}

const guildName = g => (g.msgName && g.msgName.trim() ? g.msgName.trim() : mdEscape(g.name || ''));
// Nobody declares or gives anything away.
const isQuiet = x => !x.declares.length && !x.giveaways.length;

// One day's server message in parts: the top, and each guild's part (for laying them out side by
// side). A quiet day is just the top. Joined with line breaks, they make the message.
export function messageParts(srv, plan, tpl = getTemplate()) {
  const t = normalize(tpl);
  const empty = t.empty;
  const { d, guilds } = plan;
  const dayVals = dayValues(srv, d, t);
  if (t.quiet.trim() && guilds.length && guilds.every(isQuiet)) return { head: fill(t.quiet, dayVals), blocks: [] };
  const blocks = guilds.map(({ g, declares, giveaways, defTown, defNote }) =>
    fill(t.guild, {
      ...dayVals,
      guild: guildName(g),
      declares: declares.join(', ') || empty,
      giveaways: giveaways.join(', ') || empty,
      def: defTown ? (defNote ? `${defTown} ${defNote}` : defTown) : empty,
      'def-town': defTown || empty,
    }),
  );
  return { head: fill(t.header, dayVals), blocks };
}
const joinParts = ({ head, blocks }) => [head, ...blocks].join('\n').trim();

export function formatMessages(srv, plans, tpl = getTemplate()) {
  return plans.map(p => joinParts(messageParts(srv, p, tpl)));
}

export function buildMessages(srv) {
  return formatMessages(srv, dailyPlans(srv));
}

// One guild's message for one day, for the in-game chat. Lists read "A & B"; {backup} is the backup
// advice on its own ("Smallest team on P if not available for battle phase"). A line whose placeholders all come out empty (no giveaways, say) is
// left out, to save room. Buildings use their full names, unless the message would go over the
// game's limit (or the template always wants short names): then their short names (SHORT_NAMES).
// Returns '' when the guild isn't in that day (not on the map and not joining it).
export function formatGuildMessage(srv, dayPlan, gid, tpl = getTemplate()) {
  const t = normalize(tpl);
  const x = dayPlan && dayPlan.guilds.find(e => e.g.id === gid);
  if (!x) return '';
  const write = short => {
    const nm = k => (short && SHORT_NAMES[k]) || k;
    const vals = {
      ...dayValues(srv, dayPlan.d, t),
      guild: (x.g.msgName && x.g.msgName.trim()) || x.g.name || '',
      declares: x.declares.map(nm).join(' & '),
      giveaways: x.giveaways.map(nm).join(' & '),
      def: x.defTown
        ? nm(x.defTown) +
          (x.defNote
            ? ` or place smallest team${x.backup ? ` on ${nm(x.backup)}` : ''} if not available for battle phase`
            : '')
        : '',
      'def-town': x.defTown ? nm(x.defTown) : '',
      // The guild may not have its def town in time (it's declaring on it, and keeps no town of its
      // own): what to do then.
      backup: x.defNote
        ? `Smallest team${x.backup ? ` on ${nm(x.backup)}` : ''} if not available for battle phase`
        : '',
    };
    if (t.gameQuiet.trim() && isQuiet(x)) return fill(t.gameQuiet, vals).trim();
    return t.game
      .split('\n')
      .filter(line => {
        const keys = [...line.matchAll(/\{([a-z-]+)\}/g)].map(m => m[1]).filter(k => k in vals);
        return !keys.length || keys.some(k => vals[k] !== '');
      })
      .map(line => fill(line, vals))
      .join('\n')
      .trim();
  };
  if (t.short) return write(true);
  const full = write(false);
  return gameLength(full) > GAME_LIMIT ? write(true) : full;
}

export function buildGuildMessages(srv, gid) {
  return dailyPlans(srv).map(p => formatGuildMessage(srv, p, gid));
}

// Characters as the game counts them (emoji count as 2).
export const gameLength = text => text.length;

// ── Which message the Daily Messages section shows ───────────────
// The day shown (per server, for this visit) and whether it's the whole server's message or one
// guild's (remembered in this browser). The guild is saved with the server.
const VIEW_KEY = 'goc_msg_view';
const shownDay = new Map();
export function getMsgView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'guild' ? 'guild' : 'server';
  } catch (_) {
    return 'server';
  }
}
export function setMsgView(v) {
  try {
    if (v === 'guild') localStorage.setItem(VIEW_KEY, 'guild');
    else localStorage.removeItem(VIEW_KEY);
  } catch (_) {
    /* stays as it is for this visit */
  }
}
// 0-based day shown: the one picked, else today, else Day 1.
export function getMsgDay(srv, days, today) {
  const d = shownDay.has(srv.id) ? shownDay.get(srv.id) : today ? today - 1 : 0;
  return Math.max(0, Math.min(days - 1, d));
}
export function setMsgDay(srvId, d) {
  shownDay.set(srvId, d);
}
// The guild whose message is shown: the one picked, or the first in the list.
export function msgGuild(srv) {
  return srv.guilds.find(g => g.id === srv.msgGuild) || srv.guilds[0] || null;
}

// The message "Copy Today's Message" copies: today's, in the view being shown.
export function todayMessage(srv, today) {
  if (!today) return '';
  if (getMsgView() === 'guild') {
    const g = msgGuild(srv);
    return g ? formatGuildMessage(srv, dailyPlans(srv)[today - 1], g.id) : '';
  }
  return buildMessages(srv)[today - 1] || '';
}

// ── Template editor ───────────────────────────────────────────────
let rerender = () => {};
export function setMessagesRerender(fn) {
  rerender = fn;
}

function chips(fields) {
  return fields
    .map(
      ([key, desc, eg]) =>
        `<button type="button" class="tpl-chip" data-key="${key}" title="${esc(desc)}, e.g. ${esc(eg)}">{${key}}</button>`,
    )
    .join('');
}

export function openMsgTemplate() {
  openTemplateEditor();
}

// incoming: a template someone shared, shown in place of the current one until it's saved.
// kind: which tab to open on, 'server' or 'game' (the guild message).
function openTemplateEditor(incoming = null, kind = getMsgView() === 'guild' ? 'game' : 'server') {
  const srv = activeSrv();
  if (!srv) return;
  const plans = dailyPlans(srv);
  const days = plans.length;
  // Preview the day shown in Daily Messages, or else the first day that has someone in it.
  const shown = getMsgDay(srv, days, todayDay(srv, days));
  const firstWith = test => {
    if (plans[shown] && test(plans[shown])) return shown;
    return Math.max(0, plans.findIndex(test));
  };
  const t = normalize(incoming || getTemplate());
  const guildOpts = srv.guilds
    .map(
      g =>
        `<option value="${esc(g.id)}"${g.id === (msgGuild(srv) || {}).id ? ' selected' : ''}>${esc(g.name)}</option>`,
    )
    .join('');

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal modal-tpl" role="dialog" aria-modal="true" aria-labelledby="tpl-title">
      <h3 id="tpl-title">${incoming ? 'Shared Message Template' : 'Daily Message Templates'}</h3>
      ${
        incoming
          ? `<p class="tpl-shared">Someone shared this template with you. Check the preview, then <b>Save</b> to use it
        for your daily messages, or <b>Cancel</b> to keep yours.</p>`
          : ''
      }
      <div class="tpl-kinds" role="tablist" aria-label="Which message">
        <button type="button" role="tab" class="tpl-kind" data-kind="server">Server message <span class="tpl-sub">(Discord)</span></button>
        <button type="button" role="tab" class="tpl-kind" data-kind="game">Guild message <span class="tpl-sub">(in game)</span></button>
      </div>
      <div class="tpl-cols">
        <div class="tpl-edit">
          <div class="tpl-pane" data-kind="server">
            <p class="tpl-help">Every guild's part for the day, to post on Discord. Click a <b>{placeholder}</b> to add it
              where the cursor is. Leave an empty line at the end of the guild part to space guilds apart.</p>
            <label class="tpl-label" for="tpl-header">Top of each day's message</label>
            <textarea id="tpl-header" class="tpl-area tpl-area-sm" spellcheck="false"></textarea>
            <div class="tpl-chips">${chips(DAY_FIELDS)}</div>

            <label class="tpl-label" for="tpl-guild">Each guild</label>
            <textarea id="tpl-guild" class="tpl-area" spellcheck="false"></textarea>
            <div class="tpl-chips">${chips(GUILD_FIELDS)}</div>

            <label class="tpl-label" for="tpl-empty">When there's nothing (no declares, giveaways or def)</label>
            <input id="tpl-empty" class="tpl-input" type="text" spellcheck="false">

            <label class="tpl-label" for="tpl-quiet">On a day nobody declares or gives anything away <span class="tpl-sub">(optional)</span></label>
            <textarea id="tpl-quiet" class="tpl-area tpl-area-sm" spellcheck="false" placeholder="Leave blank for the usual message"></textarea>
            <div class="tpl-chips">${chips(DAY_FIELDS)}</div>
          </div>

          <div class="tpl-pane" data-kind="game" hidden>
            <p class="tpl-help">Each guild's own message, for Tokyo Debunker's guild chat (up to ${GAME_LIMIT} characters). Lists read
              "A &amp; B", and a line whose placeholders are all empty (no giveaways or no backup, say) is left out.</p>
            <label class="tpl-label" for="tpl-game">Guild message</label>
            <textarea id="tpl-game" class="tpl-area" spellcheck="false"></textarea>
            <div class="tpl-chips">${chips(DAY_FIELDS)}${chips(GAME_FIELDS)}</div>

            <label class="tpl-label" for="tpl-game-quiet">When the guild doesn't declare or give anything away <span class="tpl-sub">(optional)</span></label>
            <textarea id="tpl-game-quiet" class="tpl-area tpl-area-sm" spellcheck="false" placeholder="Leave blank for the usual message"></textarea>
            <div class="tpl-chips">${chips(DAY_FIELDS)}${chips(GAME_FIELDS)}</div>

            <label class="tpl-check">
              <input type="checkbox" id="tpl-short">
              Always use short names for buildings
              <span class="tpl-sub">(${Object.entries(SHORT_NAMES)
                .slice(0, 3)
                .map(([k, v]) => `${esc(k)} → ${esc(v)}`)
                .join(', ')}…; otherwise only when a message would go over ${GAME_LIMIT} characters)</span>
            </label>
          </div>

          <label class="tpl-label tpl-inline" for="tpl-weekday">Weekday
            <select id="tpl-weekday" class="tpl-select">
              <option value="short">Short (Mon)</option>
              <option value="long">Long (Monday)</option>
            </select>
          </label>

          <details class="tpl-import">
            <summary>Use a shared template</summary>
            <p class="tpl-help">Paste a template link (or its code) that someone shared. It fills in the boxes above; <b>Save</b> to keep it.</p>
            <input id="tpl-code" class="tpl-input" type="text" spellcheck="false" autocomplete="off" placeholder="https://…#tpl=…">
            <p class="tpl-code-note" aria-live="polite"></p>
          </details>

          <details class="tpl-names"${srv.guilds.some(g => g.msgName) ? ' open' : ''}>
            <summary>Guild names in messages <span class="tpl-sub">(this server only, optional)</span></summary>
            <p class="tpl-help">Add emoji or decorations. Tables keep the plain name. Leave blank to use the guild's name.</p>
            ${srv.guilds
              .map(
                g => `
              <div class="tpl-name-row">
                <span class="guild-dot" style="background:${g.color}"></span>
                <span class="tpl-name-plain">${esc(g.name)}</span>
                <input type="text" class="tpl-input tpl-msgname" data-gid="${esc(g.id)}" value="${esc(g.msgName || '')}" placeholder="${esc(g.name)}" spellcheck="false">
              </div>`,
              )
              .join('')}
          </details>
        </div>
        <div class="tpl-preview-wrap">
          <div class="tpl-pane" data-kind="server">
            <div class="tpl-preview-head">
              <span class="tpl-label" id="tpl-server-day"></span>
              <div class="tpl-tabs" role="tablist">
                <button type="button" role="tab" class="tpl-tab active" data-view="discord" aria-selected="true">In Discord</button>
                <button type="button" role="tab" class="tpl-tab" data-view="text" aria-selected="false">Text to copy</button>
              </div>
            </div>
            <div class="tpl-preview tpl-discord" id="tpl-discord"></div>
            <pre class="tpl-preview" id="tpl-preview" hidden></pre>
          </div>
          <div class="tpl-pane" data-kind="game" hidden>
            <div class="tpl-preview-head">
              <span class="tpl-label" id="tpl-game-day"></span>
              <select id="tpl-game-guild" class="tpl-select" aria-label="Guild to preview">${guildOpts}</select>
            </div>
            <pre class="tpl-preview tpl-game" id="tpl-game-preview"></pre>
            <p class="msg-count" id="tpl-game-count" aria-live="polite"></p>
          </div>
        </div>
      </div>
      <div class="modal-row tpl-actions">
        <button type="button" class="btn" data-a="reset" title="Reset the message on this tab">Reset to default</button>
        <button type="button" class="btn" data-a="share" title="Copy a link to these templates">Share</button>
        <span class="tpl-spacer"></span>
        <button type="button" class="btn" data-a="cancel">Cancel</button>
        <button type="button" class="btn-accent" data-a="save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  const $ = sel => bg.querySelector(sel);
  const box = {
    header: $('#tpl-header'),
    guild: $('#tpl-guild'),
    empty: $('#tpl-empty'),
    quiet: $('#tpl-quiet'),
    game: $('#tpl-game'),
    gameQuiet: $('#tpl-game-quiet'),
  };
  const weekday = $('#tpl-weekday');
  const shortBox = $('#tpl-short');
  const load = tt => {
    for (const k of TEXT_KEYS) box[k].value = tt[k];
    weekday.value = tt.weekday;
    shortBox.checked = tt.short;
  };
  load(t);

  const current = () => {
    return normalize({
      ...Object.fromEntries(TEXT_KEYS.map(k => [k, box[k].value])),
      weekday: weekday.value,
      short: shortBox.checked,
    });
  };
  const msgNames = () =>
    Object.fromEntries([...bg.querySelectorAll('.tpl-msgname')].map(i => [i.dataset.gid, i.value]));
  // The plans, with the guild names in messages being typed (the server isn't changed until Save).
  const previewPlans = () => {
    const names = msgNames();
    const guilds = srv.guilds.map(g => ({ ...g, msgName: names[g.id] }));
    const byId = new Map(guilds.map(g => [g.id, g]));
    return {
      srv: { ...srv, guilds },
      plans: plans.map(p => ({ ...p, guilds: p.guilds.map(x => ({ ...x, g: byId.get(x.g.id) })) })),
    };
  };
  const update = () => {
    const tt = current();
    const pv = previewPlans();
    // Server message
    const sd = firstWith(p => p.guilds.length > 0);
    $('#tpl-server-day').textContent = `Preview: Day ${sd + 1}`;
    const text = pv.plans[sd] ? formatMessages(pv.srv, [pv.plans[sd]], tt)[0] : 'No days to preview yet.';
    $('#tpl-preview').textContent = text;
    $('#tpl-discord').innerHTML = renderDiscord(text);
    // Guild message
    const gid = $('#tpl-game-guild').value;
    const gd = firstWith(p => p.guilds.some(x => x.g.id === gid));
    $('#tpl-game-day').textContent = `Preview: Day ${gd + 1}`;
    const gm = formatGuildMessage(pv.srv, pv.plans[gd], gid, tt);
    $('#tpl-game-preview').textContent = gm || 'This guild has nothing to do yet.';
    const len = gameLength(gm);
    const count = $('#tpl-game-count');
    count.textContent = gm
      ? `${len} / ${GAME_LIMIT} characters${len > GAME_LIMIT ? ': too long for the game' : ''}`
      : '';
    count.classList.toggle('over', len > GAME_LIMIT);
  };
  Object.values(box).forEach(el => el.addEventListener('input', update));
  [weekday, shortBox, $('#tpl-game-guild')].forEach(el => el.addEventListener('change', update));
  bg.querySelectorAll('.tpl-msgname').forEach(el => el.addEventListener('input', update));

  // Server message / guild message tabs.
  let tab = kind;
  const showKind = k => {
    tab = k;
    bg.querySelectorAll('.tpl-kind').forEach(b => {
      b.classList.toggle('active', b.dataset.kind === k);
      b.setAttribute('aria-selected', b.dataset.kind === k);
    });
    bg.querySelectorAll('.tpl-pane').forEach(p => {
      p.hidden = p.dataset.kind !== k;
    });
  };
  bg.querySelectorAll('.tpl-kind').forEach(b => b.addEventListener('click', () => showKind(b.dataset.kind)));
  showKind(kind);

  // Switch between how Discord shows the message and the text that gets copied.
  bg.querySelectorAll('.tpl-tab').forEach(tb =>
    tb.addEventListener('click', () => {
      const view = tb.dataset.view;
      bg.querySelectorAll('.tpl-tab').forEach(x => {
        x.classList.toggle('active', x === tb);
        x.setAttribute('aria-selected', x === tb);
      });
      $('#tpl-discord').hidden = view !== 'discord';
      $('#tpl-preview').hidden = view !== 'text';
    }),
  );

  // Placeholder chips insert at the cursor of the box above them.
  bg.querySelectorAll('.tpl-chip').forEach(chip =>
    chip.addEventListener('click', () => {
      const area = chip.closest('.tpl-chips').previousElementSibling;
      const text = `{${chip.dataset.key}}`;
      const st = area.selectionStart ?? area.value.length,
        en = area.selectionEnd ?? area.value.length;
      area.value = area.value.slice(0, st) + text + area.value.slice(en);
      area.focus();
      area.selectionStart = area.selectionEnd = st + text.length;
      update();
    }),
  );

  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  // Reset only the message on the tab being shown.
  $('[data-a="reset"]').addEventListener('click', () => {
    const keys = tab === 'game' ? ['game', 'gameQuiet'] : ['header', 'guild', 'empty', 'quiet'];
    for (const k of keys) box[k].value = DEFAULT_TEMPLATE[k];
    if (tab === 'game') shortBox.checked = DEFAULT_TEMPLATE.short;
    update();
  });
  $('[data-a="cancel"]').addEventListener('click', close);

  // Share: a link to the templates as they are in the boxes now (guild names in messages stay private).
  $('[data-a="share"]').addEventListener('click', () => {
    const link = templateLink(current());
    const done = () =>
      showToast('✓ Template link copied. Anyone who opens it can try your templates and save them.', false, 4000);
    if (navigator.clipboard)
      navigator.clipboard.writeText(link).then(done, () => window.prompt('Copy this link:', link));
    else window.prompt('Copy this link:', link);
  });

  // Pasting a shared link or code fills in the boxes.
  const code = $('#tpl-code'),
    note = $('.tpl-code-note');
  code.addEventListener('input', () => {
    const shared = decodeTemplate(code.value);
    note.classList.toggle('bad', !shared && !!code.value.trim());
    if (!shared) {
      note.textContent = code.value.trim() ? "That doesn't look like a template link." : '';
      return;
    }
    load(shared);
    note.textContent = '✓ Loaded. Check the preview, then Save to use it.';
    update();
  });
  $('[data-a="save"]').addEventListener('click', () => {
    setTemplate(current());
    const names = msgNames();
    for (const g of srv.guilds) {
      const v = (names[g.id] || '').trim();
      if (v) g.msgName = v;
      else delete g.msgName;
    }
    save();
    close();
    rerender();
    showToast('✓ Message templates saved', false, 3000);
  });

  update();
  (tab === 'game' ? box.game : box.guild).focus();
}
