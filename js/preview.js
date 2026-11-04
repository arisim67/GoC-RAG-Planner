// js/preview.js
// Draws the 1200×630 link-preview image for a shared plan: server name, mode, map and dates,
// the Total Occupation table with each guild's points, and a colour mini-map of the plan
// (towns × days). Uploaded with Save to Cloud so Discord and other apps can show it when the
// share link is posted.

import { numDays } from './state.js';
import { calcScores, calcOcc } from './calc.js';
import { getMapData, getMapList } from './maps/index.js';

export const PREVIEW_W = 1200;
export const PREVIEW_H = 630;

const C = {
  bg: '#191425', bg2: '#241d35', bg3: '#352a4f', border: '#423563',
  text: '#f0eef5', text2: '#b1a6cc', text3: '#8476a3',
  gold: '#e2c883', green: '#45d6a8', red: '#ff5e7e',
  lv1: '#78a9f0', lv2: '#b886ee', lv3: '#e2c883', empty: '#2b2342',
};
const HEAD = 'Montserrat, Inter, system-ui, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';
const MODE_NAMES = { goc: 'Game of Claws', ragnarok: 'Ragnarok' };

// Short "Nov 4 – Nov 16" label from the server's dates (Day 1 to the last day).
function dateRange(srv) {
  if (!srv.startDate || !srv.endDate) return '';
  const fmt = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${fmt(srv.startDate)} – ${fmt(srv.endDate)}`;
}

// Text used for the link's title and description (also stored with the image).
export function previewText(srv) {
  const mapName = (getMapList(srv.mode).find(m => m.key === srv.mapKey) || {}).name || '';
  const parts = [MODE_NAMES[srv.mode] || srv.mode, mapName, dateRange(srv), `${srv.guilds.length} guilds`].filter(Boolean);
  return {
    title: `${srv.name || 'Shared plan'} · GoC / Ragnarok Planner`,
    description: `${parts.join(' · ')}. View-only plan: open it to see every town, day and score.`,
    subtitle: parts,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shorten text with "…" until it fits in maxW.
function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function hexA(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Returns a PNG data URL, or null if anything goes wrong (the plan still saves without it).
export async function renderPlanPreview(srv) {
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load(`800 52px Montserrat`), document.fonts.load(`700 15px Montserrat`),
        document.fonts.load(`500 20px Inter`), document.fonts.load(`600 15px Inter`),
      ]).catch(() => {});
    }
    const mapData = getMapData(srv.mode, srv.mapKey);
    if (!mapData) return null;

    const cv = document.createElement('canvas');
    cv.width = PREVIEW_W; cv.height = PREVIEW_H;
    const ctx = cv.getContext('2d');

    // Background with the same soft glows as the site card
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    let g = ctx.createRadialGradient(1000, 90, 0, 1000, 90, 650);
    g.addColorStop(0, 'rgba(61,48,99,0.55)'); g.addColorStop(1, 'rgba(61,48,99,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    g = ctx.createRadialGradient(0, 630, 0, 0, 630, 520);
    g.addColorStop(0, 'rgba(45,35,72,0.6)'); g.addColorStop(1, 'rgba(45,35,72,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    const L = 56, leftW = 556;
    ctx.textBaseline = 'alphabetic';

    // Eyebrow
    ctx.fillStyle = C.green; ctx.font = `600 15px ${BODY}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('GOC / RAGNAROK PLANNER  ·  SHARED PLAN', L, 74);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Server name: shrink to fit one line, then ellipsize
    const name = srv.name || 'Shared plan';
    let size = 54;
    ctx.font = `800 ${size}px ${HEAD}`;
    while (size > 36 && ctx.measureText(name).width > leftW) { size -= 2; ctx.font = `800 ${size}px ${HEAD}`; }
    ctx.fillStyle = C.gold;
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillText(fit(ctx, name, leftW), L, 136);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Mode · map, then dates · guild count
    const { subtitle } = previewText(srv);
    ctx.font = `500 22px ${BODY}`; ctx.fillStyle = C.text2;
    ctx.fillText(fit(ctx, subtitle.slice(0, 2).join('  ·  '), leftW), L, 180);
    ctx.fillStyle = C.text3;
    ctx.fillText(fit(ctx, subtitle.slice(2).join('  ·  '), leftW), L, 212);

    // Total Occupation table (same numbers and guild order as that section in the app), with each
    // guild's final points in the last column instead of the town total
    const days = numDays(srv);
    const scores = calcScores(srv);
    const occ = calcOcc(srv);
    const rows = srv.guilds.map(gd => ({
      gd,
      o: occ[gd.id] || { lv1: 0, lv2: 0, lv3: 0 },
      pts: (scores.cumul[gd.id] && scores.cumul[gd.id][days - 1]) || 0,
    }));

    ctx.font = `700 15px ${HEAD}`; ctx.fillStyle = C.gold;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('TOTAL OCCUPATION', L, 262);
    const titleW = ctx.measureText('TOTAL OCCUPATION').width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.strokeStyle = C.border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L + titleW + 16, 257.5); ctx.lineTo(L + leftW, 257.5); ctx.stroke();

    // Columns: Guild | Lv1 Towns | Lv2 Dorms | Lv3 Darkwick | Points
    const colX = [0, 0.36, 0.52, 0.68, 0.84, 1].map(f => L + f * leftW);
    const cols = [
      { label: 'Lv1 Towns', color: C.lv1, val: r => r.o.lv1 },
      { label: 'Lv2 Dorms', color: C.lv2, val: r => r.o.lv2 },
      { label: 'Lv3 Darkwick', color: C.lv3, val: r => r.o.lv3 },
      { label: 'Points', color: C.text, val: r => r.pts, strong: true },
    ];
    const headY = 290, top = 302, bottom = 578;
    ctx.font = `600 13px ${BODY}`;
    ctx.fillStyle = C.text3; ctx.textAlign = 'left';
    ctx.fillText('Guild', colX[0] + 14, headY);
    ctx.textAlign = 'center';
    cols.forEach((c, i) => { ctx.fillStyle = c.color; ctx.fillText(c.label, (colX[i + 1] + colX[i + 2]) / 2, headY); });

    const n = rows.length;
    const rowH = Math.min(46, (bottom - top) / Math.max(n, 1));
    const fs = Math.max(13, Math.min(21, Math.round(rowH * 0.5)));
    rows.forEach((r, i) => {
      const y = top + i * rowH, mid = y + rowH / 2;
      if (i % 2 === 0) { roundRect(ctx, L, y + 1, leftW, rowH - 2, Math.min(8, rowH / 3)); ctx.fillStyle = hexA('#352a4f', 0.5); ctx.fill(); }
      ctx.fillStyle = r.gd.color; ctx.beginPath(); ctx.arc(colX[0] + 18, mid, Math.max(4, fs * 0.3), 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = C.text; ctx.font = `500 ${fs}px ${BODY}`;
      ctx.fillText(fit(ctx, r.gd.name || '', colX[1] - colX[0] - 40), colX[0] + 32, mid + fs * 0.36);
      ctx.textAlign = 'center';
      cols.forEach((c, j) => {
        ctx.fillStyle = c.color;
        ctx.font = c.strong ? `800 ${Math.round(fs * 1.1)}px ${HEAD}` : `600 ${fs}px ${BODY}`;
        ctx.fillText(String(c.val(r)), (colX[j + 1] + colX[j + 2]) / 2, mid + fs * 0.38);
      });
    });
    ctx.textAlign = 'left';

    // Mini-map of the plan: one row per town, one column per day (Day 0 onwards)
    const PX = 652, PY = 56, PW = 492, PH = 522;
    roundRect(ctx, PX, PY, PW, PH, 18);
    ctx.fillStyle = C.bg2; ctx.fill();
    ctx.strokeStyle = '#5c4b8a'; ctx.stroke();

    const towns = mapData.kingdoms;
    const colsD = days + 1;
    const gx = PX + 22 + 10, gy = PY + 44, gw = PW - 44 - 10, gh = PH - 44 - 18;
    const cg = 3;
    const cw = (gw - cg * (colsD - 1)) / colsD;
    const ch = (gh - cg * (towns.length - 1)) / towns.length;
    // Day labels
    ctx.font = `600 12px ${BODY}`; ctx.fillStyle = C.text3; ctx.textAlign = 'center';
    const step = colsD > 10 ? 2 : 1;
    for (let d = 0; d < colsD; d += step) ctx.fillText(`D${d}`, gx + d * (cw + cg) + cw / 2, PY + 30);
    ctx.textAlign = 'left';
    const colorOf = {};
    srv.guilds.forEach(gd => { colorOf[gd.id] = gd.color; });
    towns.forEach((k, r) => {
      const y = gy + r * (ch + cg);
      // town level marker
      ctx.fillStyle = C[k.type] || C.lv1;
      roundRect(ctx, PX + 18, y, 5, ch, 2); ctx.fill();
      for (let d = 0; d < colsD; d++) {
        const gid = srv.plan[d] && srv.plan[d][k.id];
        const x = gx + d * (cw + cg);
        roundRect(ctx, x, y, cw, ch, Math.min(4, ch / 3));
        ctx.fillStyle = gid && colorOf[gid] ? hexA(colorOf[gid], 0.88) : C.empty;
        ctx.fill();
      }
    });

    // Footer
    ctx.font = `500 15px ${BODY}`; ctx.fillStyle = C.text3;
    ctx.fillText('arisim67.github.io/GoC-RAG-Planner', L, 610);
    ctx.textAlign = 'right';
    ctx.fillText('Fan-made tool for Tokyo Debunker', PX + PW, 610);
    ctx.textAlign = 'left';

    return cv.toDataURL('image/png');
  } catch (e) {
    console.warn('Preview image failed', e);
    return null;
  }
}