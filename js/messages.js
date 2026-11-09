// js/messages.js
// Daily messages: works out what each guild does each day (declares, giveaways, where to place def)
// and writes it out using a message template. The template is saved once per browser and used for
// every server. Each guild can also have an optional "name in messages" (for emoji and decorations)
// that only appears in messages, not in the tables.
//
// Templates can be shared as a link: everything is packed into the part after "#tpl=", which
// browsers never send to any server. Opening the link shows the template in the editor to try out
// before saving it. The link (or the code after "#tpl=") can also be pasted into the editor.

import { activeSrv, numDays, save } from './state.js';
import { esc, dateLabelShort, showToast } from './ui.js';
import { calcDec } from './calc.js';
import { getMapData } from './maps/index.js';
import { renderDiscord } from './discord-md.js';
import { isOldSite, newSiteUrl } from './move.js';

const TEMPLATE_KEY = 'goc_msg_template';

// The original message format. Saving this exactly gives the same messages as before templates.
export const DEFAULT_TEMPLATE = {
  header: '## {label}',
  guild: '### {guild}\n- Declares: {declares}\n- Giveaways: {giveaways}\n- Place def on {def}',
  empty: 'none',
};

// Placeholders, with what they stand for (shown in the editor).
const DAY_FIELDS = [
  ['label', 'Day, weekday and date', 'D5 Sun 11/08'],
  ['day', 'Day number', 'D5'],
  ['weekday', 'Weekday', 'Sun'],
  ['date', 'Date', '11/08'],
  ['mm', 'Month', '11'],
  ['dd', 'Day of month', '08'],
  ['server', 'Server name', '43 goc'],
];
const GUILD_FIELDS = [
  ['guild', 'Guild (its name in messages, if set)', 'Chickens ꒰ঌ(•͈⌔•͈)໒꒱'],
  ['declares', 'Towns declared', 'A, Darkwick'],
  ['giveaways', 'Towns given away', 'B'],
  ['def', 'Where to place def, with the backup advice', 'C or place smallest team if not available for battle phase'],
  ['def-town', 'Where to place def, town only', 'C'],
];

export function getTemplate() {
  try {
    const t = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || 'null');
    if (t && typeof t.header === 'string' && typeof t.guild === 'string') {
      return {
        header: t.header,
        guild: t.guild,
        empty: typeof t.empty === 'string' ? t.empty : DEFAULT_TEMPLATE.empty,
      };
    }
  } catch (_) {
    /* fall back to the default */
  }
  return { ...DEFAULT_TEMPLATE };
}
function isDefault(t) {
  return (
    t.header === DEFAULT_TEMPLATE.header && t.guild === DEFAULT_TEMPLATE.guild && t.empty === DEFAULT_TEMPLATE.empty
  );
}
function setTemplate(t) {
  try {
    if (isDefault(t)) localStorage.removeItem(TEMPLATE_KEY);
    else localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t));
  } catch (_) {
    showToast('Could not save the template in this browser.', true);
  }
}

// ── Sharing a template ────────────────────────────────────────────
const SHARE_PREFIX = '#tpl=';
const MAX_PART = 4000; // characters per box; real templates are far shorter

const sameTemplate = (a, b) => a.header === b.header && a.guild === b.guild && a.empty === b.empty;

function encodeTemplate(t) {
  const bytes = new TextEncoder().encode(JSON.stringify({ h: t.header, g: t.guild, e: t.empty }));
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
    const ok = v => typeof v === 'string' && v.length <= MAX_PART;
    if (!d || !ok(d.h) || !ok(d.g) || !ok(d.e || '')) return null;
    return { header: d.h, guild: d.g, empty: d.e || '' };
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
// Returns one entry per day: { d, guilds: [{ g, declares, giveaways, defTown, defNote }] }.
// defNote is the backup advice after the def town ("or place smallest team ..."), or ''.
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
        defNote = '';
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
          const backup = backupTown(giveaways, d);
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
      guilds.push({ g, declares, giveaways, defTown, defNote });
    }
    return { d, guilds };
  });
}

// ── Writing the messages ──────────────────────────────────────────
const fill = (text, values) => text.replace(/\{([a-z-]+)\}/g, (m, key) => (key in values ? values[key] : m));
// Escape Discord formatting characters in plain guild names so "x_x" doesn't turn into italics.
// Names in messages are left as typed, so they can use formatting on purpose.
const mdEscape = s => s.replace(/([\\*_~`])/g, '\\$1');

function dayValues(srv, d) {
  const label = dateLabelShort(srv, d + 1);
  const [day, weekday = '', date = ''] = label.split(' ');
  const [mm = '', dd = ''] = date.split('/');
  return { label, day, weekday, date, mm, dd, server: srv.name || '' };
}

export function formatMessages(srv, plans, t = getTemplate()) {
  const empty = t.empty;
  return plans.map(({ d, guilds }) => {
    const dayVals = dayValues(srv, d);
    const blocks = guilds.map(({ g, declares, giveaways, defTown, defNote }) =>
      fill(t.guild, {
        ...dayVals,
        guild: g.msgName && g.msgName.trim() ? g.msgName.trim() : mdEscape(g.name || ''),
        declares: declares.join(', ') || empty,
        giveaways: giveaways.join(', ') || empty,
        def: defTown ? (defNote ? `${defTown} ${defNote}` : defTown) : empty,
        'def-town': defTown || empty,
      }),
    );
    return [fill(t.header, dayVals), ...blocks].join('\n').trim();
  });
}

export function buildMessages(srv) {
  return formatMessages(srv, dailyPlans(srv));
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
function openTemplateEditor(incoming = null) {
  const srv = activeSrv();
  if (!srv) return;
  const plans = dailyPlans(srv);
  // Preview the first day that has someone in it.
  const previewDay = Math.max(
    0,
    plans.findIndex(p => p.guilds.length > 0),
  );
  const t = incoming || getTemplate();

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal modal-tpl" role="dialog" aria-modal="true" aria-labelledby="tpl-title">
      <h3 id="tpl-title">${incoming ? 'Shared Message Template' : 'Daily Message Template'}</h3>
      ${
        incoming
          ? `<p class="tpl-shared">Someone shared this template with you. Check the preview, then <b>Save</b> to use it
        for your daily messages, or <b>Cancel</b> to keep yours.</p>`
          : ''
      }
      <p class="tpl-help">Used for every server in this browser. Click a <b>{placeholder}</b> to add it where the cursor is.
        Leave an empty line at the end of the guild part to space guilds apart.</p>
      <div class="tpl-cols">
        <div class="tpl-edit">
          <label class="tpl-label" for="tpl-header">Top of each day's message</label>
          <textarea id="tpl-header" class="tpl-area tpl-area-sm" spellcheck="false"></textarea>
          <div class="tpl-chips">${chips(DAY_FIELDS)}</div>

          <label class="tpl-label" for="tpl-guild">Each guild</label>
          <textarea id="tpl-guild" class="tpl-area" spellcheck="false"></textarea>
          <div class="tpl-chips">${chips(GUILD_FIELDS)}</div>

          <label class="tpl-label" for="tpl-empty">When there's nothing (no declares, giveaways or def)</label>
          <input id="tpl-empty" class="tpl-input" type="text" spellcheck="false">

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
          <div class="tpl-preview-head">
            <span class="tpl-label">Preview: ${esc(dateLabelShort(srv, previewDay + 1))}</span>
            <div class="tpl-tabs" role="tablist">
              <button type="button" role="tab" class="tpl-tab active" data-view="discord" aria-selected="true">In Discord</button>
              <button type="button" role="tab" class="tpl-tab" data-view="text" aria-selected="false">Text to copy</button>
            </div>
          </div>
          <div class="tpl-preview tpl-discord" id="tpl-discord"></div>
          <pre class="tpl-preview" id="tpl-preview" hidden></pre>
        </div>
      </div>
      <div class="modal-row tpl-actions">
        <button type="button" class="btn" data-a="reset">Reset to default</button>
        <button type="button" class="btn" data-a="share" title="Copy a link to this template">Share</button>
        <span class="tpl-spacer"></span>
        <button type="button" class="btn" data-a="cancel">Cancel</button>
        <button type="button" class="btn-accent" data-a="save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  const $ = sel => bg.querySelector(sel);
  const header = $('#tpl-header'),
    guild = $('#tpl-guild'),
    empty = $('#tpl-empty');
  header.value = t.header;
  guild.value = t.guild;
  empty.value = t.empty;

  const current = () => ({ header: header.value, guild: guild.value, empty: empty.value });
  const msgNames = () =>
    Object.fromEntries([...bg.querySelectorAll('.tpl-msgname')].map(i => [i.dataset.gid, i.value]));
  const update = () => {
    const names = msgNames();
    // Preview with the names being typed, without changing the server yet.
    const previewSrv = { ...srv, guilds: srv.guilds.map(g => ({ ...g, msgName: names[g.id] })) };
    const day = plans[previewDay]
      ? [
          {
            ...plans[previewDay],
            guilds: plans[previewDay].guilds.map(x => ({ ...x, g: previewSrv.guilds.find(g => g.id === x.g.id) })),
          },
        ]
      : [];
    const text = day.length ? formatMessages(previewSrv, day, current())[0] : 'No days to preview yet.';
    $('#tpl-preview').textContent = text;
    $('#tpl-discord').innerHTML = renderDiscord(text);
  };
  [header, guild, empty].forEach(el => el.addEventListener('input', update));
  bg.querySelectorAll('.tpl-msgname').forEach(el => el.addEventListener('input', update));

  // Switch between how Discord shows the message and the text that gets copied.
  bg.querySelectorAll('.tpl-tab').forEach(tab =>
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      bg.querySelectorAll('.tpl-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
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
      const s = area.selectionStart ?? area.value.length,
        e = area.selectionEnd ?? area.value.length;
      area.value = area.value.slice(0, s) + text + area.value.slice(e);
      area.focus();
      area.selectionStart = area.selectionEnd = s + text.length;
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

  $('[data-a="reset"]').addEventListener('click', () => {
    header.value = DEFAULT_TEMPLATE.header;
    guild.value = DEFAULT_TEMPLATE.guild;
    empty.value = DEFAULT_TEMPLATE.empty;
    update();
  });
  $('[data-a="cancel"]').addEventListener('click', close);

  // Share: a link to the template as it is in the boxes now (guild names in messages stay private).
  $('[data-a="share"]').addEventListener('click', () => {
    const link = templateLink(current());
    const done = () =>
      showToast('✓ Template link copied. Anyone who opens it can try your template and save it.', false, 4000);
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
    header.value = shared.header;
    guild.value = shared.guild;
    empty.value = shared.empty;
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
    showToast('✓ Message template saved', false, 3000);
  });

  update();
  guild.focus();
}
