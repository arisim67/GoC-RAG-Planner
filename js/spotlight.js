// js/spotlight.js
// Guild spotlight: pick a guild (from the chips above the grid, or its Final Scores card) to outline
// its towns in the grid and dim everything else, in the grid, the Declares table and the score cards.
// Click it again, or press Escape, to clear. Remembered per server while the page is open.

import { activeSrv } from './state.js';

const chosen = new Map(); // server id -> guild id

export const spotlightOf = srv => (srv && chosen.get(srv.id)) || null;

export function toggleSpotlight(gid) {
  const srv = activeSrv();
  if (!srv) return;
  if (!gid || chosen.get(srv.id) === gid) chosen.delete(srv.id);
  else chosen.set(srv.id, gid);
  applySpotlight();
}

// Apply the current spotlight to the page. Called after every render, and when it changes.
export function applySpotlight(root = document.getElementById('main-content')) {
  if (!root) return;
  const srv = activeSrv();
  let gid = spotlightOf(srv);
  if (gid && !(srv.guilds || []).some(g => g.id === gid)) {
    chosen.delete(srv.id); // the guild was removed
    gid = null;
  }
  const guild = gid ? srv.guilds.find(g => g.id === gid) : null;
  root.classList.toggle('spot-on', !!guild);
  if (guild) root.style.setProperty('--spot-color', guild.color);
  else root.style.removeProperty('--spot-color');

  root.querySelectorAll('[data-g]').forEach(el => el.classList.toggle('spot-hit', !!gid && el.dataset.g === gid));
  root
    .querySelectorAll('.spot-chip')
    .forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.id === gid)));
  const summary = root.querySelector('.spot-summary');
  if (summary) {
    const chip = gid && root.querySelector(`.spot-chip[data-id="${gid}"]`);
    summary.textContent = chip ? chip.dataset.summary : '';
    summary.hidden = !chip;
  }
}

// Escape clears the spotlight (unless a dialog, pop-up or the tutorial is open).
export function handleSpotlightKeys(e) {
  if (e.key !== 'Escape' || !spotlightOf(activeSrv())) return;
  if (document.querySelector('.modal-bg.open, .modal-tpl, .color-pop, .tour-card, #tab-ctx.open')) return;
  toggleSpotlight(null);
}
