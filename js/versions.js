// js/versions.js
// Version history: saved copies of each server, kept in this browser so a mistake (or a deleted
// server) can be put back.
//
// A version is taken automatically every AUTO_MS while you edit, and always just before anything big:
// Clear Plan, Auto-Optimize, imports, changing mode or map, deleting a server, Sync from Cloud and
// restoring. Up to PER_SERVER versions per server; identical ones are skipped. Versions live under
// their own storage key, so they never slow down normal saving. If the browser runs out of space,
// the oldest versions are dropped first.

import { state, save } from './state.js';
import { esc, showToast } from './ui.js';
import { icon } from './icons.js';

const KEY = 'goc_versions';
const PER_SERVER = 10;
const AUTO_MS = 15 * 60 * 1000;
let afterRestore = () => {};

export function setVersionHooks({ restored }) {
  if (restored) afterRestore = restored;
}

function readAll() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    return d && typeof d === 'object' ? d : {};
  } catch (_) {
    return {};
  }
}

// Write, dropping the oldest versions (across all servers) until it fits.
function writeAll(all) {
  for (let tries = 0; tries < 200; tries++) {
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
      return true;
    } catch (_) {
      let oldest = null;
      for (const [id, list] of Object.entries(all)) {
        if (list.length && (!oldest || list[0].at < oldest.at)) oldest = { id, at: list[0].at };
      }
      if (!oldest) return false;
      all[oldest.id].shift();
      if (!all[oldest.id].length) delete all[oldest.id];
    }
  }
  return false;
}

const keepable = srv => srv && !srv.isTutorial && !srv.isViewOnly;

// Save a version of a server now. reason: shown in the list, e.g. "Before Clear Plan".
export function takeVersion(srv, reason) {
  if (!keepable(srv)) return;
  const all = readAll();
  const list = all[srv.id] || [];
  const data = JSON.stringify(srv);
  const last = list[list.length - 1];
  if (last && last.data === data) return; // nothing changed since the last version
  list.push({ at: Date.now(), reason, data });
  while (list.length > PER_SERVER) list.shift();
  all[srv.id] = list;
  writeAll(all);
}

// After each save: keep a version every AUTO_MS while a server is being edited.
export function autoVersion() {
  const srv = state.servers.find(s => s.id === state.activeId);
  if (!keepable(srv)) return;
  const list = readAll()[srv.id] || [];
  const last = list[list.length - 1];
  if (!last || Date.now() - last.at >= AUTO_MS) takeVersion(srv, 'Autosave');
}

// ── The Version History dialog ────────────────────────────────────
function when(at) {
  const d = new Date(at);
  const mins = Math.round((Date.now() - at) / 60000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const today = new Date();
  const yest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function describe(srv) {
  const days = Object.entries(srv.plan || {}).filter(
    ([d, day]) => d !== '0' && Object.values(day || {}).some(Boolean),
  ).length;
  return `${days} ${days === 1 ? 'day' : 'days'} planned · ${(srv.guilds || []).length} guilds`;
}

function restore(serverId, at) {
  const entry = (readAll()[serverId] || []).find(v => v.at === at);
  if (!entry) return;
  const data = JSON.parse(entry.data);
  const i = state.servers.findIndex(s => s.id === serverId);
  if (i >= 0) {
    takeVersion(state.servers[i], 'Before restoring'); // so a restore can itself be undone
    state.servers[i] = data;
  } else {
    state.servers.push(data); // a deleted server comes back
  }
  state.activeId = serverId;
  save();
  afterRestore(data);
  showToast(`Restored "${data.name}" from ${when(at).toLowerCase()}.`, false, 4000);
}

export function openVersions() {
  const srv = state.servers.find(s => s.id === state.activeId);
  const all = readAll();
  const mine = srv ? [...(all[srv.id] || [])].reverse() : [];
  const deleted = Object.entries(all)
    .filter(([id, list]) => list.length && !state.servers.some(s => s.id === id))
    .map(([id, list]) => ({ id, v: list[list.length - 1] }))
    .sort((a, b) => b.v.at - a.v.at);

  const row = (id, v) => {
    const data = JSON.parse(v.data);
    return `<li class="ver-row">
      <div class="ver-info">
        <span class="ver-when">${esc(when(v.at))}</span>
        <span class="ver-reason">${esc(v.reason)}</span>
        <span class="ver-desc">${esc(id === (srv && srv.id) ? describe(data) : `${data.name} · ${describe(data)}`)}</span>
      </div>
      <button type="button" class="btn-tool btn-tool-sm" data-ver-id="${esc(id)}" data-ver-at="${v.at}">Restore</button>
    </li>`;
  };

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal modal-versions" role="dialog" aria-modal="true" aria-labelledby="ver-title">
      <h3 id="ver-title">${icon('history')} Version History</h3>
      <p class="ver-help">Saved copies of ${srv ? `<b>${esc(srv.name)}</b>` : 'your servers'}, kept in this browser.
        A copy is taken every 15 minutes while you edit, and before anything big like Clear Plan, Auto-Optimize,
        an import or Sync from Cloud. Restoring keeps a copy of the current version first.</p>
      ${
        mine.length
          ? `<ul class="ver-list">${mine.map(v => row(srv.id, v)).join('')}</ul>`
          : `<p class="ver-empty">No saved versions of this server yet. They'll appear here as you work.</p>`
      }
      ${
        deleted.length
          ? `<h4 class="ver-sub">Deleted servers</h4><ul class="ver-list">${deleted.map(d => row(d.id, d.v)).join('')}</ul>`
          : ''
      }
      <div class="modal-row"><button type="button" class="btn" data-ver-close>Close</button></div>
    </div>`;
  document.body.appendChild(bg);
  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', e => {
    if (e.target === bg || e.target.closest('[data-ver-close]')) return close();
    const btn = e.target.closest('[data-ver-at]');
    if (btn) {
      close();
      restore(btn.dataset.verId, Number(btn.dataset.verAt));
    }
  });
  bg.querySelector('[data-ver-at], [data-ver-close]').focus();
}
