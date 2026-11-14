// js/state.js
// Shared app state (servers, active server), server factory, and saving to / loading from the browser.

import { getMapData } from './maps/index.js';

// 15 guild colors, picked to be clearly distinct from each other on the dark background
// (every pair is at least ~11 apart in CIEDE2000 color difference) and clear of the themes' own colors:
// the status red and coral, the OK green, the titles' gold and cream, and each theme's accent. The guild
// limit is GUILD_COLORS.length, so no two guilds on a server ever share a color.
export const GUILD_COLORS = [
  '#abf95f',
  '#ed7ef8',
  '#25d2fc',
  '#fc9e47',
  '#fab6b9',
  '#0af2cd',
  '#fbd509',
  '#b4c0ff',
  '#b2b77b',
  '#f6c4f9',
  '#27d271',
  '#bfedbd',
  '#65c3c0',
  '#f48aba',
  '#b9cb11',
];
export const MAX_GUILDS = GUILD_COLORS.length;

// First palette color not already used by a guild on this server
// (falls back to cycling the palette only if every color is taken).
export function nextGuildColor(guilds) {
  const used = new Set(guilds.map(g => (g.color || '').toLowerCase()));
  return GUILD_COLORS.find(c => !used.has(c)) || GUILD_COLORS[guilds.length % GUILD_COLORS.length];
}

// servers: every planning server (one per tab). activeId: id of the tab being shown.
// Kept on one object because other modules reassign them (state.servers = ...), which a plain
// exported `let` would not allow.
export const state = {
  servers: [],
  activeId: null,
};

export function getSrv(id) {
  return state.servers.find(s => s.id === id);
}
export function activeSrv() {
  return getSrv(state.activeId);
}

export function numDays(srv) {
  if (!srv.endDate || !srv.startDate) return srv.mode === 'goc' ? 12 : 6;
  const ms = new Date(srv.endDate) - new Date(srv.startDate);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export function numDisplayDays(srv) {
  return numDays(srv) + 1;
}

// Game of Claws: how many guilds start with 2 towns on each map (the next guild starts with 1 and the
// rest with none). Maps not listed here use 8.
export const GOC_TWO_TOWNS = { forest: 8, wetland: 6, snowfield: 8, woodlands: 5, badlands: 8 };

// How many guilds a new server starts with: Ragnarok always has 4; in Game of Claws it is the guilds
// that start with towns on the map (the two-town guilds plus the one that starts with 1).
export const defaultGuildCount = (mode, mapKey) => (mode === 'ragnarok' ? 4 : (GOC_TWO_TOWNS[mapKey] ?? 8) + 1);

export function mkSrv(name, mode, mapKey, startDate, endDate) {
  const mapData = getMapData(mode, mapKey);
  const defGuilds = Array.from({ length: defaultGuildCount(mode, mapKey) }, (_, i) => `Guild ${i + 1}`);
  const guilds = defGuilds.map((n, i) => ({
    id: 'g' + i,
    name: n,
    color: GUILD_COLORS[i],
    basePoints: 0,
    baseLv3: 0,
    baseLv2: 0,
  }));
  const days = 6;
  const plan = {};
  for (let d = 0; d < 14; d++) {
    plan[d] = {};
    for (const k of mapData.kingdoms) plan[d][k.id] = '';
  }
  return {
    id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2),
    name,
    mode,
    mapKey,
    startDate,
    endDate,
    guilds,
    plan,
    notes: '',
  };
}

// Runs after every save (js/versions.js uses it to keep version history).
let afterSave = null;
export function setAfterSave(fn) {
  afterSave = fn;
}

export function save() {
  try {
    localStorage.setItem('goc_v3', JSON.stringify({ servers: state.servers, activeId: state.activeId }));
    if (afterSave) afterSave();
    const ss = document.getElementById('save-status');
    if (ss) {
      ss.textContent = 'Saving...';
      ss.style.color = 'var(--accent-ink)';
      clearTimeout(window.saveTimer);
      window.saveTimer = setTimeout(() => {
        const s = activeSrv();
        // Only show "Cloud Linked" once the server has been saved to or synced from the cloud
        if (s && s.cloudSynced) {
          ss.innerHTML = '☁️ <b style="color:#6baff5">Cloud Linked</b> &nbsp;·&nbsp; ✓ Saved locally';
        } else {
          ss.innerHTML = '✓ Saved to browser';
        }
        ss.style.color = 'var(--text3)';
      }, 800);
    }
  } catch (e) {}
}

export function load() {
  try {
    const r = localStorage.getItem('goc_v3');
    if (r) {
      const d = JSON.parse(r);
      state.servers = (d.servers || []).filter(x => !x.isTutorial);
      state.activeId = d.activeId || null;
      if (!state.servers.find(x => x.id === state.activeId)) state.activeId = state.servers[0]?.id || null;
    }
  } catch (e) {}
}
