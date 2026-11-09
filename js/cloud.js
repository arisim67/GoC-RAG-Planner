// js/cloud.js
// Save to Cloud / Sync from Cloud, and opening shared plan links (?plan=...).
// On Cloudflare Pages, functions/index.js gives each shared plan link its own preview.

import { CLOUD_SYNC_URL } from './config.js';
import { state, activeSrv, save } from './state.js';
import { renderAll } from './render.js';
import { renderPlanPreview, previewText } from './preview.js';
import { setBtnLabel } from './icons.js';
import { isOldSite, newSiteUrl } from './move.js';

const WORKER_URL = CLOUD_SYNC_URL; // set in js/config.js

export async function publishToCloud() {
  const srv = activeSrv();
  if (!srv) return;

  const btn = document.getElementById('btn-share-cloud');
  const originalText = setBtnLabel(btn, 'Saving...');
  btn.disabled = true;

  try {
    // Link-preview image for Discord etc. If it can't be drawn, the plan still saves.
    const preview = await renderPlanPreview(srv);
    const { title, description } = previewText(srv);
    const body = preview ? { ...srv, preview, previewMeta: { title, description } } : srv;

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      srv.cloudSynced = true; // 🚨 NEW
      save(); // 🚨 NEW

      // 🚨 Fix 1: Force the creator's URL bar to update immediately
      window.history.replaceState({}, document.title, window.location.pathname + '?plan=' + srv.id);

      // Built from wherever the app is opened; from the old address, links point to the new site.
      // &v= changes on each save so Discord fetches the new preview instead of reusing a cached one;
      // the app ignores it.
      const base = isOldSite() ? newSiteUrl() : window.location.origin + window.location.pathname;
      const shareUrl = base + '?plan=' + srv.id + '&v=' + Date.now().toString(36);
      // Safari drops the "user gesture" after an awaited fetch, so the clipboard write can be
      // refused even though the save worked. Treat that as a copy failure, not a save failure.
      let copied = false;
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (e) {
        console.warn('Clipboard blocked', e);
      }
      setBtnLabel(btn, copied ? '✓ Saved & Copied!' : '✓ Saved!');
      setTimeout(() => {
        setBtnLabel(btn, originalText);
        btn.disabled = false;
      }, 2500);
      if (!copied) setTimeout(() => window.prompt('Saved! Copy this share link:', shareUrl), 50);
    } else {
      throw new Error('Failed to save to cloud');
    }
  } catch (err) {
    console.error(err);
    alert('Failed to sync to cloud. Check your connection or Worker URL.');
    setBtnLabel(btn, originalText);
    btn.disabled = false;
  }
}

export async function syncFromCloud() {
  const srv = activeSrv();
  if (!srv) return;

  // renderAll() rebuilds the page, replacing this button, so always look up the current one.
  const syncBtn = () => document.getElementById('btn-sync-cloud');
  const setBtn = (text, disabled) => {
    const b = syncBtn();
    if (b) {
      setBtnLabel(b, text);
      b.disabled = disabled;
    }
  };
  const originalText = setBtnLabel(syncBtn(), 'Syncing...');
  setBtn('Syncing...', true);

  try {
    const res = await fetch(`${WORKER_URL}?plan=${srv.id}&t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Plan not found in cloud');

    const sharedSrv = await res.json();
    sharedSrv.cloudSynced = true;

    const existingIdx = state.servers.findIndex(s => s.id === sharedSrv.id);
    if (existingIdx >= 0) {
      // Preserve the view-only lock if a viewer syncs to get your latest changes
      sharedSrv.isViewOnly = state.servers[existingIdx].isViewOnly;
      state.servers[existingIdx] = sharedSrv;
    }

    window.history.replaceState({}, document.title, window.location.pathname + '?plan=' + srv.id);
    save();
    renderAll();

    setBtn('✓ Synced!', true);
  } catch (err) {
    console.error(err);
    alert('No cloud updates found for this specific server.');
    setBtn('Error', true);
  }

  setTimeout(() => setBtn(originalText, false), 2500);
}

export async function checkUrlForSharedPlan() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan');
  if (!planId) return;

  try {
    const res = await fetch(`${WORKER_URL}?plan=${planId}`);
    if (!res.ok) throw new Error('Plan not found');
    const sharedSrv = await res.json();
    sharedSrv.cloudSynced = true;

    const existingIdx = state.servers.findIndex(s => s.id === sharedSrv.id);
    if (existingIdx >= 0) {
      // The creator already has it in local storage, so keep it editable
      sharedSrv.isViewOnly = state.servers[existingIdx].isViewOnly;
      state.servers[existingIdx] = sharedSrv;
    } else {
      // It's a new visitor: Lock the UI
      sharedSrv.isViewOnly = true;
      state.servers.push(sharedSrv);
    }
    state.activeId = sharedSrv.id;
    save();
  } catch (err) {
    console.error(err);
    alert('Could not load the shared plan. It may have expired or the link is incorrect.');
  }
}
