// js/handlers.js
// Edits made in the page: server settings, guild fields, grid cells, clearing days, copying messages.

import { activeSrv, save, numDays, nextGuildColor, MAX_GUILDS } from './state.js';
import { renderTabs, renderAll } from './render.js';
import { showToast, todayDay } from './ui.js';
import { todayMessage } from './messages.js';
import { openColorPicker } from './color-picker.js';
import { setBtnLabel } from './icons.js';
import { recordChange, clearHistory } from './history.js';
import { getMapList, getMapData } from './maps/index.js';
import { takeVersion } from './versions.js';

export function updName(v) {
  const s = activeSrv();
  if (!s) return;
  s.name = v;
  save();
  renderTabs();
}
export function updMode(v) {
  const s = activeSrv();
  if (!s) return;
  takeVersion(s, 'Before changing the mode');
  s.mode = v;
  const maps = getMapList(v);
  s.mapKey = maps[0].key;
  // reset guilds to mode default
  const n = v === 'ragnarok' ? 4 : 8;
  while (s.guilds.length < n)
    s.guilds.push({
      id: 'g' + Date.now() + '_' + s.guilds.length,
      name: `Guild ${s.guilds.length + 1}`,
      color: nextGuildColor(s.guilds),
    });
  while (s.guilds.length > n) s.guilds.pop();
  resetPlan(s);
  clearHistory(s);
  save();
  renderAll();
}
export function updMap(v) {
  const s = activeSrv();
  if (!s) return;
  takeVersion(s, 'Before changing the map');
  s.mapKey = v;
  resetPlan(s);
  clearHistory(s);
  save();
  renderAll();
}
export function updStart(v) {
  const s = activeSrv();
  if (!s) return;
  s.startDate = v;
  save();
  renderAll();
}
export function updEnd(v) {
  const s = activeSrv();
  if (!s) return;
  s.endDate = v;
  save();
  renderAll();
}
function updNotes(v) {
  const s = activeSrv();
  if (!s) return;
  s.notes = v;
  save();
}

function resetPlan(srv) {
  const mapData = getMapData(srv.mode, srv.mapKey);
  srv.plan = {};
  for (let d = 0; d < 14; d++) {
    srv.plan[d] = {};
    for (const k of mapData.kingdoms) srv.plan[d][k.id] = '';
  }
}

export function clearPlan() {
  const s = activeSrv();
  if (!s) return;
  takeVersion(s, 'Before Clear Plan');
  recordChange(s, 'Clear Plan');
  const mapData = getMapData(s.mode, s.mapKey);
  const day0 = { ...(s.plan[0] || {}) };
  s.plan = {};
  for (let d = 0; d < 14; d++) {
    s.plan[d] = {};
    for (const k of mapData.kingdoms) {
      s.plan[d][k.id] = d === 0 ? day0[k.id] || '' : '';
    }
  }
  s.manualEdits = {};
  // Leftovers from Undo Optimize (now part of Undo) and older versions of the app
  delete s.undoPlan;
  delete s.undoBase;
  delete s.redoPlan;
  delete s.redoBase;
  save();
  renderAll();
}

export function updGuildSmall(gid, isSmall) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  g.isSmall = isSmall; // save the boolean
  save();
  // No need to renderAll() here since it's just a checkbox toggle
}

export function updGuildName(gid, name) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  const active = document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId === gid;
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.name = name;
  save();
  renderAll();
  if (restore) {
    const input = document.querySelector(`input[data-guild-id="${gid}"]`);
    if (input) {
      input.focus();
      if (selStart !== null && selEnd !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}
export function updGuildPoints(gid, value) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  const active = document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId === gid && active.dataset.guildField === 'points';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  const pts = Math.max(0, parseInt(value, 10) || 0);
  g.basePoints = pts;
  save();
  renderAll();
  if (restore) {
    const input = document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="points"]`);
    if (input) {
      input.focus();
      if (selStart !== null && selEnd !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}
export function updGuildLv1(gid, value) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  g.baseLv1 = Math.max(0, parseInt(value, 10) || 0);
  save();
  renderAll();
}
export function addGuild() {
  const s = activeSrv();
  if (!s || s.guilds.length >= MAX_GUILDS) return;
  s.guilds.push({
    id: 'g' + Date.now(),
    name: `Guild ${s.guilds.length + 1}`,
    color: nextGuildColor(s.guilds),
    basePoints: 0,
  });
  save();
  renderAll();
}
export function removeGuild(gid) {
  const s = activeSrv();
  if (!s || s.guilds.length <= 2) return;
  const removed = s.guilds.find(g => g.id === gid);
  recordChange(s, `Remove ${removed ? removed.name : 'guild'}`, { guilds: true });
  s.guilds = s.guilds.filter(g => g.id !== gid);
  for (let d = 0; d < 14; d++) for (const k in s.plan[d]) if (s.plan[d][k] === gid) s.plan[d][k] = '';
  save();
  renderAll();
}

export function onCell(evt) {
  const s = activeSrv();
  if (!s) return;
  const kid = evt.target.dataset.k,
    day = +evt.target.dataset.d,
    gid = evt.target.value;
  recordChange(s, `${kid} on day ${day}`);
  if (!s.plan[day]) s.plan[day] = {};
  s.plan[day][kid] = gid;
  save();
  renderAll();
}

export function cpyMsg(el, d) {
  navigator.clipboard
    .writeText(el.dataset.msg)
    .then(() => {
      const h = el.querySelector('.msg-copied') || document.getElementById('cpd-' + d);
      if (h) {
        h.textContent = '✓ Copied';
        setTimeout(() => {
          h.textContent = '';
        }, 2000);
      }
    })
    .catch(() => {});
}

// Toolbar: copy today's daily message (whole server or one guild, whichever Daily Messages shows)
// without scrolling down to it.
export function copyTodayMessage(btn) {
  const s = activeSrv();
  if (!s) return;
  const text = todayMessage(s, todayDay(s, numDays(s)));
  if (!text) return showToast('Nothing to send today.', false, 2500);
  const done = label => {
    const before = setBtnLabel(btn, label);
    setTimeout(() => setBtnLabel(btn, before), 2000);
  };
  navigator.clipboard
    .writeText(text)
    .then(() => done('✓ Copied'))
    .catch(() => window.prompt("Copy today's message:", text));
}

export function clearDay(d) {
  const s = activeSrv();
  if (!s) return;
  const mapData = getMapData(s.mode, s.mapKey);
  recordChange(s, `Clear Day ${d}`);
  if (!s.plan[d]) s.plan[d] = {};
  for (const k of mapData.kingdoms) s.plan[d][k.id] = '';
  // Clear manual edit locks for this day
  if (s.manualEdits) {
    for (const k of mapData.kingdoms) delete s.manualEdits[`${d}_${k.id}`];
  }
  save();
  renderAll();
}

export function updGuildLv3(gid, value) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  const active = document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId === gid && active.dataset.guildField === 'lv3';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.baseLv3 = Math.max(0, parseInt(value, 10) || 0);
  save();
  renderAll();
  if (restore) {
    const input = document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="lv3"]`);
    if (input) {
      input.focus();
      if (selStart !== null && selEnd !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}

export function updGuildLv2(gid, value) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  const active = document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId === gid && active.dataset.guildField === 'lv2';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.baseLv2 = Math.max(0, parseInt(value, 10) || 0);
  save();
  renderAll();
  if (restore) {
    const input = document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="lv2"]`);
    if (input) {
      input.focus();
      if (selStart !== null && selEnd !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}

// ── Guild colors ──
const hexToRgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
// Rough perceived difference between two colors (0 = identical). Weighted RGB distance.
const colorDistance = (a, b) => {
  const [r1, g1, b1] = a,
    [r2, g2, b2] = b;
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
};
// Relative luminance (WCAG), used to warn about colors too dark to read on the dark background.
const luminance = ([r, g, b]) => {
  const ch = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};

// While choosing: recolor this guild's dot only (the rest of the page updates once a color is picked).
export function previewGuildColor(gid, color) {
  const dot = document.querySelector(`.guild-color[data-id="${gid}"]`);
  if (dot) dot.style.setProperty('--guild-color', color);
}

// Open the Palette / Custom picker for a guild's dot.
export function pickGuildColor(dot) {
  const s = activeSrv();
  if (!s || s.isViewOnly) return;
  const guild = s.guilds.find(x => x.id === dot.dataset.id);
  if (!guild) return;
  openColorPicker({
    anchor: dot,
    guild,
    others: s.guilds.filter(x => x.id !== guild.id),
    onPreview: c => previewGuildColor(guild.id, c),
    onPick: c => updGuildColor(guild.id, c),
  });
}

// A color was picked: save it everywhere, and warn about hard-to-tell-apart choices.
export function updGuildColor(gid, color) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  const rgb = hexToRgb(color);
  if (!g || !rgb) return;
  g.color = color.toLowerCase();
  save();
  renderAll();

  const close = s.guilds.find(o => o.id !== gid && hexToRgb(o.color) && colorDistance(rgb, hexToRgb(o.color)) < 90);
  if (close) {
    showToast(`That color looks a lot like ${close.name}'s, which may be hard to tell apart in the grid.`, false, 6000);
  } else if (luminance(rgb) < 0.12) {
    showToast(
      'That color is quite dark, so guild names in it may be hard to read on the dark background.',
      false,
      6000,
    );
  }
}

export function updGuildExcluded(gid, isExcluded) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  g.isExcluded = isExcluded;
  save();
}
