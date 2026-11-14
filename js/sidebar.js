// js/sidebar.js
// The plan summary beside the page (wide screens only): Auto-Optimize, Save to Cloud, and every guild
// with its final points, how far that is from its target, and its dorm and castle counts. It also holds the page's tabs and the
// Server Settings panel.
// It is drawn from the same numbers as the sections in the page (renderAll in render.js passes them in)
// and every button in it reuses an action that already exists: Auto-Optimize, Save to Cloud, Spotlight.

import { numDays } from './state.js';
import { esc } from './ui.js';
import { icon } from './icons.js';
import { gcolor } from './colors.js';
import { getMapList } from './maps/index.js';

export function renderSidebar(srv, ctx) {
  const { scores, targets, occ } = ctx;
  const days = numDays(srv);
  const isGoC = srv.mode === 'goc';
  const ptsOf = g => scores.cumul[g.id][days - 1] || 0;
  const targetOf = g => (targets[g.id] ? targets[g.id].grandPts : 0);

  const maxPts = Math.max(...srv.guilds.map(ptsOf), 1);

  const rows = srv.guilds
    .map(g => {
      const out = !isGoC && g.isExcluded;
      const pts = ptsOf(g);
      const diff = pts - targetOf(g);
      const o = occ[g.id];
      const cls = Math.abs(diff) <= 1 ? 'diff-ok' : Math.abs(diff) <= 3 ? 'diff-warn' : 'diff-bad';
      return `<button type="button" class="sb-guild${out ? ' is-out' : ''}" data-action="spotlight" data-id="${g.id}" aria-pressed="false" title="Spotlight ${esc(g.name)}${out ? ' (left out)' : ''}">
        <span class="sb-g-top">
          <span class="guild-dot" style="background:${gcolor(g.color)}"></span>
          <span class="sb-g-name">${esc(g.name)}</span>
        </span>
        <span class="sb-g-nums">
          <span class="sb-g-pts">${pts}</span>
          <span class="sb-g-occ" title="Dorm days ${o.lv2} · Castle days ${o.lv3} (all days)"><span class="sb-lv2"><b>D</b>${o.lv2}</span><span class="sb-lv3"><b>C</b>${o.lv3}</span></span>
          ${out ? '<span class="sb-g-out">out</span>' : `<span class="sb-g-diff ${cls}" title="Compared with the even target">${diff >= 0 ? '+' : ''}${diff}</span>`}
        </span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.round((pts / maxPts) * 100)}%;background:${gcolor(g.color)}"></span></span>
      </button>`;
    })
    .join('');

  const mapName = (getMapList(srv.mode).find(m => m.key === srv.mapKey) || {}).name || '';
  return `<div class="sb-block">
      <div class="sb-title">Server</div>
      <div class="sb-server">${esc(srv.name)}</div>
      <div class="sb-sub">${isGoC ? 'Game of Claws' : 'Ragnarok'}${mapName ? ' · ' + esc(mapName) : ''} · ${days} days · ${srv.guilds.length} guilds</div>
      ${
        srv.isViewOnly
          ? `<div class="sb-viewonly">
        <div class="sb-viewonly-title">${icon('eye')} View-Only Mode</div>
        You are viewing a shared plan. To make your own changes, you must copy it.
        <button type="button" class="btn-tool btn-primary" data-action="duplicate-plan">${icon('copy')}<span class="btn-label">Duplicate to Edit</span></button>
      </div>`
          : ''
      }
      <button type="button" class="btn-tool sb-settings" id="sb-settings-btn" data-action="open-setup">${icon('sliders-horizontal')}<span class="btn-label">${srv.isViewOnly ? 'Options &amp; Guilds' : 'Server &amp; Guild Setup'}</span></button>
      ${
        srv.isViewOnly
          ? ''
          : `<div class="sb-actions">
        <button type="button" class="btn-tool btn-primary" data-tour="optimize" data-action="optimize">${icon('zap')}<span class="btn-label">Auto-Optimize</span></button>
        ${srv.lastSolveTime ? `<div class="sb-solve">Last solve: ${srv.lastSolveTime}s</div>` : ''}
        <button type="button" class="btn-tool" data-tour="share" data-action="save-cloud">${icon('cloud-upload')}<span class="btn-label">Save to Cloud</span></button>
      </div>`
      }
    </div>
    <div class="sb-block">
      <div class="sb-title">Guilds</div>
      <div class="sb-guilds${isGoC ? '' : ' sb-guilds-rows'}${!isGoC && srv.guilds.length > 8 ? ' sb-guilds-many' : ''}">${rows}</div>
    </div>`;
}

// ── Tabs ──
// With the sidebar beside the page (wide screens), its sections are tabs (Grid, Map, Scores, Declares,
// Messages) and only one shows at a time; the stylesheet does the hiding from the "data-tab" attribute on
// <html>. Status sits above the Grid. Narrower screens keep one long page, and Screenshots always include
// everything.
export const TAB_OF_JUMP = {
  'capture-grid': 'grid',
  'sec-map': 'map',
  'capture-stats': 'scores',
  'sec-declares': 'declares',
  'sec-messages': 'messages',
};
const TAB_KEY = 'goc_tab';
const TAB_NAMES = Object.values(TAB_OF_JUMP);

export function currentTab() {
  const t = document.documentElement.dataset.tab;
  return TAB_NAMES.includes(t) ? t : 'grid';
}

// Mark the active tab in the bar (and drop a saved Map tab when this server has no map).
export function syncTabs() {
  if (!tabsActive()) return; // one long page: the bar follows the scrolling instead (render.js)
  const root = document.documentElement;
  if (currentTab() === 'map' && !document.getElementById('sec-map')) root.dataset.tab = 'grid';
  const cur = currentTab();
  document.querySelectorAll('.jump-link').forEach(l => {
    const on = TAB_OF_JUMP[l.dataset.jump] === cur;
    l.classList.toggle('active', on);
    if (on) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
  });
}

export function setTab(name, { remember = true, scroll = false } = {}) {
  if (!TAB_NAMES.includes(name)) return;
  const root = document.documentElement;
  const changed = currentTab() !== name || root.dataset.tab !== name;
  if (changed) document.dispatchEvent(new CustomEvent('goc:tab', { detail: { phase: 'before' } }));
  root.dataset.tab = name;
  if (remember) {
    try {
      localStorage.setItem(TAB_KEY, name);
    } catch (_) {
      /* not saved: the tab still switches */
    }
  }
  syncTabs();
  if (changed) document.dispatchEvent(new CustomEvent('goc:tab', { detail: { phase: 'after' } }));
  if (scroll) window.scrollTo({ top: 0 });
}

// Which tab does an element belong to? (null if it is outside the tabs, e.g. the header)
function tabOf(el) {
  if (!el || !el.closest) return null;
  if (el.closest('#sec-status')) return 'grid';
  if (el.closest('#capture-grid')) return 'grid';
  if (el.closest('#sec-map')) return 'map';
  if (el.closest('#sec-messages')) return 'messages';
  if (el.closest('#sec-declares')) return 'declares';
  if (el.closest('#capture-stats')) return el.closest('#sec-declares') ? 'declares' : 'scores';
  return null;
}

// Is the element on one of the tabs (so that it shows when its tab opens)?
export function isOnTab(el) {
  return tabsActive() && !!tabOf(el);
}

// Show the tab an element is on. Does nothing on narrower screens, where the whole page shows.
export function showTabFor(el, opts) {
  if (!tabsActive()) return;
  const t = tabOf(el);
  if (t && (t !== currentTab() || document.documentElement.dataset.tab !== t)) setTab(t, opts);
}

export function initTabs() {
  let t = null;
  try {
    t = localStorage.getItem(TAB_KEY); // (an old 'guilds' is not a tab any more: the Grid opens)
  } catch (_) {
    /* no saved tab */
  }
  document.documentElement.dataset.tab = TAB_NAMES.includes(t) ? t : 'grid';
}

// ── The Server Settings panel ──
// With the sidebar showing, the Server Settings section (name, mode, map, dates, Plan / Files / Share
// buttons) leaves the page and slides in from the right instead (css/sidebar.css). It is the same
// section, so every field and button works as it always did. The "setup-open" class on <html> is all
// there is to its state, so it stays open while the page redraws after an edit.
export function setupIsPanel() {
  const sb = document.getElementById('sidebar');
  return !!sb && getComputedStyle(sb).display !== 'none';
}

// Are the sections tabs? Only beside the page, on a wide screen. Narrower ones (phones, tablets) keep one
// long page, in the same order, with the summary above it; the bar of links jumps down the page.
export function tabsActive() {
  return setupIsPanel() && window.matchMedia('(min-width: 1360px)').matches;
}

export function openSetup({ focus = true } = {}) {
  document.documentElement.classList.add('setup-open');
  if (focus) {
    const btn = document.querySelector('.setup-panel .setup-close');
    if (btn) btn.focus({ preventScroll: true });
  }
}

export function closePanels({ focus = true } = {}) {
  if (!document.documentElement.classList.contains('setup-open')) return;
  document.documentElement.classList.remove('setup-open');
  if (focus) {
    const btn = document.getElementById('sb-settings-btn');
    if (btn && btn.offsetParent !== null) btn.focus({ preventScroll: true });
  }
}

// The tutorial calls this for each step: show the panel and/or tab the highlighted element is in.
export function showPanelFor(el) {
  if (el && el.closest('.setup-panel')) openSetup({ focus: false });
  else {
    closePanels({ focus: false });
    showTabFor(el, { remember: false });
  }
}

// Escape closes it (unless a dialog, pop-up or the tutorial is open on top).
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !document.documentElement.classList.contains('setup-open')) return;
  if (document.querySelector('.modal-bg.open, .modal-tpl, .color-pop, .tour-card, #tab-ctx.open')) return;
  closePanels();
});

// ── Resizing the sidebar ──
// Drag the thin handle on its right edge (or focus it and press the Left and Right arrow keys; Home and
// End jump to the smallest and largest; double-click or Enter resets it). The width is kept in this
// browser, and the stylesheet never lets the page itself get narrower than about 1000 pixels.
const WIDTH_KEY = 'goc_sidebar_w';
const WIDTH_DEFAULT = 300;
const WIDTH_MIN = 272; // narrower and the Auto-Optimize / Save to Cloud buttons and guild tiles would stack
const WIDTH_MAX = 520;

const clampWidth = w => Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(w)));

function setWidth(w, remember = true) {
  w = clampWidth(w);
  document.documentElement.style.setProperty('--sb-w', w + 'px');
  const handle = document.getElementById('sb-resizer');
  if (handle) handle.setAttribute('aria-valuenow', String(w));
  if (!remember) return;
  try {
    if (w === WIDTH_DEFAULT) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(w));
  } catch (_) {
    /* not saved: it still resizes for now */
  }
}

function currentWidth() {
  const sb = document.getElementById('sidebar');
  return sb ? sb.getBoundingClientRect().width : WIDTH_DEFAULT;
}

export function initSidebarResize() {
  const handle = document.getElementById('sb-resizer');
  if (!handle) return;
  handle.setAttribute('aria-valuemin', String(WIDTH_MIN));
  handle.setAttribute('aria-valuemax', String(WIDTH_MAX));
  let saved = NaN;
  try {
    saved = parseInt(localStorage.getItem(WIDTH_KEY), 10);
  } catch (_) {
    /* no saved width */
  }
  setWidth(Number.isFinite(saved) ? saved : WIDTH_DEFAULT, false);

  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = currentWidth();
    handle.setPointerCapture(e.pointerId);
    document.documentElement.classList.add('sb-resizing');
    const move = ev => setWidth(startW + ev.clientX - startX);
    const stop = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      document.documentElement.classList.remove('sb-resizing');
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  });

  handle.addEventListener('dblclick', () => setWidth(WIDTH_DEFAULT));
  handle.addEventListener('keydown', e => {
    const step = e.shiftKey ? 48 : 16;
    if (e.key === 'ArrowLeft') setWidth(currentWidth() - step);
    else if (e.key === 'ArrowRight') setWidth(currentWidth() + step);
    else if (e.key === 'Home') setWidth(WIDTH_MIN);
    else if (e.key === 'End') setWidth(WIDTH_MAX);
    else if (e.key === 'Enter') setWidth(WIDTH_DEFAULT);
    else return;
    e.preventDefault();
  });
}
