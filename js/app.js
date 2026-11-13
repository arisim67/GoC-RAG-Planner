// js/app.js
// Entry point: loads saved data, renders the page, starts the tutorial, and connects the page's
// buttons and fields to their functions (see js/actions.js for how data-action etc. work).

import { state, load, activeSrv, setAfterSave, save, numDays } from './state.js';

let demoCell = null; // the broken move put in for the tutorial's Status step
import { closeModal, showToast, usingTouch } from './ui.js';
import { renderTabs, renderAll } from './render.js';
import {
  createTutorialServer,
  removeTutorialServer,
  openAdd,
  confirmAdd,
  onAddModalModeChange,
  onAddModalStartChange,
  switchSrv,
  removeSrv,
  confirmDeleteSrv,
  ctxRename,
  ctxDuplicate,
  ctxDelete,
  duplicateCurrentPlan,
} from './servers.js';
import {
  updName,
  updMode,
  updMap,
  updStart,
  updEnd,
  clearPlan,
  updGuildName,
  updGuildSmall,
  updGuildExcluded,
  pickGuildColor,
  copyTodayMessage,
  updGuildPoints,
  updGuildLv3,
  updGuildLv2,
  updGuildLv1,
  addGuild,
  removeGuild,
  clearDay,
  onCell,
  cpyMsg,
} from './handlers.js';
import {
  openImport,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileSelect,
  processImport,
  exportServer,
} from './import-export.js';
import { autoOptimize, optimizeStatus } from './optimize.js';
import { takeScreenshots } from './screenshots.js';
import { checkUrlForSharedPlan, publishToCloud, syncFromCloud } from './cloud.js';
import { initTour } from './tour.js';
import { isOldSite, forwardSharedLink, showMovedBanner, receiveMovedServers } from './move.js';
import {
  openMsgTemplate,
  setMessagesRerender,
  receiveSharedTemplate,
  hasSharedTemplate,
  setMsgView,
  setMsgDay,
} from './messages.js';
import { isMidEvent, validateAdj } from './calc.js';
import { getMapData } from './maps/index.js';
import { initActions, registerActions } from './actions.js';
import { undo, redo, handleUndoKeys, setHistoryHooks, clearHistory, recordChange } from './history.js';
import { toggleSpotlight, handleSpotlightKeys } from './spotlight.js';
import { openVersions, autoVersion, setVersionHooks } from './versions.js';
import { statusJump } from './status-jump.js';
import {
  setMapDay,
  showMapDay,
  setMapPick,
  getMapPick,
  startingTownLimit,
  startingCount,
  advanceMapPick,
} from './map-view.js';
import { initWhatsNew, whatsNewAfterTour } from './whats-new.js';
import './grid-keys.js'; // keyboard editing for the Planning Grid
import { initThemePicker } from './theme.js';

load();
initThemePicker();
// Guild colors are drawn as a different shade on the Light theme, so redraw when the theme changes
document.addEventListener('themechange', () => renderAll());
// Old address: shared plan links go straight to the new site; everything else gets the banner.
if (!forwardSharedLink()) {
  if (isOldSite()) showMovedBanner();
  const sharedTemplate = hasSharedTemplate(); // read before the link is tidied away
  receiveMovedServers()
    .then(() => checkUrlForSharedPlan())
    .then(() => {
      renderTabs();
      renderAll();
      receiveSharedTemplate();
      // Used the planner before? (Checked before the tutorial marks itself as seen.)
      let returning = state.servers.some(s => !s.isTutorial && !s.isViewOnly);
      try {
        returning = returning || localStorage.getItem('goc_tour_seen') !== null;
      } catch (_) {
        /* ignore */
      }
      const tourStarting = initTour({
        getActiveServer: () => activeSrv(),
        // Lets the guided setup tell a server they just made from ones they already had.
        getServerCount: () => state.servers.length,
        // No automatic tutorial on a shared plan or template link, or on the old address (people should move first).
        isSharedLink: () => new URLSearchParams(window.location.search).has('plan') || sharedTemplate || isOldSite(),
        createDemoServer: createTutorialServer,
        // Puts the Map on Day 0, for the tutorial step about setting starting towns there.
        showMapDay0: () => {
          const s = activeSrv();
          if (s) showMapDay(s.id, 0);
          renderAll();
        },
        removeDemoServer: removeTutorialServer,
        // The guided setup's Auto-Optimize step waits for a run to start or finish.
        optimizeStatus,
        // The Status step needs something to point at: a guild put on a town it can't reach on Day 1.
        makeDemoIssue: () => {
          const s = activeSrv();
          if (!s || s.isViewOnly || numDays(s) < 1) return false;
          const md = getMapData(s.mode, s.mapKey);
          const day1 = s.plan[1] || {};
          for (const k of [...md.kingdoms].reverse()) {
            for (const g of s.guilds) {
              if (day1[k.id] === g.id) continue;
              const was = day1[k.id];
              if (!s.plan[1]) s.plan[1] = {};
              s.plan[1][k.id] = g.id;
              if (validateAdj(s).some(x => x.day === 1 && x.kingdom === k.id)) {
                demoCell = { srvId: s.id, k: k.id, was, hadDay: !!day1 };
                renderAll();
                return true;
              }
              if (was === undefined) delete s.plan[1][k.id];
              else s.plan[1][k.id] = was;
            }
          }
          return false;
        },
        undoDemoIssue: () => {
          const s = state.servers.find(x => demoCell && x.id === demoCell.srvId);
          if (s && s.plan[1]) {
            if (demoCell.was === undefined) delete s.plan[1][demoCell.k];
            else s.plan[1][demoCell.k] = demoCell.was;
          }
          demoCell = null;
          save(); // in case something else saved while it was in
          renderAll();
        },
        onEnd: whatsNewAfterTour,
      });
      // Not on the old address (people should move first), nor over a shared template being opened.
      if (!isOldSite() && !sharedTemplate) {
        initWhatsNew({ returning, tourStarting, openTour: () => window.startTour() });
      }
    });
}

setMessagesRerender(renderAll);

// ── What each button and field does ──────────────────────────────
const guildId = el => el.dataset.guildId || el.dataset.id;

// Towns on the map are SVG, which has no keyboard click: Enter or Space on a focused town taps it.
// The same for the daily message card (a div that copies when clicked).
document.addEventListener('keydown', e => {
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t.closest && t.closest('.map-town.pickable, .msg-card')) {
    e.preventDefault();
    t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
});

// One of the Points / Castle / Dorms / Towns boxes changed.
function midValue(el, upd) {
  const s = activeSrv();
  if (s && !s.isViewOnly) s.showMidEvent = true;
  upd(guildId(el), el.value);
}

registerActions('click', {
  // Header, tabs and dialogs
  tutorial: () => window.startTour && window.startTour(),
  'open-add': openAdd,
  'switch-server': el => switchSrv(el.dataset.id),
  'remove-server': el => removeSrv(el.dataset.id),
  'close-modal': el => closeModal(el.dataset.modal),
  'confirm-add': confirmAdd,
  'confirm-delete': confirmDeleteSrv,
  'ctx-rename': ctxRename,
  'ctx-duplicate': ctxDuplicate,
  'ctx-delete': ctxDelete,
  // Toolbar
  optimize: autoOptimize,
  undo,
  redo,
  'open-import': openImport,
  'export-server': exportServer,
  screenshots: (el, e) => takeScreenshots(e),
  'save-cloud': publishToCloud,
  'sync-cloud': syncFromCloud,
  'copy-today': copyTodayMessage,
  spotlight: el => toggleSpotlight(el.dataset.id),
  versions: openVersions,
  'status-jump': statusJump,
  'map-pick': btn => {
    setMapPick(btn);
    renderAll();
  },
  // Day 0 on the map: give the tapped town to the picked guild, or clear it (tapping a town the
  // picked guild already has also clears it).
  'map-town': el => {
    const srv = activeSrv();
    if (!srv || srv.isViewOnly) return;
    const pick = getMapPick(srv.id);
    if (pick === undefined) {
      showToast('Pick a guild above the map first, then tap its towns.', false, 3000);
      return;
    }
    const k = el.dataset.k;
    const cur = (srv.plan[0] || {})[k] || '';
    const next = pick && cur !== pick ? pick : '';
    if (cur === next) return;
    const max = startingTownLimit(srv, next);
    if (next && !isMidEvent(srv) && startingCount(srv, next) >= max) {
      const g = srv.guilds.find(x => x.id === next);
      showToast(
        `${g ? g.name : 'That guild'} ${max ? `already has ${max} starting town${max === 1 ? '' : 's'}. Tap one of them to clear it first.` : 'doesn’t start with any towns on this map.'}`,
        false,
        3500,
      );
      return;
    }
    recordChange(srv, 'Starting towns on the map');
    if (!srv.plan[0]) srv.plan[0] = {};
    srv.plan[0][k] = next;
    advanceMapPick(srv);
    save();
    renderAll();
    const again = document.querySelector(`#sec-map .map-town[data-k="${CSS.escape(k)}"]`);
    if (again) again.focus({ preventScroll: true });
  },
  'map-day': btn => {
    setMapDay(btn);
    renderAll();
  },
  'clear-plan': clearPlan,
  'duplicate-plan': duplicateCurrentPlan,
  // Import dialog
  'pick-import-file': (el, e) => {
    if (e.target.id !== 'import-file') document.getElementById('import-file').click();
  },
  'process-import': processImport,
  // Guilds, grid and messages
  'add-guild': addGuild,
  'remove-guild': el => removeGuild(el.dataset.id),
  'guild-color': pickGuildColor,
  'clear-day': el => clearDay(Number(el.dataset.day)),
  'copy-message': el => cpyMsg(el, Number(el.dataset.day)),
  'message-template': openMsgTemplate,
  // Daily Messages: which day, and the whole server's message or one guild's
  'msg-day': el => {
    const s = activeSrv();
    if (!s) return;
    setMsgDay(s.id, Number(el.dataset.day));
    renderAll();
    focusAgain(`#sec-messages [data-action="msg-day"][data-day="${el.dataset.day}"]`);
  },
  'msg-view': el => {
    setMsgView(el.dataset.view);
    renderAll();
    focusAgain(`#sec-messages [data-action="msg-view"][data-view="${el.dataset.view}"]`);
  },
});

// After a re-render, put the keyboard back on the control that was used. (Not after a tap on a
// dropdown: on a touch screen that would open its list again.)
function focusAgain(sel) {
  const el = document.querySelector(sel);
  if (el && el.tagName === 'SELECT' && usingTouch()) return;
  if (el) el.focus({ preventScroll: true });
}

registerActions('change', {
  // The guild whose message Daily Messages shows (saved with the server)
  'msg-guild': el => {
    const s = activeSrv();
    if (!s || s.isViewOnly) return;
    s.msgGuild = el.value;
    save();
    renderAll();
    focusAgain('#sec-messages .msg-guild');
  },
  'server-name': el => updName(el.value),
  'server-mode': el => updMode(el.value),
  'server-map': el => updMap(el.value),
  'server-start': el => updStart(el.value),
  'server-end': el => updEnd(el.value),
  'guild-small': el => updGuildSmall(el.dataset.id, el.checked),
  'guild-excluded': el => updGuildExcluded(el.dataset.id, el.checked),
  // Shows or hides the Points / Castle / Dorms / Towns boxes on the guild list. (Typing in one keeps
  // them showing, so setting the last one back to 0 doesn't whisk them away mid-edit; see midValue.)
  'mid-event-toggle': el => {
    const s = activeSrv();
    if (!s || s.isViewOnly) return;
    s.showMidEvent = el.checked;
    save();
    renderAll();
  },
  'guild-points': el => midValue(el, updGuildPoints),
  'guild-lv3': el => midValue(el, updGuildLv3),
  'guild-lv2': el => midValue(el, updGuildLv2),
  'guild-lv1': el => midValue(el, updGuildLv1),
  cell: (el, e) => onCell(e),
  'import-file': (el, e) => handleFileSelect(e),
  'import-mode': el => {
    const guildsOnly = el.value === 'guilds';
    document.getElementById('import-day-container').style.opacity = guildsOnly ? '0.3' : '1';
    document.getElementById('import-day').disabled = guildsOnly;
  },
  'add-modal-mode': onAddModalModeChange,
  'add-modal-start': onAddModalStartChange,
});

registerActions('input', {
  'guild-name': el => updGuildName(guildId(el), el.value),
});

initActions();
setHistoryHooks({ render: renderAll, toast: msg => showToast(msg, false, 2500) });
document.addEventListener('keydown', handleUndoKeys);
document.addEventListener('keydown', handleSpotlightKeys);
setAfterSave(autoVersion);
setVersionHooks({
  restored: srv => {
    clearHistory(srv); // undo steps belong to the version that was replaced
    renderTabs();
    renderAll();
  },
});

// Drag a JSON file onto the import box
const dropzone = document.getElementById('import-dropzone');
dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('dragleave', handleDragLeave);
dropzone.addEventListener('drop', handleDrop);
