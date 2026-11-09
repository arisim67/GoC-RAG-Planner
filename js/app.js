// js/app.js
// Entry point: loads saved data, renders the page, starts the tutorial, and exposes the functions
// that the inline onclick="..." handlers in the HTML call.

import { state, load, activeSrv } from './state.js';
import { closeModal } from './ui.js';
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
import { autoOptimize, undoOptimize } from './optimize.js';
import { takeScreenshots } from './screenshots.js';
import { checkUrlForSharedPlan, publishToCloud, syncFromCloud } from './cloud.js';
import { initTour } from './tour.js';
import { isOldSite, forwardSharedLink, showMovedBanner, receiveMovedServers } from './move.js';
import { openMsgTemplate, setMessagesRerender } from './messages.js';

load();
// Old address: shared plan links go straight to the new site; everything else gets the banner.
if (!forwardSharedLink()) {
  if (isOldSite()) showMovedBanner();
  receiveMovedServers()
    .then(() => checkUrlForSharedPlan())
    .then(() => {
      renderTabs();
      renderAll();
      initTour({
        getActiveServer: () => activeSrv(),
        // Lets the guided setup tell a server they just made from ones they already had.
        getServerCount: () => state.servers.length,
        // No automatic tutorial on a shared link or on the old address (people should move first).
        isSharedLink: () => new URLSearchParams(window.location.search).has('plan') || isOldSite(),
        createDemoServer: createTutorialServer,
        removeDemoServer: removeTutorialServer,
      });
    });
}

setMessagesRerender(renderAll);
window.openMsgTemplate = openMsgTemplate;
window.openAdd = openAdd;
window.confirmAdd = confirmAdd;
window.closeModal = closeModal;
window.onAddModalModeChange = onAddModalModeChange;
window.onAddModalStartChange = onAddModalStartChange;
window.switchSrv = switchSrv;
window.removeSrv = removeSrv;
window.confirmDeleteSrv = confirmDeleteSrv;

// 🚨 Tab Context Menu
window.ctxRename = ctxRename;
window.ctxDuplicate = ctxDuplicate;
window.ctxDelete = ctxDelete;

window.updName = updName;
window.updMode = updMode;
window.updMap = updMap;
window.updStart = updStart;
window.updEnd = updEnd;
window.clearPlan = clearPlan;

window.openImport = openImport;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.processImport = processImport;
window.exportServer = exportServer;

window.takeScreenshots = takeScreenshots;
window.autoOptimize = autoOptimize;
window.undoOptimize = undoOptimize;
window.publishToCloud = publishToCloud;
window.syncFromCloud = syncFromCloud;

window.updGuildName = updGuildName;
window.updGuildSmall = updGuildSmall;
window.updGuildExcluded = updGuildExcluded;
window.updGuildPoints = updGuildPoints;
window.updGuildLv3 = updGuildLv3;
window.updGuildLv2 = updGuildLv2;
window.updGuildLv1 = updGuildLv1;
window.addGuild = addGuild;
window.removeGuild = removeGuild;

window.clearDay = clearDay;
window.onCell = onCell;
window.cpyMsg = cpyMsg;
