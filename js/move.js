// js/move.js
// Moving from the old address (GitHub Pages) to the new one (Cloudflare Pages).
//
// Each address has its own browser storage, so saved servers don't follow people to the new site.
// On the old site, a banner offers "Move my servers": everything is packed into the part of the new
// site's link after "#", which browsers never send to any server, so nothing is uploaded. The new
// site unpacks it, asks first, and adds the servers without overwriting anything already there.
//
// Shared plan links (?plan=...) opened on the old site go straight to the new site, unless this
// browser already has that plan saved (the person who made it), who should move their servers first.
//
// Testing before the move: add ?moved-test to any goc-rag-planner.pages.dev address to see the
// banner there. ?moved-test=https://cloudflare-test.goc-rag-planner.pages.dev/ sends the move to
// that address instead of the main site (it must be another *.goc-rag-planner.pages.dev address).

import { NEW_SITE_URL, OLD_SITE_HOSTS } from './config.js';
import { state, save } from './state.js';
import { esc, showToast } from './ui.js';

const STORE_KEY = 'goc_v3';
const TOUR_KEY = 'goc_tour_seen';
const HASH_PREFIX = '#move=';
const MAX_LINK = 1800000; // stay well under browsers' URL length limits
const OFF_DATE = 'January 1, 2027'; // when GitHub Pages (the old address) will be switched off

const TEST_PARAM = 'moved-test';
const TEST_HOST_RE = /^([a-z0-9-]+\.)?goc-rag-planner\.pages\.dev$/i;

function testTarget() {
  const params = new URLSearchParams(location.search);
  if (!params.has(TEST_PARAM) || !TEST_HOST_RE.test(location.hostname)) return null;
  const t = params.get(TEST_PARAM);
  try {
    const u = new URL(t);
    if (u.protocol === 'https:' && TEST_HOST_RE.test(u.hostname)) return u.origin + '/';
  } catch (_) { /* not a URL: use the main site */ }
  return NEW_SITE_URL;
}

// True on the old address (or when testing with ?moved-test).
export function isOldSite() {
  return OLD_SITE_HOSTS.includes(location.hostname) || testTarget() !== null;
}

// The new site's address (or the test target).
export function newSiteUrl() {
  return testTarget() || NEW_SITE_URL;
}

// Old site: send shared plan links on to the new site. Returns true if the page is leaving.
export function forwardSharedLink() {
  if (!isOldSite()) return false;
  const params = new URLSearchParams(location.search);
  const planId = params.get('plan');
  if (!planId || state.servers.some(s => s.id === planId)) return false;
  params.delete(TEST_PARAM);
  location.replace(newSiteUrl() + '?' + params.toString());
  return true;
}

// ── Packing servers into a link ──────────────────────────────────
function toB64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// "z" + gzip when the browser can compress, otherwise "j" + plain JSON.
async function pack(obj) {
  const json = JSON.stringify(obj);
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return 'z' + toB64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return 'j' + toB64Url(new TextEncoder().encode(json));
}
async function unpack(s) {
  const bytes = fromB64Url(s.slice(1));
  if (s[0] === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  if (s[0] === 'j') return JSON.parse(new TextDecoder().decode(bytes));
  throw new Error('Unknown format');
}

// Read straight from storage so a shared plan opened in this visit isn't moved as if it were saved.
function savedServers() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return { servers: (d.servers || []).filter(s => !s.isTutorial), activeId: d.activeId || null };
  } catch (_) { return { servers: [], activeId: null }; }
}

async function moveServers() {
  const { servers, activeId } = savedServers();
  if (!servers.length) { location.href = newSiteUrl(); return; }
  let tourSeen = null;
  try { tourSeen = localStorage.getItem(TOUR_KEY); } catch (_) { /* ignore */ }
  let data;
  try {
    data = await pack({ v: 1, servers, activeId, tourSeen });
  } catch (e) {
    console.error(e);
    showToast('Could not pack your servers. Use Export Server on each one and Import it on the new site.');
    return;
  }
  if (data.length > MAX_LINK) {
    showToast('Too much data to move in one go. Use Export Server on each one and Import it on the new site.');
    return;
  }
  location.href = newSiteUrl() + HASH_PREFIX + data;
}

// ── Old site: the banner ─────────────────────────────────────────
export function showMovedBanner() {
  const n = savedServers().servers.length;
  const host = newSiteUrl().replace(/^https:\/\//, '').replace(/\/$/, '');
  const bar = document.createElement('div');
  bar.className = 'moved-banner';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'The planner has moved');
  bar.innerHTML = `
    <div class="moved-text">
      <strong>📦 The planner has moved to <a href="${esc(newSiteUrl())}">${esc(host)}</a></strong>
      <span>${n
        ? `Your ${n === 1 ? 'server is' : n + ' servers are'} saved in this browser for this address only. Move ${n === 1 ? 'it' : 'them'} before ${OFF_DATE}, when this address is turned off. Nothing is uploaded.`
        : `Please update your bookmarks: this old address will be turned off on ${OFF_DATE}.`}</span>
    </div>
    <div class="moved-actions">
      ${n ? `<button type="button" class="btn-gold" id="btn-move-servers">Move my ${n === 1 ? 'server' : n + ' servers'} →</button>` : ''}
      <a class="${n ? 'btn' : 'btn-gold'}" href="${esc(newSiteUrl())}">${n ? 'Just open the new site' : 'Go to the new site →'}</a>
    </div>`;
  document.body.prepend(bar);
  const btn = bar.querySelector('#btn-move-servers');
  if (btn) btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = '⏳ Moving...';
    await moveServers();
    btn.disabled = false; btn.textContent = `Move my ${n === 1 ? 'server' : n + ' servers'} →`;
  });
}

// ── New site: receiving servers ──────────────────────────────────
const same = (a, b) => {
  const strip = s => { const { cloudSynced, ...rest } = s; return JSON.stringify(rest); };
  return strip(a) === strip(b);
};

function askToImport(servers) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    const names = servers.map(s => `<li>${esc(s.name || 'Untitled')}${s.isViewOnly ? ' <span class="move-viewonly">view-only</span>' : ''}</li>`).join('');
    const n = servers.length;
    bg.innerHTML = `
      <div class="modal modal-move" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <h3 id="move-title">📦 Move ${n === 1 ? 'your server' : n + ' servers'} here?</h3>
        <p class="move-msg">From the planner's old address:</p>
        <ul class="move-list">${names}</ul>
        <p class="move-hint">Servers you already have here stay as they are.</p>
        <div class="modal-row modal-row-center">
          <button type="button" class="btn" data-a="no">Cancel</button>
          <button type="button" class="btn-accent" data-a="yes">Move ${n === 1 ? 'server' : n + ' servers'}</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    const done = ok => { bg.remove(); resolve(ok); };
    bg.querySelector('[data-a="yes"]').addEventListener('click', () => done(true));
    bg.querySelector('[data-a="no"]').addEventListener('click', () => done(false));
    bg.querySelector('[data-a="yes"]').focus();
  });
}

// New site: if the page was opened by "Move my servers", offer to add them. Call after load().
export async function receiveMovedServers() {
  if (!location.hash.startsWith(HASH_PREFIX)) return;
  const data = location.hash.slice(HASH_PREFIX.length);
  // Take the data out of the address bar right away so it isn't bookmarked or shared by mistake.
  history.replaceState(null, '', location.pathname + location.search);
  let payload;
  try { payload = await unpack(data); } catch (e) {
    console.error(e);
    showToast('Could not read the moved servers. Try Move my servers again, or use Export / Import.');
    return;
  }
  const incoming = (payload && Array.isArray(payload.servers) ? payload.servers : []).filter(s => s && s.id && s.plan);
  if (!incoming.length) return;
  if (!(await askToImport(incoming))) { showToast('Nothing was moved. You can try again from the old address.', false, 4000); return; }

  let added = 0, already = 0;
  for (const s of incoming) {
    const i = state.servers.findIndex(x => x.id === s.id);
    if (i < 0) { state.servers.push(s); added++; }
    else if (same(state.servers[i], s)) already++;
    else if (state.servers[i].isViewOnly && !s.isViewOnly) { state.servers[i] = s; added++; } // your own copy beats a view-only one
    else {
      // Both versions were edited: keep both rather than lose either.
      state.servers.push({ ...s, id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2), name: (s.name || 'Untitled') + ' (moved)', cloudSynced: false });
      added++;
    }
  }
  if (!state.servers.some(x => x.id === state.activeId)) {
    state.activeId = state.servers.some(x => x.id === payload.activeId) ? payload.activeId : (state.servers[0] && state.servers[0].id) || null;
  }
  // Don't replay the tutorial for someone who has already seen it on the old site.
  try {
    if (payload.tourSeen && Number(payload.tourSeen) > Number(localStorage.getItem(TOUR_KEY) || 0)) localStorage.setItem(TOUR_KEY, payload.tourSeen);
  } catch (_) { /* ignore */ }
  save();
  const parts = [];
  if (added) parts.push(`Moved ${added} ${added === 1 ? 'server' : 'servers'}`);
  if (already) parts.push(`${already} already here`);
  showToast('✓ ' + parts.join(', ') + '. Welcome to the new address!', false, 5000);
}