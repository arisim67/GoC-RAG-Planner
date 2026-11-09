// js/preview.js
// Draws the 1200×630 link-preview image for a shared plan: the Final Scores (each guild's points
// in its color) and the Total Occupation table (days holding towns, dorms and the castle).
// The plan's name, mode, map and dates are not drawn: apps show them as text above the image.
// Uploaded with Save to Cloud so Discord and other apps can show it when the share link is posted.

import { numDays } from './state.js';
import { calcScores, calcOcc } from './calc.js';
import { getMapData, getMapList } from './maps/index.js';

export const PREVIEW_W = 1200;
export const PREVIEW_H = 630;

const C = {
  bg: '#191425',
  bg2: '#241d35',
  bg3: '#352a4f',
  border: '#423563',
  text: '#f0eef5',
  text2: '#b1a6cc',
  text3: '#8476a3',
  gold: '#e2c883',
  green: '#45d6a8',
  red: '#ff5e7e',
  lv1: '#78a9f0',
  lv2: '#b886ee',
  lv3: '#e2c883',
  empty: '#2b2342',
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
  const parts = [MODE_NAMES[srv.mode] || srv.mode, mapName, dateRange(srv), `${srv.guilds.length} guilds`].filter(
    Boolean,
  );
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
        document.fonts.load(`800 52px Montserrat`),
        document.fonts.load(`700 15px Montserrat`),
        document.fonts.load(`500 20px Inter`),
        document.fonts.load(`600 15px Inter`),
      ]).catch(() => {});
    }
    const mapData = getMapData(srv.mode, srv.mapKey);
    if (!mapData) return null;

    const cv = document.createElement('canvas');
    cv.width = PREVIEW_W;
    cv.height = PREVIEW_H;
    const ctx = cv.getContext('2d');

    // Background with the same soft glows as the site card
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    let g = ctx.createRadialGradient(1000, 90, 0, 1000, 90, 650);
    g.addColorStop(0, 'rgba(61,48,99,0.55)');
    g.addColorStop(1, 'rgba(61,48,99,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    g = ctx.createRadialGradient(0, 630, 0, 0, 630, 520);
    g.addColorStop(0, 'rgba(45,35,72,0.6)');
    g.addColorStop(1, 'rgba(45,35,72,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    const L = 56,
      leftW = 556;
    ctx.textBaseline = 'alphabetic';

    // No title: Discord and other apps already show the plan's name, mode, map and dates as text
    // above the image.

    // Final Scores in two columns (highest first), each guild's points in its own color
    const days = numDays(srv);
    const scores = calcScores(srv);
    const final = srv.guilds
      .map(gd => ({ gd, pts: (scores.cumul[gd.id] && scores.cumul[gd.id][days - 1]) || 0 }))
      .sort((a, b) => b.pts - a.pts);

    ctx.font = `700 15px ${HEAD}`;
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('FINAL SCORES', L, 92);
    const titleW = ctx.measureText('FINAL SCORES').width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L + titleW + 16, 87.5);
    ctx.lineTo(L + leftW, 87.5);
    ctx.stroke();

    const top = 114,
      bottom = 578,
      n = final.length;
    const cols = n <= 5 ? 1 : 2; // two columns once there are enough guilds to crowd one
    const perCol = Math.ceil(n / cols);
    const gap = 10,
      colGap = 14;
    const rowH = Math.min(96, (bottom - top - gap * (perCol - 1)) / perCol);
    const colW = (leftW - (cols - 1) * colGap) / cols;
    const scoresY = top;
    const fs = Math.max(14, Math.min(24, Math.round(rowH * 0.36)));
    final.forEach(({ gd, pts }, i) => {
      const c = Math.floor(i / perCol),
        r = i % perCol;
      const x = L + c * (colW + colGap),
        y = scoresY + r * (rowH + gap),
        mid = y + rowH / 2;
      roundRect(ctx, x, y, colW, rowH, 12);
      ctx.fillStyle = hexA('#352a4f', 0.55);
      ctx.fill();
      ctx.strokeStyle = C.border;
      ctx.stroke();
      // Color dot
      ctx.beginPath();
      ctx.arc(x + 22, mid, 6, 0, Math.PI * 2);
      ctx.fillStyle = gd.color;
      ctx.fill();
      // Points, right-aligned in the guild's color
      ctx.textAlign = 'right';
      ctx.fillStyle = gd.color;
      ctx.font = `800 ${Math.round(fs * 1.35)}px ${HEAD}`;
      ctx.fillText(String(pts), x + colW - 16, mid + fs * 0.48);
      const pW = ctx.measureText(String(pts)).width;
      // Name: shrink to fit, then shorten with "…"
      ctx.textAlign = 'left';
      ctx.fillStyle = C.text;
      const nameX = x + 38,
        nameW = colW - (nameX - x) - pW - 26;
      let nfs = fs;
      ctx.font = `500 ${nfs}px ${BODY}`;
      while (nfs > 12 && ctx.measureText(gd.name || '').width > nameW) {
        nfs--;
        ctx.font = `500 ${nfs}px ${BODY}`;
      }
      ctx.fillText(fit(ctx, gd.name || '', nameW), nameX, mid + nfs * 0.36);
    });
    ctx.textAlign = 'left';

    // Total Occupation: days each guild held towns, dorms and the castle, plus the total
    // (in the same order as Final Scores)
    const PX = 652,
      PY = 56,
      PW = 492,
      PH = 522;
    roundRect(ctx, PX, PY, PW, PH, 18);
    ctx.fillStyle = C.bg2;
    ctx.fill();
    ctx.strokeStyle = '#5c4b8a';
    ctx.stroke();

    ctx.font = `700 15px ${HEAD}`;
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('TOTAL OCCUPATION', PX + 22, PY + 36);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    const occ = calcOcc(srv);
    const cols4 = [
      { label: 'Towns', color: C.lv1, val: o => o.lv1 },
      { label: 'Dorms', color: C.lv2, val: o => o.lv2 },
      { label: 'Castle', color: C.lv3, val: o => o.lv3 },
      { label: 'Total', color: C.text, val: o => o.lv1 + o.lv2 + o.lv3 },
    ];
    const tx = PX + 18,
      tw = PW - 36;
    const numW = 62,
      numX0 = tx + tw - numW * cols4.length; // numeric columns on the right
    const headerY = PY + 72,
      ty = PY + 86,
      th = PH - 86 - 18;
    // One column of score cards: line each row up with its guild's card. Two columns: fill the panel.
    const single = cols === 1;
    const rh = single ? Math.min(60, rowH) : Math.min(64, th / n);
    const rowMid = r => (single ? scoresY + r * (rowH + gap) + rowH / 2 : ty + r * rh + rh / 2);
    ctx.font = `600 13px ${BODY}`;
    ctx.textAlign = 'center';
    cols4.forEach((c, i) => {
      ctx.fillStyle = c.color;
      ctx.fillText(c.label, numX0 + numW * i + numW / 2, headerY);
    });
    const vfs = Math.max(14, Math.min(24, Math.round(rh * 0.42)));
    final.forEach(({ gd }, r) => {
      const mid = rowMid(r),
        y = mid - rh / 2;
      if (single || r % 2 === 0) {
        roundRect(ctx, tx, y + 1, tw, rh - 2, 8);
        ctx.fillStyle = hexA('#352a4f', 0.5);
        ctx.fill();
      }
      // Color dot + name
      ctx.beginPath();
      ctx.arc(tx + 20, mid, 6, 0, Math.PI * 2);
      ctx.fillStyle = gd.color;
      ctx.fill();
      const nameX = tx + 36,
        nameW = numX0 - nameX - 6;
      let nfs = Math.min(20, vfs);
      ctx.textAlign = 'left';
      ctx.fillStyle = C.text;
      ctx.font = `500 ${nfs}px ${BODY}`;
      while (nfs > 12 && ctx.measureText(gd.name || '').width > nameW) {
        nfs--;
        ctx.font = `500 ${nfs}px ${BODY}`;
      }
      ctx.fillText(fit(ctx, gd.name || '', nameW), nameX, mid + nfs * 0.36);
      // Numbers
      const o = occ[gd.id] || { lv1: 0, lv2: 0, lv3: 0 };
      ctx.textAlign = 'center';
      cols4.forEach((c, i) => {
        const last = i === cols4.length - 1;
        ctx.font = `${last ? 800 : 600} ${vfs}px ${last ? HEAD : BODY}`;
        ctx.fillStyle = c.color;
        ctx.fillText(String(c.val(o)), numX0 + numW * i + numW / 2, mid + vfs * 0.36);
      });
    });
    ctx.textAlign = 'left';

    // Footer
    ctx.font = `500 15px ${BODY}`;
    ctx.fillStyle = C.text3;
    ctx.fillText('goc-rag-planner.pages.dev', L, 610);
    ctx.textAlign = 'right';
    ctx.fillText('Fan-made tool for Tokyo Debunker', PX + PW, 610);
    ctx.textAlign = 'left';

    return cv.toDataURL('image/png');
  } catch (e) {
    console.warn('Preview image failed', e);
    return null;
  }
}
