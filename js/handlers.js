// js/handlers.js
// Edits made in the page: server settings, guild fields, grid cells, clearing days, copying messages.

import { activeSrv, save, nextGuildColor, MAX_GUILDS } from './state.js';
import { renderTabs, renderAll } from './render.js';
import { getMapList, getMapData } from './maps/index.js';

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
  save();
  renderAll();
}
export function updMap(v) {
  const s = activeSrv();
  if (!s) return;
  s.mapKey = v;
  resetPlan(s);
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
  delete s.undoPlan;
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
  if (!s.plan[day]) s.plan[day] = {};
  s.plan[day][kid] = gid;
  save();
  renderAll();
}

export function cpyMsg(el, d) {
  navigator.clipboard
    .writeText(el.dataset.msg)
    .then(() => {
      const h = document.getElementById('cpd-' + d);
      if (h) {
        h.textContent = '✓ Copied';
        setTimeout(() => {
          h.textContent = '';
        }, 2000);
      }
    })
    .catch(() => {});
}

export function clearDay(d) {
  const s = activeSrv();
  if (!s) return;
  const mapData = getMapData(s.mode, s.mapKey);
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

export function updGuildExcluded(gid, isExcluded) {
  const s = activeSrv();
  if (!s) return;
  const g = s.guilds.find(x => x.id === gid);
  if (!g) return;
  g.isExcluded = isExcluded;
  save();
}
