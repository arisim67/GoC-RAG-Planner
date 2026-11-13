// js/map-view.js
// The Map view: the event map for one day at a time, laid out like the game's. Each town shows its
// building on a base in its holder's color, with its name below, and the roads follow the in-game
// paths. The base gets a white dashed outline when the town changed hands that day. Works with Spotlight (other guilds' towns fade). Only maps with a layout
// in maps/layouts.js have it.

import { esc, dateLabelShort, todayDay } from './ui.js';
import { startingTownLimit, isMidEvent, startRule } from './calc.js';
import { icon } from './icons.js';
import { gcolor } from './colors.js';
import { LAYOUTS } from './maps/layouts.js';
import { ROADS } from './maps/roads.js';
import { BUILDINGS, GHOULS, TOWN_SIZE, TOWN_CATS } from './maps/art.js';

const chosen = new Map(); // server id -> day being shown

export const hasMapView = srv => !!(srv && LAYOUTS[srv.mapKey]);

export function setMapDay(btn) {
  chosen.set(btn.dataset.srv, Number(btn.dataset.day));
}
// For the tutorial: open the map on a given day.
export function showMapDay(srvId, day) {
  chosen.set(srvId, day);
}

// Setting Day 0 on the map: the guild picked above the map (per server). '' is the eraser; no entry
// means nothing is picked yet, so taps on towns do nothing.
const picked = new Map();
export function setMapPick(btn) {
  const id = btn.dataset.srv;
  picked.set(id, picked.get(id) === btn.dataset.g ? undefined : btn.dataset.g);
}
export const getMapPick = srvId => picked.get(srvId);

export { startingTownLimit };
export const startingCount = (srv, gid) => Object.values(srv.plan[0] || {}).filter(v => v === gid).length;

// After a guild's last starting town, move the picker on to the next guild still short of towns.
export function advanceMapPick(srv) {
  if (isMidEvent(srv)) return;
  const cur = picked.get(srv.id);
  if (!cur || startingCount(srv, cur) < startingTownLimit(srv, cur)) return;
  const order = srv.guilds.map(g => g.id);
  const at = order.indexOf(cur);
  const next = [...order.slice(at + 1), ...order.slice(0, at)].find(
    id => startingCount(srv, id) < startingTownLimit(srv, id),
  );
  picked.set(srv.id, next);
}

const FONT = 34;
const PILL_H = 54;
// Rough text width in viewBox units (the labels are short, so an estimate is plenty).
const textW = s => s.length * FONT * 0.6;

// The building sits just above its name label, as in the game. Roads meet at its middle.
const ART_SCALE = 1.1;
const ICON_DY = { lv1: 78, lv2: 95, lv3: 95 };
const iconAt = (k, [x, y]) => [x, y - ICON_DY[k.type]];
// Bases are one fixed size per kind of town, so every dorm looks the same whatever its picture's shape.
const BASE_RX = { lv1: 62, lv2: 88, lv3: 108 };

// Which cat (or ghoul) sits in front of a town: picked at random, but the same every time for that
// server and town, so the map doesn't reshuffle on each redraw.
function pick(srv, town, list) {
  let h = 2166136261;
  for (const ch of `${srv.id}|${srv.mapKey}|${town}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return list[(h >>> 0) % list.length];
}

// The picture for a town: [src, width, height, middle] in map units, or null.
// The ghoul on each dorm of this map, so Darkwick can pick someone who isn't already out on a dorm.
function dormGhouls(srv, mapData) {
  return new Set(
    mapData.kingdoms
      .filter(k => k.type === 'lv2' && GHOULS[k.id])
      .map(k => pick(srv, k.id, Object.keys(GHOULS[k.id]).sort())),
  );
}

// onDorms: the ghouls already on this map's dorms (Darkwick skips them).
function artFor(srv, k, onDorms) {
  if (k.type === 'lv1') return [`images/map/town/${pick(srv, k.id, TOWN_CATS)}.webp`, ...TOWN_SIZE, 0.5];
  const ghouls = GHOULS[k.id];
  const free = ghouls
    ? Object.keys(ghouls)
        .sort()
        .filter(g => k.type !== 'lv3' || !onDorms.has(g))
    : [];
  if (free.length) {
    const g = pick(srv, k.id, free);
    const [w, h, mid] = ghouls[g];
    return [`images/map/dorm/${k.id.toLowerCase()}/${g}.webp`, w, h, mid];
  }
  if (BUILDINGS[k.id]) {
    const [w, h, mid] = BUILDINGS[k.id];
    return [`images/map/${k.id.toLowerCase()}.webp`, w, h, mid];
  }
  return null;
}

// How far each lane sits from the middle of a road when two guilds trade towns along it.
const LANE = 11;

// The same line moved sideways by `by` (to the left of its direction of travel when positive).
function offsetLine(pts, by) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy) || 1;
    return [Math.round(p[0] + (dy / len) * by), Math.round(p[1] - (dx / len) * by)];
  });
}

// A smooth path through the traced points (Catmull-Rom turned into Bezier curves).
function smooth(pts) {
  if (pts.length < 3) return `M${pts.map(p => p.join(' ')).join(' L')}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map(Math.round).join(' ')} ${c2.map(Math.round).join(' ')} ${p2.join(' ')}`;
  }
  return d;
}

export function renderMapView(srv, mapData, days) {
  const layout = LAYOUTS[srv.mapKey];
  if (!layout || !mapData) return '';
  const today = todayDay(srv, days);
  const plan = srv.plan || {};
  // Until something is planned after Day 0 (a new server), it opens on Day 0, where the starting towns
  // are set; after that, on today (or Day 1 before the event starts).
  const onlyDay0 = !Object.entries(plan).some(([d, cells]) => +d > 0 && Object.values(cells || {}).some(Boolean));
  let day = chosen.has(srv.id) ? chosen.get(srv.id) : onlyDay0 ? 0 : (today ?? 1);
  day = Math.max(0, Math.min(days, day));

  const owner = (d, k) => (plan[d] || {})[k] || '';
  const guildOf = id => srv.guilds.find(g => g.id === id);

  const byId = Object.fromEntries(mapData.kingdoms.map(k => [k.id, k]));
  const traced = ROADS[srv.mapKey] || {};

  // A road's points: the traced in-game path where there is one, otherwise a straight line.
  const roadPts = key => {
    const [p, q] = key.split('|');
    return traced[key] || [iconAt(byId[p], layout.at[p]), iconAt(byId[q], layout.at[q])];
  };
  const roadPath = key => smooth(roadPts(key));

  // Roads: each pair once.
  const seen = new Set();
  const roads = [];
  mapData.kingdoms.forEach(k =>
    (k.adj || []).forEach(a => {
      const key = [k.id, a].sort().join('|');
      if (seen.has(key) || !layout.at[k.id] || !layout.at[a] || !byId[a]) return;
      seen.add(key);
      roads.push(`<path d="${roadPath(key)}"/>`);
    }),
  );

  // Attacks: for each town taken this day, the roads from the taker's towns (as of the day before)
  // that lead into it, in the taker's color. When two guilds trade towns along the same road, each
  // gets its own lane on either side of it.
  const takes = [];
  if (day > 0)
    mapData.kingdoms.forEach(k => {
      const gid = owner(day, k.id);
      const g = guildOf(gid);
      if (!g || gid === owner(day - 1, k.id) || !layout.at[k.id]) return;
      (k.adj || []).forEach(a => {
        if (owner(day - 1, a) !== gid || !layout.at[a] || !byId[a]) return;
        takes.push({ g, to: k.id, key: [k.id, a].sort().join('|') });
      });
    });
  const perRoad = {};
  takes.forEach(t => (perRoad[t.key] = (perRoad[t.key] || 0) + 1));
  const attacks = takes.map(({ g, to, key }) => {
    // Roads run from the first town in the key to the second; flip the dashes when the taken town
    // is the first, so they always move toward it.
    const first = key.startsWith(`${to}|`);
    const shared = perRoad[key] > 1;
    const d = shared ? smooth(offsetLine(roadPts(key), first ? LANE : -LANE)) : roadPath(key);
    return `<path class="map-attack${first ? ' rev' : ''}${shared ? ' lane' : ''}" data-g="${g.id}" style="--c:${gcolor(g.color)}" d="${d}"/>`;
  });

  // Day 0 can be filled in by tapping towns on the map (not on view-only copies).
  const editing = day === 0 && !srv.isViewOnly;
  // From the start of an event, guilds begin on plain towns only, and a set number of them. From the
  // middle (Planning mid-event on under Guilds), Day 0 can be anything.
  const mid = isMidEvent(srv);
  const tally = id => (mid ? `${startingCount(srv, id)}` : `${startingCount(srv, id)}/${startingTownLimit(srv, id)}`);
  const cur = picked.get(srv.id);
  const pickBar = editing
    ? `<div class="map-pick" role="group" aria-label="Guild to place on the map">
        <span class="map-pick-label">Starting towns</span>
        ${srv.guilds
          .filter(g => mid || startingTownLimit(srv, g.id) > 0 || startingCount(srv, g.id) > 0) // not guilds that start with nothing
          .map(
            g => `<button type="button" class="map-pick-btn" data-action="map-pick" data-srv="${esc(srv.id)}" data-g="${g.id}"
              aria-pressed="${cur === g.id}" style="--c:${gcolor(g.color)}"><span class="map-key-dot" style="background:${gcolor(g.color)}"></span>${esc(g.name)}
              <span class="map-pick-count${!mid && startingCount(srv, g.id) >= startingTownLimit(srv, g.id) ? ' full' : ''}">${tally(g.id)}</span></button>`,
          )
          .join('')}
        <button type="button" class="map-pick-btn eraser" data-action="map-pick" data-srv="${esc(srv.id)}" data-g=""
          aria-pressed="${cur === ''}">${icon('eraser')} Clear</button>
        <span class="map-pick-hint">${
          cur === undefined
            ? mid
              ? 'Pick a guild, then tap what it holds now on the map.'
              : `Pick a guild, then tap its starting towns on the map (towns only, no dorms or castle). ${startRule(srv)}`
            : mid
              ? 'Tap towns, dorms or the castle to give them to this guild; tap one again to clear it.'
              : `Tap towns to give them to this guild; tap one again to clear it. ${startRule(srv)}`
        }</span>
      </div>`
    : '';

  const onDorms = dormGhouls(srv, mapData);
  const held = {};
  const towns = mapData.kingdoms
    .filter(k => layout.at[k.id])
    .map(k => {
      const [x, y] = layout.at[k.id];
      const gid = owner(day, k.id);
      const g = guildOf(gid);
      if (g) held[g.id] = (held[g.id] || 0) + 1;
      const name = k.id;
      const w = Math.max(PILL_H * 1.1, textW(name) + 34);
      const art = artFor(srv, k, onDorms);
      const taken = day > 0 && gid && gid !== owner(day - 1, k.id);
      const kind = k.type === 'lv3' ? 'Castle' : k.type === 'lv2' ? 'Dorm' : 'Town';
      const tip = `${k.type === 'lv1' ? `${k.id} Town` : k.id} (${kind}): ${g ? g.name : 'nobody'}${taken ? ', taken this day' : ''}`;
      // The picture stands on an oval base in the holder's color, its bottom just above the name.
      const base = y - PILL_H / 2 + 6; // where the picture stands
      const rx = BASE_RX[k.type],
        ry = rx * 0.3,
        by = base - ry;
      // The holder is shown on the oval at the building's base: its color, plus white dashes around it
      // when the town was taken that day.
      const plinth = `<ellipse class="map-base" cx="${x}" cy="${by}" rx="${rx}" ry="${ry}"/>
        <ellipse class="map-flag" cx="${x}" cy="${by}" rx="${rx + 12}" ry="${ry + 9}"/>`;
      let pic;
      if (!art) {
        pic = plinth;
      } else {
        const w = art[1] * ART_SCALE,
          h = art[2] * ART_SCALE;
        pic = `${plinth}<image href="${art[0]}" x="${x - w * art[3]}" y="${base - h}" width="${w}" height="${h}"/>`;
      }
      const pick =
        editing && (k.type === 'lv1' || mid)
          ? ` data-action="map-town" data-k="${esc(k.id)}" tabindex="0" role="button" aria-label="${esc(tip)}"`
          : '';
      return `<g class="map-town ${k.type}${g ? '' : ' empty'}${taken ? ' taken' : ''}${editing ? ' pickable' : ''}"
        ${g ? `data-g="${g.id}" style="--c:${gcolor(g.color)}"` : ''}${pick}>
        <title>${esc(tip)}</title>
        ${pic}
        <g class="map-label" transform="translate(${x} ${y})">
          <g class="map-label-in">
            <rect x="${-w / 2}" y="${-PILL_H / 2}" width="${w}" height="${PILL_H}" rx="${PILL_H / 2}"/>
            <text dy="0.36em">${esc(name)}</text>
          </g>
        </g>
      </g>`;
    })
    .join('');

  const dayBtn = d =>
    `<button type="button" class="map-day${d === day ? ' active' : ''}${d === today ? ' is-today' : ''}" data-action="map-day"
      data-srv="${esc(srv.id)}" data-day="${d}" aria-pressed="${d === day}">D${d}</button>`;
  const legend = srv.guilds
    .filter(g => held[g.id])
    .map(
      g =>
        `<span class="map-key" data-g="${g.id}"><span class="map-key-dot" style="background:${gcolor(g.color)}"></span>${esc(g.name)} <b>${held[g.id]}</b></span>`,
    )
    .join('');

  return `<div class="section" id="sec-map" data-sec="map">
    <div class="sec-title">Map <span class="sec-note">${esc(mapData.name)} · ${day === 0 ? 'Day 0 (start)' : esc(dateLabelShort(srv, day))}</span></div>
    <div class="map-main" data-tour="map">
    <div class="map-days" role="group" aria-label="Day to show">${Array.from({ length: days + 1 }, (_, d) => dayBtn(d)).join('')}</div>
    ${pickBar}
    <div class="map-wrap">
      <svg class="map-svg${layout.bg ? ' has-bg' : ''}" viewBox="0 0 ${layout.w} ${layout.h}" role="img"
        aria-label="${esc(mapData.name)} on day ${day}: who holds each town">
        ${layout.bg ? `<image class="map-bg" href="${layout.bg.src}" x="${layout.bg.x}" y="${layout.bg.y}" width="${layout.bg.w ?? layout.bg.size}" height="${layout.bg.h ?? layout.bg.size}"/>` : ''}
        <g class="map-roads">${roads.join('')}</g>
        <g class="map-attacks">${attacks.join('')}</g>
        <g class="map-towns">${towns}</g>
      </svg>
    </div>
    </div>
    <div class="map-legend">${legend}<span class="map-key-note"><span class="map-ring taken"></span>Taken this day</span>${
      attacks.length ? `<span class="map-key-note"><span class="map-line"></span>Road it was taken from</span>` : ''
    }</div>
    <p class="map-disclaimer">${
      !layout.bg
        ? 'This map’s artwork isn’t in yet and will be added in a future update.<br>'
        : layout.bg.placeholder
          ? 'This map’s background was cleaned up from a screenshot and will be replaced with the original artwork in a future update.<br>'
          : ''
    }
      The cats and ghouls on the towns, dorms and Darkwick are picked at random and won’t match your in-game map.<br>
      Map artwork, buildings and characters are official Tokyo Debunker artwork and belong to its creators.</p>
  </div>`;
}
