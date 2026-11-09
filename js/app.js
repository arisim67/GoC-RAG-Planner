// js/app.js
// Entry point: loads saved data, renders the page, starts the tutorial, and connects the page's
// buttons and fields to their functions (see js/actions.js for how data-action etc. work).

import { state, load, activeSrv, setAfterSave } from './state.js';
import { closeModal, showToast } from './ui.js';
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
import { autoOptimize } from './optimize.js';
import { takeScreenshots } from './screenshots.js';
import { checkUrlForSharedPlan, publishToCloud, syncFromCloud } from './cloud.js';
import { initTour } from './tour.js';
import { isOldSite, forwardSharedLink, showMovedBanner, receiveMovedServers } from './move.js';
import { openMsgTemplate, setMessagesRerender, receiveSharedTemplate, hasSharedTemplate } from './messages.js';
import { initActions, registerActions } from './actions.js';
import { undo, redo, handleUndoKeys, setHistoryHooks, clearHistory } from './history.js';
import { toggleSpotlight, handleSpotlightKeys } from './spotlight.js';
import { openVersions, autoVersion, setVersionHooks } from './versions.js';
import './grid-keys.js'; // keyboard editing for the Planning Grid

load();
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
      initTour({
        getActiveServer: () => activeSrv(),
        // Lets the guided setup tell a server they just made from ones they already had.
        getServerCount: () => state.servers.length,
        // No automatic tutorial on a shared plan or template link, or on the old address (people should move first).
        isSharedLink: () => new URLSearchParams(window.location.search).has('plan') || sharedTemplate || isOldSite(),
        createDemoServer: createTutorialServer,
        removeDemoServer: removeTutorialServer,
      });
    });
}

setMessagesRerender(renderAll);

// ── What each button and field does ──────────────────────────────
const guildId = el => el.dataset.guildId || el.dataset.id;

registerActions('click', {
  // Header, tabs and dialogs
  tutorial: () => window.startTour && window.startTour(),
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
});

registerActions('change', {
  'server-name': el => updName(el.value),
  'server-mode': el => updMode(el.value),
  'server-map': el => updMap(el.value),
  'server-start': el => updStart(el.value),
  'server-end': el => updEnd(el.value),
  'guild-small': el => updGuildSmall(el.dataset.id, el.checked),
  'guild-excluded': el => updGuildExcluded(el.dataset.id, el.checked),
  'guild-points': el => updGuildPoints(guildId(el), el.value),
  'guild-lv3': el => updGuildLv3(guildId(el), el.value),
  'guild-lv2': el => updGuildLv2(guildId(el), el.value),
  'guild-lv1': el => updGuildLv1(guildId(el), el.value),
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
