// js/render.js
// Builds the page: server tabs, settings, guilds, status, planning grid, stats and daily messages.

import { state, activeSrv, numDays, save, numDisplayDays, GUILD_COLORS } from './state.js';
import { esc, dateLabel, dateLabelShort, todayDay } from './ui.js';
import {
  calcScores,
  calcOcc,
  validateAdj,
  validateWipes,
  validateStarts,
  isMidEvent,
  calcDec,
  kPts,
  getEligibleGuilds,
} from './calc.js';
import { openTabCtx, openAdd } from './servers.js';
import { renderFillSel } from './grid-fill.js';
import { applyCollapse, expandSection } from './collapse.js';
import { getMapData, getMapList } from './maps/index.js';
import { buildMessages } from './messages.js';
import { icon } from './icons.js';
import { canUndo, canRedo, undoLabel, redoLabel } from './history.js';
import { applySpotlight } from './spotlight.js';
import { renderMapView, hasMapView } from './map-view.js';
// Each mode's targets come from that mode's own model: Game of Claws has rules Ragnarok does not
// (Darkwick needs a dorm or two lv1 towns behind it), so the GoC model is the only one that knows
// which towns are really winnable. Reading GoC targets out of the Ragnarok model overstated them.
import { getPerfectTargets as getGocTargets } from './solver/model_goc.js';
import { getPerfectTargets as getRagnarokTargets } from './solver/model_ragnarok.js';

export function renderTabs() {
  const bar = document.getElementById('tabs-bar');
  bar.innerHTML = '';
  for (const s of state.servers) {
    const b = document.createElement('button');
    b.className = 'tab-btn' + (s.id === state.activeId ? ' active' : '');
    b.dataset.srvId = s.id;
    b.innerHTML = `<span class="tab-label" data-action="switch-server" data-id="${s.id}">${esc(s.name)}</span><span class="tab-close" data-action="remove-server" data-id="${s.id}" title="Delete server">${icon('x')}</span>`;

    // Desktop Right-Click
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      openTabCtx(e, s.id);
    });

    // Mobile Long-Press (500ms)
    let pressTimer,
      longPressed = false;
    b.addEventListener(
      'touchstart',
      e => {
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          openTabCtx(e, s.id);
        }, 500);
      },
      { passive: true },
    );
    b.addEventListener(
      'touchend',
      e => {
        clearTimeout(pressTimer);
        // If the long-press opened the menu, swallow the click that follows the lift,
        // otherwise the document click-handler closes the menu instantly.
        if (longPressed && e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
    b.addEventListener('touchmove', () => clearTimeout(pressTimer));
    b.addEventListener('touchcancel', () => clearTimeout(pressTimer));

    bar.appendChild(b);
  }
  const a = document.createElement('button');
  a.className = 'add-tab-btn';
  a.textContent = '+ Add Server';
  a.onclick = openAdd;
  bar.appendChild(a);
}

// ── Today: on opening a server during its event, scroll the grid so today's column is in view ──
const scrolledToToday = new Set();
function scrollToToday(mc, srv) {
  if (scrolledToToday.has(srv.id)) return; // only once per server, so it doesn't fight your own scrolling
  const th = mc.querySelector('table.ptbl thead th.is-today');
  if (!th) return;
  scrolledToToday.add(srv.id);
  const wrap = th.closest('.tbl-wrap');
  const town = mc.querySelector('table.ptbl thead th.kname');
  // Sit just right of the Town column, which stays put while scrolling sideways.
  wrap.scrollLeft = Math.max(0, th.offsetLeft - (town ? town.offsetWidth : 0) - 8);
}

// ── Jump bar: quick links to each part of the page ──
const JUMPS = [
  ['sec-settings', 'Setup'],
  ['sec-guilds', 'Guilds'],
  ['capture-grid', 'Grid'],
  ['sec-map', 'Map'],
  ['capture-stats', 'Scores'],
  ['sec-declares', 'Declares'],
  ['sec-messages', 'Messages'],
];
function renderJumpBar(srv) {
  // The links scroll inside .jump-links, so on narrow screens only they fade at the edge, not the bar's border.
  return `<nav class="jump-bar" aria-label="Jump to section"><div class="jump-links">
    ${JUMPS.filter(([id]) => id !== 'sec-map' || hasMapView(srv))
      .map(([id, label]) => `<a href="#${id}" class="jump-link" data-jump="${id}">${label}</a>`)
      .join('')}
  </div></nav>`;
}
let jumpObserver = null;
function wireJumpBar(mc) {
  const bar = mc.querySelector('.jump-bar');
  if (!bar) return;
  bar.addEventListener('click', e => {
    const a = e.target.closest('[data-jump]');
    if (!a) return;
    e.preventDefault(); // scroll without putting #section in the address bar
    const el = document.getElementById(a.dataset.jump);
    expandSection(el);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Highlight the section currently at the top of the screen.
  if (jumpObserver) jumpObserver.disconnect();
  if (typeof IntersectionObserver === 'undefined') return;
  const visible = new Map();
  jumpObserver = new IntersectionObserver(
    entries => {
      entries.forEach(en => visible.set(en.target.id, en.isIntersecting));
      // Sections can nest (Declares is inside the Scores block), so the last one in page order wins.
      const current = JUMPS.map(([id]) => id)
        .filter(id => visible.get(id))
        .pop();
      bar.querySelectorAll('.jump-link').forEach(l => l.classList.toggle('active', l.dataset.jump === current));
    },
    { rootMargin: '-56px 0px -60% 0px' },
  );
  JUMPS.forEach(([id]) => {
    const el = document.getElementById(id);
    if (el) jumpObserver.observe(el);
  });
}

// ── No servers yet: a welcome panel with a little picture of a plan ──
// The picture is a few rows of a planning grid, drawn with the guild colors (no image file).
const WELCOME_ART = [
  [0, 0, 1, 1, 2, 2, 0],
  [3, 3, 3, 0, 0, 4, 4],
  [1, 2, 2, 2, 3, 3, 1],
  [4, 4, 0, 1, 1, 0, 2],
  [2, 1, 4, 4, 2, 1, 3],
];
function renderWelcome() {
  const art = WELCOME_ART.map(
    row =>
      `<div class="wa-row"><span class="wa-town"></span>${row
        .map((g, d) => `<span class="wa-cell${d === 4 ? ' wa-today' : ''}" style="--c:${GUILD_COLORS[g]}"></span>`)
        .join('')}</div>`,
  ).join('');
  return `<div class="empty-state welcome">
    <div class="welcome-art" aria-hidden="true">
      <div class="wa-row wa-head"><span class="wa-town"></span>${Array.from(
        { length: 7 },
        (_, d) => `<span class="wa-day${d === 4 ? ' wa-today' : ''}"></span>`,
      ).join('')}</div>
      ${art}
    </div>
    <h2 class="welcome-title">Plan your next Game of Claws or Ragnarok</h2>
    <p class="welcome-sub">Work out who holds which town on which day, keep every move legal, and share the points out evenly.</p>
    <ol class="welcome-steps">
      <li><span class="ws-num">1</span><span><b>Add a server</b>Pick the mode, map and event dates.</span></li>
      <li><span class="ws-num">2</span><span><b>Add your guilds</b>Type their names, or paste the whole list.</span></li>
      <li><span class="ws-num">3</span><span><b>Plan the grid</b>Fill it in yourself or let Auto-Optimize do it, then copy each day's message for Discord.</span></li>
    </ol>
    <div class="welcome-actions">
      <button type="button" class="btn-accent" data-action="open-add">${icon('plus')} Add Server</button>
      <button type="button" class="btn" data-action="tutorial">${icon('graduation-cap')} Take the tour</button>
    </div>
  </div>`;
}

export function renderAll() {
  const srv = activeSrv();
  const mc = document.getElementById('main-content');
  if (!srv) {
    mc.innerHTML = renderWelcome();
    return;
  }
  const days = numDays(srv);
  const mapData = getMapData(srv.mode, srv.mapKey);
  const scores = calcScores(srv);
  const occ = calcOcc(srv);
  const issues = validateAdj(srv);
  const wipes = validateWipes(srv);
  const { dec, give } = calcDec(srv);
  const totalPts = mapData.kingdoms.reduce((s, k) => s + kPts(k.type), 0) * days;
  const totalBase = srv.guilds.reduce((s, g) => s + (parseInt(g.basePoints || 0, 10) || 0), 0);
  const targets = (srv.mode === 'goc' ? getGocTargets : getRagnarokTargets)(srv, mapData);

  // Remember scroll positions so editing a cell doesn't snap the grid back to the left
  const scrollSel = '.tbl-wrap, .guild-list';
  const hScroll = [...mc.querySelectorAll(scrollSel)].map(w => w.scrollLeft);
  const pageY = window.scrollY;

  mc.innerHTML = `
    ${renderJumpBar(srv)}
    ${renderSettings(srv)}
    ${renderGuilds(srv)}
    ${renderStatus(srv, issues, wipes, validateStarts(srv))}
    
    <!-- WRAPPER 1: The Grid -->
    <div class="capture-wrap" id="capture-grid">
      ${renderGrid(srv, days, mapData, issues, wipes)}
    </div>

    ${renderMapView(srv, mapData, days)}

    <!-- WRAPPER 2: The Stats -->
    <div class="capture-wrap capture-wrap-stats" id="capture-stats" data-tour="stats">
      ${renderScores(srv, scores, targets)}
      ${renderOcc(srv, occ)}
      ${renderDecTable(srv, days, dec, give)}
    </div>
    
    ${renderMsgs(srv)}
  `;
  mc.querySelectorAll(scrollSel).forEach((w, i) => {
    w.scrollLeft = hScroll[i] || 0;
  });
  applyCollapse(mc);
  window.scrollTo(0, pageY);
  wireJumpBar(mc);
  applySpotlight(mc);
  scrollToToday(mc, srv);

  // Dynamically set pts-row sticky offset to match the actual first header row height
  requestAnimationFrame(() => {
    const firstTh = document.querySelector('table.ptbl thead tr:first-child th');
    const ptsRow = document.querySelector('table.ptbl tr.pts-row');
    if (firstTh && ptsRow) {
      const h = firstTh.getBoundingClientRect().height;
      ptsRow.querySelectorAll('th').forEach(th => (th.style.top = h + 'px'));
    }
  });

  // Drag and drop to reorder guilds
  const guildListEl = document.getElementById('guild-list');
  if (guildListEl && !srv.isViewOnly && typeof Sortable !== 'undefined') {
    new Sortable(guildListEl, {
      handle: '.drag-handle', // Prevents accidental dragging when typing in inputs
      draggable: '.guild-row[data-id]', // the column header row stays put
      animation: 150,
      onEnd: function () {
        // Read the new DOM order via the data-id tags
        const newOrder = Array.from(guildListEl.querySelectorAll('.guild-row[data-id]')).map(row => row.dataset.id);
        // Rebuild the master guild array to match the new visual order
        srv.guilds = newOrder.map(id => srv.guilds.find(g => g.id === id));
        save();
        renderAll();
      },
    });
  }

  renderFillSel();
}

// A toolbar button: icon + words. Status messages ("Saving...") replace only the words.
function tbBtn(iconName, label, attrs = '', cls = '') {
  return `<button type="button" class="btn-tool${cls ? ' ' + cls : ''}" ${attrs}>${icon(iconName)}<span class="btn-label">${label}</span></button>`;
}

function renderSettings(srv) {
  const maps = getMapList(srv.mode);
  const days = numDays(srv);

  // Shared plans opened from a link are view-only
  if (srv.isViewOnly) {
    return `<div class="section view-only" id="sec-settings">
      <div class="sec-title view-only-title">${icon('eye')} View-Only Mode</div>
      <div class="view-only-msg">
        You are viewing a shared plan: <strong>${esc(srv.name)}</strong>. To make your own changes, you must copy it.
      </div>
      <div class="toolbar">
        <div class="tb-group">
          ${tbBtn('copy', 'Duplicate to Edit', 'data-action="duplicate-plan"', 'btn-primary')}
        </div>
        <div class="tb-group">
          ${tbBtn('refresh-cw', 'Pull Latest Updates', 'id="btn-sync-cloud" data-action="sync-cloud"')}
          ${tbBtn('camera', 'Screenshots', 'data-action="screenshots"')}
          ${tbBtn('download', 'Export Data', 'data-action="export-server"')}
        </div>
      </div>
      <div class="settings-meta">
        ${days} days planned · ${getMapData(srv.mode, srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
      </div>
    </div>`;
  }

  // STANDARD EDIT DASHBOARD
  return `<div class="section" id="sec-settings" data-sec="settings" data-tour="settings">
    <div class="sec-title">Server Settings</div>
    <div class="row">
      <div class="fg"><label>Server Name</label>
        <input class="settings-input" type="text" value="${esc(srv.name)}" data-change="server-name"></div>
      <div class="fg"><label>Mode</label>
        <select data-change="server-mode">
          <option value="ragnarok"${srv.mode === 'ragnarok' ? ' selected' : ''}>Ragnarok</option>
          <option value="goc"${srv.mode === 'goc' ? ' selected' : ''}>Game of Claws</option>
        </select></div>
      <div class="fg"><label>Map</label>
        <select data-change="server-map">
          ${maps.map(m => `<option value="${m.key}"${srv.mapKey === m.key ? ' selected' : ''}>${m.name}</option>`).join('')}
        </select></div>
      <div class="fg"><label>Start Date</label>
        <input class="settings-input" type="date" value="${srv.startDate || ''}" data-change="server-start"></div>
      <div class="fg"><label>End Date</label>
        <input class="settings-input" type="date" value="${srv.endDate || ''}" data-change="server-end"></div>
    </div>
    <div class="toolbar">
      <div class="tb-group">
        ${tbBtn('zap', 'Auto-Optimize', 'id="opt-btn" data-tour="optimize" data-action="optimize"', 'btn-primary')}
        ${srv.lastSolveTime ? `<span class="solve-badge">Last solve: ${srv.lastSolveTime}s</span>` : ''}
      </div>
      <div class="tb-group">
        ${tbBtn('upload', 'Import', 'data-action="open-import" data-tour="import"')}
        ${tbBtn('download', 'Export Server', 'data-action="export-server"')}
        ${tbBtn('camera', 'Screenshots', 'data-action="screenshots"')}
        ${tbBtn('history', 'History', 'data-action="versions" title="Saved versions of this server"')}
      </div>
      <div class="tb-group">
        ${tbBtn('cloud-upload', 'Save to Cloud', 'id="btn-share-cloud" data-tour="share" data-action="save-cloud"')}
        ${tbBtn('refresh-cw', 'Sync from Cloud', 'id="btn-sync-cloud" data-action="sync-cloud"')}
        ${todayDay(srv, days) ? tbBtn('copy', "Copy Today's Message", 'id="btn-copy-today" data-action="copy-today"') : ''}
      </div>
      <div class="tb-group tb-end">
        ${tbBtn('trash-2', 'Clear Plan', 'data-action="clear-plan"', 'btn-danger-outline')}
      </div>
    </div>
    <div class="settings-meta">
      ${days} days planned · ${getMapData(srv.mode, srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
    </div>
  </div>`;
}

function renderGuilds(srv) {
  // Guilds are shown in the order they were dragged into (the order decides tie-breaks)
  const dAttr = srv.isViewOnly ? 'disabled' : '';
  // Points / Castle / Dorms / Towns are only for plans started partway through an event, so they stay
  // hidden until "Planning mid-event" is turned on. Numbers already in them always show, and the switch
  // can't be turned off until they are all back to 0, so nothing counted is ever out of sight.
  const midLocked = isMidEvent(srv);
  const showMid = !!srv.showMidEvent || midLocked;

  return `<div class="section" id="sec-guilds" data-sec="guilds" data-tour="guilds">
    <div class="sec-title">Guilds</div>
    <div class="guild-list${showMid ? '' : ' hide-mid'}" id="guild-list" style="--rows:${Math.ceil(srv.guilds.length / 2)}">
      ${
        showMid
          ? `<div class="guild-row guild-row-head" aria-hidden="true">
        <span></span><span></span>
        <span class="gh-name">Guild</span>
        <span></span><span></span>
        <span class="gh-num" title="Points the guild already has">Points</span>
        <span class="gh-num" title="Days already held before this plan starts (for events already under way)">Castle</span>
        <span class="gh-num" title="Days already held before this plan starts (for events already under way)">Dorms</span>
        <span class="gh-num" title="Days already held before this plan starts (for events already under way)">Towns</span>
        <span></span>
      </div>`
          : ''
      }
      ${srv.guilds
        .map(
          (g, i) => `
        <div class="guild-row" data-id="${g.id}">
          ${!srv.isViewOnly ? `<div class="drag-handle" title="Drag to reorder">${icon('grip-vertical')}</div>` : '<span></span>'}
          ${showMid ? '' : `<span class="guild-rank" title="Order in the list">${i + 1}</span>`}
          <button type="button" class="guild-color" style="--guild-color:${g.color}" data-action="guild-color" data-id="${g.id}"
            title="${srv.isViewOnly ? '' : 'Change color'}" aria-label="${esc(g.name)}: change color" ${dAttr}></button>

          <input class="guild-name-inp" data-guild-id="${g.id}" data-guild-field="name" value="${esc(g.name)}" placeholder="Guild name" aria-label="Guild name"
            data-input="guild-name" ${dAttr}>

          ${
            srv.mode === 'ragnarok'
              ? '<span></span>'
              : `
            <label class="guild-flag" title="Check this if this is a smaller guild (1 declare a day).">
              <input type="checkbox" id="sm_${g.id}" class="guild-small-check" ${g.isSmall ? 'checked' : ''}
                data-change="guild-small" data-id="${g.id}" ${dAttr}>
              <span>Small guild</span>
            </label>
          `
          }
          <label class="guild-flag"
            title="Leave this guild out of the rest of the plan. It keeps the towns it is holding now, nobody can take them, it declares nothing more, and the points still to win are shared out between the other guilds. Days you have already played are untouched.">
            <input type="checkbox" id="exc_${g.id}" class="guild-small-check" ${g.isExcluded ? 'checked' : ''}
              data-change="guild-excluded" data-id="${g.id}" ${dAttr}>
            <span>Exclude guild</span>
          </label>

          ${
            showMid
              ? `
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="points" value="${esc(g.basePoints || 0)}"
            data-change="guild-points" title="Current points" aria-label="${esc(g.name)}: current points" ${dAttr}>
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv3" value="${esc(g.baseLv3 || 0)}"
            data-change="guild-lv3" title="Castle days already held" aria-label="${esc(g.name)}: castle days already held" ${dAttr}>
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv2" value="${esc(g.baseLv2 || 0)}"
            data-change="guild-lv2" title="Dorm days already held" aria-label="${esc(g.name)}: dorm days already held" ${dAttr}>
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv1" value="${esc(g.baseLv1 || 0)}"
            data-change="guild-lv1" title="Town days already held" aria-label="${esc(g.name)}: town days already held" ${dAttr}>
          `
              : ''
          }

          ${!srv.isViewOnly && srv.guilds.length > 2 ? `<button type="button" class="guild-remove" data-action="remove-guild" data-id="${g.id}" title="Remove guild" aria-label="Remove ${esc(g.name)}">${icon('x')}</button>` : '<span></span>'}
        </div>`,
        )
        .join('')}
    </div>
    ${
      !srv.isViewOnly
        ? `
    <div class="guild-actions">
      <button type="button" class="btn-tool" data-action="add-guild">${icon('plus')}<span class="btn-label">Add Guild</span></button>
      <label class="guild-flag mid-toggle" title="${
        midLocked
          ? 'Some guilds have points or days held entered. Set them all back to 0 to hide these boxes.'
          : "Starting a plan partway through an event? Turn this on to enter each guild's current points and the days it has already held the castle, dorms and towns."
      }">
        <input type="checkbox" class="guild-small-check" data-change="mid-event-toggle" ${showMid ? 'checked' : ''} ${midLocked ? 'disabled' : ''}>
        <span>Planning mid-event</span>
      </label>
    </div>`
        : ''
    }
  </div>`;
}

function renderScores(srv, scores, targets) {
  const days = numDays(srv);

  // Calculate the target range for the header (e.g., "47-48")
  const isGoC = srv.mode === 'goc';
  const active = srv.guilds.filter(g => isGoC || !g.isExcluded);
  const targetVals = active.map(g => (targets[g.id] ? targets[g.id].grandPts : 0));

  let targetHeader = 0;
  if (targetVals.length > 0) {
    const minT = Math.min(...targetVals);
    const maxT = Math.max(...targetVals);
    targetHeader = minT === maxT ? minT : `${minT}-${maxT}`;
  }

  // Pull the actual points from your cumulative score tracker
  const final = srv.guilds.map(g => ({ g, pts: scores.cumul[g.id][days - 1] || 0 }));
  final.sort((a, b) => b.pts - a.pts);

  const maxPts = Math.max(...final.map(x => x.pts), 1);

  return `<div class="section" data-sec="scores">
    <div class="sec-title">Final Scores <span class="sec-note"> Even target: ${targetHeader} pts</span></div>
    <div class="score-grid">
      ${final
        .map(({ g, pts }) => {
          // Extract the mathematically perfect target for this specific guild
          const t = targets[g.id] ? targets[g.id].grandPts : 0;
          const diff = pts - t;

          const cls = Math.abs(diff) <= 1 ? 'diff-ok' : Math.abs(diff) <= 3 ? 'diff-warn' : 'diff-bad';
          const pct = Math.round((pts / maxPts) * 100);

          return `<div class="score-card" data-g="${g.id}" data-action="spotlight" data-id="${g.id}" title="Spotlight ${esc(g.name)}">
          <div class="sc-label"><div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}</div>
          <div class="sc-val" style="color:${g.color}">${pts}</div>
          <div class="sc-sub">target: ${t}</div>
          <div class="sc-diff ${cls}">${diff >= 0 ? '+' : ''}${diff}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${g.color}"></div></div>
        </div>`;
        })
        .join('')}
    </div>
  </div>`;
}

function renderStatus(srv, issues, wipes, starts) {
  const days = numDays(srv);
  const baseMaxDecl = srv.mode === 'goc' ? 2 : 3;
  const byDay = Array.from({ length: days }, (_, i) => issues.filter(x => x.day === i + 1));
  const decViol = [];
  const { dec } = calcDec(srv);

  for (const g of srv.guilds) {
    const maxDecl = g.isSmall ? 1 : baseMaxDecl;
    for (let d = 0; d < days; d++) {
      if (dec[g.id][d].length > maxDecl) decViol.push({ g, d, c: dec[g.id][d].length });
    }
  }

  // Every problem is a button that jumps to it (status-jump.js).
  const jump = (kind, attrs, inner, cls = '') =>
    `<button type="button" class="${cls}" data-action="status-jump" data-kind="${kind}" ${attrs}>${inner}</button>`;
  const issueItems = [
    ...starts.map(s => {
      const g = srv.guilds.find(x => x.id === s.guild);
      if (s.kingdom)
        return jump(
          'cell',
          `data-day="0" data-k="${esc(s.kingdom)}" title="Show this town in the grid"`,
          `Day 0: ${g ? esc(g.name) : '?'} on ${esc(s.kingdom)} (only towns at the start)`,
          'status-item',
        );
      return jump(
        'starts',
        `data-g="${esc(s.guild)}" title="Show Day 0 in the grid"`,
        `Day 0: ${g ? esc(g.name) : '?'} has ${s.count} of ${s.want} starting towns`,
        'status-item',
      );
    }),
    ...issues.map(i => {
      const g = srv.guilds.find(x => x.id === i.guild);
      return jump(
        'cell',
        `data-day="${i.day}" data-k="${esc(i.kingdom)}" title="Show this town in the grid"`,
        `Day ${i.day}: ${g ? esc(g.name) : '?'} → ${esc(i.kingdom)}`,
        'status-item',
      );
    }),
    ...wipes.map(w => {
      const g = srv.guilds.find(x => x.id === w.guild);
      return jump(
        'wipe',
        `data-day="${w.day}" data-g="${esc(w.guild)}" title="Show this day in the grid"`,
        `Day ${w.day}: ${g ? esc(g.name) : '?'} Wiped`,
        'status-item',
      );
    }),
  ];
  const pill = (ok, label, kind, attrs, title) => {
    const inner = `<span class="pdot" style="background:${ok ? 'var(--green)' : 'var(--red)'}"></span>${label}`;
    return ok
      ? `<div class="pill pill-ok">${inner}</div>`
      : jump(kind, `${attrs} title="${title}"`, inner, 'pill pill-fail pill-jump');
  };

  return `<div class="section" data-sec="status" data-tour="status">
    <div class="sec-title">Status</div>
    <div class="pills">
      ${byDay
        .map((list, i) =>
          pill(
            list.length === 0,
            `D${i + 1}${list.length ? ` (${list.length})` : ''}`,
            'day',
            `data-day="${i + 1}"`,
            'Show the problems on this day in the grid',
          ),
        )
        .join('')}
      ${pill(
        !starts.length,
        starts.length ? `Starting Towns (${starts.length})` : 'Starting Towns',
        starts.length && starts[0].kingdom ? 'cell' : 'starts',
        starts.length
          ? starts[0].kingdom
            ? `data-day="0" data-k="${esc(starts[0].kingdom)}"`
            : `data-g="${esc(starts[0].guild)}"`
          : '',
        'Show Day 0 in the grid',
      )}
      ${pill(!decViol.length, 'Valid Declares', 'declares', '', 'Show the guilds declaring too many towns')}
      ${pill(
        !wipes.length,
        wipes.length ? `No Map Wipes (${wipes.length})` : 'No Map Wipes',
        'wipe',
        wipes.length ? `data-day="${wipes[0].day}" data-g="${esc(wipes[0].guild)}"` : '',
        'Show the first wipe in the grid',
      )}
    </div>
    ${issueItems.length ? `<div class="status-issues">${issueItems.join('<span class="status-sep"> · </span>')}</div>` : ''}
  </div>`;
}

function renderGrid(srv, days, mapData, issues, wipes) {
  const midEvent = isMidEvent(srv);
  const today = todayDay(srv, days);
  const totalCols = numDisplayDays(srv);
  const issSet = new Set(issues.map(i => `${i.day}_${i.kingdom}`));
  validateStarts(srv).forEach(s => s.kingdom && issSet.add(`0_${s.kingdom}`));
  const lv3 = mapData.kingdoms.filter(k => k.type === 'lv3');
  const lv2 = mapData.kingdoms.filter(k => k.type === 'lv2');
  const lv1 = mapData.kingdoms.filter(k => k.type === 'lv1');
  const ordered = [...lv3, ...lv2, ...lv1];
  const scores = calcScores(srv);
  const occ = calcOcc(srv);

  const dAttr = srv.isViewOnly ? 'disabled' : '';
  // Spotlight chips: each carries the summary line shown when it is picked
  const spotChips = srv.guilds
    .map(g => {
      const o = occ[g.id] || { lv1: 0, lv2: 0, lv3: 0 };
      const pts = (scores.cumul[g.id] || [])[days - 1] || 0;
      const summary = `${g.name}: ${pts} points · castle ${o.lv3} · dorms ${o.lv2} · towns ${o.lv1} days`;
      return `<button type="button" class="spot-chip" data-action="spotlight" data-id="${g.id}" style="--guild-color:${g.color}"
        aria-pressed="false" data-summary="${esc(summary)}"><span class="spot-dot"></span>${esc(g.name)}</button>`;
    })
    .join('');

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const key = isMac ? '⌘' : 'Ctrl+';
  const histBtn = (action, iconName, word, able, label, shortcut) =>
    `<button type="button" class="btn-tool btn-tool-sm" data-action="${action}" ${able ? '' : 'disabled'}
      title="${able ? esc(`${word}: ${label}`) : `Nothing to ${word.toLowerCase()}`} (${shortcut})">${icon(iconName)}<span class="btn-label">${word}</span></button>`;
  return `<div class="section" data-sec="grid" data-tour="grid">
    <div class="sec-title sec-title-row">
      <div>Planning Grid</div>
      ${
        srv.isViewOnly
          ? ''
          : `<div class="hist-btns">
        ${histBtn('undo', 'undo-2', 'Undo', canUndo(srv), undoLabel(srv), key + 'Z')}
        ${histBtn('redo', 'redo-2', 'Redo', canRedo(srv), redoLabel(srv), isMac ? '⌘⇧Z' : 'Ctrl+Y')}
      </div>`
      }
    </div>
    <div class="spot-bar" role="group" aria-label="Spotlight a guild">
      <span class="spot-label">Spotlight</span>${spotChips}
    </div>
    <p class="spot-summary" aria-live="polite" hidden></p>
    <div class="tbl-wrap">
    <table class="ptbl">
      <thead>
        <tr>
          <th class="kadj">Adjacent Towns</th>
          <th class="kname">Town</th>
          <th class="ktype">Type</th>
          ${Array.from(
            { length: totalCols },
            (_, d) => `<th${d === today ? ' class="is-today"' : ''}>
            ${d === today ? '<div class="today-tag">Today</div>' : ''}${dateLabel(srv, d)}
            ${srv.isViewOnly ? '' : `<div class="clear-day-wrap"><button class="clear-day-btn" data-action="clear-day" data-day="${d}">Clear</button></div>`}
          </th>`,
          ).join('')}
        </tr>
        <tr class="pts-row">
          <th class="kadj pts-blank"></th>
          <th class="kname pts-label">Running pts →</th>
          <th class="ktype pts-blank"></th>
          ${Array.from({ length: totalCols }, (_, d) => {
            return `<th class="pts-cell${d === today ? ' is-today' : ''}">
              ${srv.guilds
                .map(g => {
                  let pts = 0;
                  if (d === 0) {
                    pts = parseInt(g.basePoints || 0, 10);
                  } else if (scores.cumul[g.id]) {
                    pts = scores.cumul[g.id][d - 1] || 0;
                  }
                  return `<div class="pts-line" style="color:${g.color}">${esc(g.name)}:&nbsp;${pts}</div>`;
                })
                .join('')}
            </th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        ${ordered
          .map(k => {
            const nameColor = k.type === 'lv3' ? 'var(--lv3)' : k.type === 'lv2' ? 'var(--lv2)' : 'var(--lv1)';
            return `<tr>
            <td class="kadj">${esc(k.adj.join(', ') || '—')}</td>
            <td class="kname" style="color:${nameColor}">${esc(k.id)}</td>
            <td class="ktype"><span class="badge badge-${k.type}">${k.type.toUpperCase()}</span></td>
            ${Array.from({ length: totalCols }, (_, d) => {
              // At the start of an event, guilds only hold plain towns on Day 0.
              const day0 = (srv.plan[0] || {})[k.id];
              const eligible =
                d > 0
                  ? getEligibleGuilds(srv, k.id, d)
                  : k.type === 'lv1' || midEvent
                    ? srv.guilds
                    : srv.guilds.filter(g => g.id === day0);
              const gOpts = [['', '—'], ...eligible.map(g => [g.id, g.name])];
              const gid = (srv.plan[d] || {})[k.id] || '';
              const g = srv.guilds.find(x => x.id === gid);
              const err = issSet.has(`${d}_${k.id}`);

              const cls = [err ? 'cell-err' : '', d === today ? 'is-today' : ''].filter(Boolean).join(' ');
              return `<td data-k="${k.id}" data-d="${d}" data-g="${gid}" style="background:${g ? g.color + '18' : ''}; position:relative;" ${cls ? `class="${cls}"` : ''}>
                <span class="cname" aria-hidden="true"${g ? ` style="color:${g.color}"` : ''}>${g ? esc(g.name) : '—'}</span>
                <select class="csel" data-k="${k.id}" data-d="${d}" aria-label="${esc(k.id)}, day ${d}" data-change="cell" ${dAttr}>
                  ${gOpts.map(([v, n]) => `<option value="${v}" ${v === gid ? 'selected' : ''}>${esc(n)}</option>`).join('')}
                </select>
              </td>`;
            }).join('')}
          </tr>`;
          })
          .join('')}
      </tbody>
    </table>
    </div>
  </div>`;
}

function renderOcc(srv, occ) {
  return `<div class="section" data-sec="occupation">
    <div class="sec-title">Total Occupation (all days combined)</div>
    <div class="tbl-wrap"><table class="otbl otbl-fixed">
      <thead><tr>
        <th class="col-guild">Guild</th>
        <th class="col-lv1">Lv1 Towns</th>
        <th class="col-lv2">Lv2 Dorms</th>
        <th class="col-lv3">Lv3 Darkwick</th>
        <th class="col-total">Total</th>
      </tr></thead>
      <tbody>
        ${srv.guilds
          .map(
            g => `<tr>
          <td class="occ-guild">
            <div class="occ-guild-inner">
              <div class="guild-dot" style="background:${g.color}; flex-shrink:0;"></div>
              <span class="occ-guild-name">${esc(g.name)}</span>
            </div>
          </td>
          <td class="occ-lv1">${occ[g.id].lv1}</td>
          <td class="occ-lv2">${occ[g.id].lv2}</td>
          <td class="occ-lv3">${occ[g.id].lv3}</td>
          <td class="occ-total">${occ[g.id].total}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table></div>
  </div>`;
}

function renderDecTable(srv, days, dec, give) {
  const today = todayDay(srv, days);
  const baseMaxDecl = srv.mode === 'goc' ? 2 : 3;
  return `<div class="section" id="sec-declares" data-sec="declares">
    <div class="sec-title">Declares & Giveaways</div>
    <div class="tbl-wrap"><table class="dtbl">
      <thead><tr>
        <th>Guild</th>
        ${Array.from({ length: days }, (_, d) => `<th${d + 1 === today ? ' class="is-today"' : ''}>${dateLabelShort(srv, d + 1)}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${srv.guilds
          .map(g => {
            const maxDecl = g.isSmall ? 1 : baseMaxDecl;
            return `<tr data-g="${g.id}">
          <td class="dec-guild">
            <div class="dec-guild-inner">
              <div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}
              ${g.isSmall ? `<span class="dec-max">(Max 1)</span>` : ''}
            </div>
          </td>
          ${Array.from({ length: days }, (_, d) => {
            const cnt = dec[g.id][d].length;
            const cls = cnt > maxDecl ? 'dc-bad' : cnt > 0 ? 'dc-warn' : 'dc-ok';
            return `<td${d + 1 === today ? ' class="is-today"' : ''}>
              <div class="${cls} dec-count">${cnt}▲</div>
              <div class="dec-towns">${dec[g.id][d].join(', ') || '—'}</div>
              ${give[g.id][d].length ? `<div class="dec-give">↓${give[g.id][d].join(',')}</div>` : ''}
            </td>`;
          }).join('')}
        </tr>`;
          })
          .join('')}
      </tbody>
    </table></div>
  </div>`;
}

function renderMsgs(srv) {
  const today = todayDay(srv, numDays(srv));
  const msgs = buildMessages(srv);

  return `<div class="section" id="sec-messages" data-sec="messages" data-tour="messages">
    <div class="sec-title sec-title-row">
      <div>Daily Messages <span class="sec-note"> — click to copy</span></div>
      <button type="button" class="btn-tool btn-tool-sm" data-action="message-template">${icon('pencil')}<span class="btn-label">Template</span></button>
    </div>
    
    <div class="msg-grid">
      ${msgs
        .map(
          (
            m,
            d,
          ) => `<div class="msg-card${d + 1 === today ? ' is-today' : ''}" data-action="copy-message" data-day="${d}" data-msg="${esc(m)}">
        <div class="msg-date">
          ${d + 1 === today ? '<span class="today-tag">Today</span>' : ''}${dateLabelShort(srv, d + 1).replace('<br>', ' ')} <span class="msg-copied" id="cpd-${d}"></span>
        </div>
        <div class="msg-body">${esc(m)}</div>
      </div>`,
        )
        .join('')}
    </div>
  </div>`;
}
