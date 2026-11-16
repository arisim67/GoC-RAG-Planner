// js/history.js
// Undo and redo for changes to the plan: grid cells, drag-to-copy, Clear Day / Clear Plan, imports by
// day, Auto-Optimize and removing a guild. Kept in memory for this visit, per server, up to LIMIT steps.
//
// Auto-Optimize is one of these steps. Because a run can take minutes, it is also saved with the
// server (undoPlan, plus undoBase: the plan the optimizer produced), so after a reload Undo can still
// take it back, as long as the plan is still exactly what the optimizer produced.
//
// Changes that swap out the whole setup (mode, map, importing a server or a new guild list) clear
// the history instead: undoing only the grid would leave it pointing at towns or guilds that no
// longer exist.

import { activeSrv, save } from './state.js';

const LIMIT = 50;
const stacks = new Map(); // server id -> { undo: [], redo: [] }
let rerender = () => {};
let notify = () => {};

export function setHistoryHooks({ render, toast }) {
  if (render) rerender = render;
  if (toast) notify = toast;
}

const copy = obj => JSON.parse(JSON.stringify(obj));
const stackOf = srv => {
  if (!stacks.has(srv.id)) {
    const st = { undo: [], redo: [] };
    // After a reload: offer to undo the last optimize if nothing has changed since.
    if (srv.undoPlan && srv.undoBase && srv.undoBase === JSON.stringify(srv.plan)) {
      st.undo.push({ label: 'Auto-Optimize', plan: copy(srv.undoPlan), guilds: null, optimize: true });
    }
    stacks.set(srv.id, st);
  }
  return stacks.get(srv.id);
};
// Keep the saved copy (for after a reload) in step with the optimize entry at the top of Undo.
function persistOptimize(srv) {
  const top = stackOf(srv).undo.at(-1);
  if (top && top.optimize) {
    srv.undoPlan = copy(top.plan);
    srv.undoBase = JSON.stringify(srv.plan);
  } else {
    delete srv.undoPlan;
    delete srv.undoBase;
  }
}
// What gets saved for a step: always the plan, and the guild list when the step changes it.
const snapshot = (srv, withGuilds) => ({ plan: copy(srv.plan || {}), guilds: withGuilds ? copy(srv.guilds) : null });

// Call just BEFORE changing the plan. `plan` lets a caller pass the plan as it was before a change it
// has already made (Auto-Optimize records only once it has succeeded).
export function recordChange(srv, label, { guilds = false, plan = null, optimize = false } = {}) {
  if (!srv) return;
  const st = stackOf(srv);
  const snap = snapshot(srv, guilds);
  if (plan) snap.plan = copy(plan);
  st.undo.push({ label, ...snap, optimize });
  if (st.undo.length > LIMIT) st.undo.shift();
  st.redo.length = 0;
  // Only an optimize is remembered across reloads; any other change ends that.
  if (optimize) {
    srv.undoPlan = copy(snap.plan);
    srv.undoBase = null; // set once the optimized plan is in place (see setOptimizedBase)
  } else {
    delete srv.undoPlan;
    delete srv.undoBase;
  }
}

// Called once Auto-Optimize has put its plan in place.
export function setOptimizedBase(srv) {
  if (srv && srv.undoPlan) srv.undoBase = JSON.stringify(srv.plan);
}

export function clearHistory(srv) {
  if (srv) stacks.delete(srv.id);
}

export const canUndo = srv => !!(srv && stackOf(srv).undo.length);
export const canRedo = srv => !!(srv && stackOf(srv).redo.length);
export const undoLabel = srv => (canUndo(srv) ? stackOf(srv).undo.at(-1).label : '');
export const redoLabel = srv => (canRedo(srv) ? stackOf(srv).redo.at(-1).label : '');

function step(from, to, verb) {
  const srv = activeSrv();
  if (!srv || srv.isViewOnly) return;
  const st = stackOf(srv);
  const entry = st[from].pop();
  if (!entry) return;
  st[to].push({ label: entry.label, ...snapshot(srv, !!entry.guilds), optimize: entry.optimize });
  srv.plan = entry.plan;
  if (entry.guilds) srv.guilds = entry.guilds;
  persistOptimize(srv);
  save();
  rerender();
  notify(`${verb}: ${entry.label}`);
}

export const undo = () => step('undo', 'redo', 'Undone');
export const redo = () => step('redo', 'undo', 'Redone');

// Ctrl+Z / Cmd+Z to undo; Ctrl+Y, Ctrl+Shift+Z or Cmd+Shift+Z to redo. Text boxes keep their own
// undo for typing, so the shortcuts only apply outside them.
export function handleUndoKeys(e) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const t = e.target;
  const typing =
    t &&
    (t.isContentEditable ||
      t.tagName === 'TEXTAREA' ||
      (t.tagName === 'INPUT' && !['checkbox', 'radio', 'color'].includes(t.type)));
  if (typing || document.querySelector('.modal-bg.open, .modal-tpl, .tour-card')) return;
  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
}
