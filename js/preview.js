// js/preview.js
// Draws the 1200×630 link-preview image for a shared plan: the Total Occupation table with each
// guild's points, and each guild's declares and giveaways per day (towns and dorms named).
// Uploaded with Save to Cloud so Discord and other apps can show it when the share link is posted.
// The plan's name, mode, map and dates are not drawn: apps show them as text above the image.

import { numDays } from './state.js';
import { calcScores, calcOcc, calcDec } from './calc.js';
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

    // No title block: Discord and other apps already show the plan's name, mode, map and dates
    // as text above the image, so the whole image goes to the two tables.
    const L = 48, R = 1152;
    ctx.textBaseline = 'alphabetic';
    const spaced = on => { if ('letterSpacing' in ctx) ctx.letterSpacing = on ? '2px' : '0px'; };

    const days = numDays(srv);
    const scores = calcScores(srv);
    const occ = calcOcc(srv);
    const { dec, give } = calcDec(srv);
    const typeOf = {};
    mapData.kingdoms.forEach(k => { typeOf[k.id] = k.type; });
    const baseMax = srv.mode === 'goc' ? 2 : 3;
    const rows = srv.guilds.map(gd => ({
      gd,
      o: occ[gd.id] || { lv1: 0, lv2: 0, lv3: 0 },
      pts: (scores.cumul[gd.id] && scores.cumul[gd.id][days - 1]) || 0,
      max: gd.isSmall ? 1 : baseMax,
    }));

    // Two tables side by side whose rows line up, so each guild reads straight across
    const LX = L, LW = 400;            // Total Occupation
    const RX = 476, RW = R - 476;      // Declares & Giveaways
    const sectionTitle = (text, x, w) => {
      ctx.font = `700 15px ${HEAD}`; ctx.fillStyle = C.gold; ctx.textAlign = 'left';
      spaced(true); ctx.fillText(text, x, 60); const tw = ctx.measureText(text).width; spaced(false);
      ctx.strokeStyle = C.border; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + tw + 14, 55.5); ctx.lineTo(x + w, 55.5); ctx.stroke();
    };
    sectionTitle('TOTAL OCCUPATION', LX, LW);
    sectionTitle('DECLARES & GIVEAWAYS', RX, RW);

    const headY = 102, top = 114, bottom = 580;
    const n = rows.length;
    const rowH = (bottom - top) / Math.max(n, 1);
    const fs = Math.max(13, Math.min(30, Math.round(rowH * 0.42)));

    // Row stripes run across both tables
    rows.forEach((r, i) => {
      if (i % 2) return;
      roundRect(ctx, L, top + i * rowH + 1, R - L, rowH - 2, Math.min(8, rowH / 3));
      ctx.fillStyle = hexA('#352a4f', 0.5); ctx.fill();
    });

    // ── Total Occupation: Guild | Towns | Dorms | Castle | Points (days held, all days combined) ──
    const colX = [0, 0.40, 0.55, 0.70, 0.85, 1].map(f => LX + f * LW);
    const cols = [
      { label: 'Towns', color: C.lv1, val: r => r.o.lv1 },
      { label: 'Dorms', color: C.lv2, val: r => r.o.lv2 },
      { label: 'Castle', color: C.lv3, val: r => r.o.lv3 },
      { label: 'Points', color: C.text, val: r => r.pts, strong: true },
    ];
    ctx.font = `600 14px ${BODY}`; ctx.fillStyle = C.text3; ctx.textAlign = 'left';
    ctx.fillText('Guild', colX[0] + 14, headY);
    ctx.textAlign = 'center';
    cols.forEach((c, i) => { ctx.fillStyle = c.color; ctx.fillText(c.label, (colX[i + 1] + colX[i + 2]) / 2, headY); });
    rows.forEach((r, i) => {
      const mid = top + i * rowH + rowH / 2;
      ctx.fillStyle = r.gd.color; ctx.beginPath(); ctx.arc(colX[0] + 18, mid, Math.max(4, fs * 0.28), 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = C.text;
      const nameW = colX[1] - colX[0] - 38;
      let nfs = fs;
      ctx.font = `500 ${nfs}px ${BODY}`;
      while (nfs > 13 && ctx.measureText(r.gd.name || '').width > nameW) { nfs--; ctx.font = `500 ${nfs}px ${BODY}`; }
      ctx.fillText(fit(ctx, r.gd.name || '', nameW), colX[0] + 32, mid + nfs * 0.36);
      ctx.textAlign = 'center';
      cols.forEach((c, j) => {
        ctx.fillStyle = c.color;
        ctx.font = c.strong ? `800 ${Math.round(fs * 1.1)}px ${HEAD}` : `600 ${fs}px ${BODY}`;
        ctx.fillText(String(c.val(r)), (colX[j + 1] + colX[j + 2]) / 2, mid + fs * 0.38);
      });
    });

    // ── Declares & Giveaways: towns as letters, dorms and Darkwick by the names players use ──
    const cw = RW / days;
    const dayDate = d => {
      if (!srv.startDate) return '';
      const [y, m, dd] = srv.startDate.split('-').map(Number);
      const dt = new Date(y, m - 1, dd + d - 1);
      return `${dt.getMonth() + 1}/${dt.getDate()}`;
    };
    ctx.textAlign = 'center';
    for (let d = 1; d <= days; d++) {
      const cx = RX + (d - 0.5) * cw;
      ctx.font = `700 14px ${BODY}`; ctx.fillStyle = C.text2; ctx.fillText(`D${d}`, cx, headY - 17);
      ctx.font = `500 12px ${BODY}`; ctx.fillStyle = C.text3; ctx.fillText(dayDate(d), cx, headY);
    }
    // The names players use for Darkwick and the dorms; towns keep their letters
    const NICKNAMES = {
      Darkwick: 'DW', Obscuary: 'Obs', Mortkranken: 'Mort', Dionysia: 'Dio', Vagastrom: 'Vaga',
      Frostheim: 'Frost', Jabberwock: 'Jabb', Sinostra: 'Sino', Hotarubi: 'Hota',
    };
    const short = id => NICKNAMES[id] || (typeOf[id] === 'lv1' ? id : id.slice(0, 4));
    const tokColor = id => C[typeOf[id]] || C.text2;
    // A cell's two lines: "▲ A Hot" (declares) and "↓ C" (giveaways)
    const cellOf = (r, d) => {
      const de = (dec[r.gd.id] && dec[r.gd.id][d - 1]) || [];
      const gv = (give[r.gd.id] && give[r.gd.id][d - 1]) || [];
      return { de, gv, over: de.length > r.max };
    };
    // Lay a cell out as lines: declares first ("▲ A Hot", wrapping onto more lines if needed),
    // then giveaways ("↓ C"), each line no wider than the day column.
    const maxW = cw - 8;
    const wrap = (prefix, ids, size, weight) => {
      if (!ids.length) return [];
      ctx.font = `${weight} ${size}px ${BODY}`;
      const sp = ctx.measureText(' ').width;
      const lines = []; let cur = []; let w = ctx.measureText(prefix).width;
      for (const id of ids) {
        const tw = ctx.measureText(short(id)).width;
        if (cur.length && w + sp + tw > maxW) { lines.push(cur); cur = []; w = 0; }
        cur.push(id); w += (w ? sp : 0) + tw;
      }
      lines.push(cur);
      return lines.map((l, i) => ({ prefix: i === 0 ? prefix : '', ids: l, size, weight }));
    };
    const lineWidth = ln => {
      ctx.font = `${ln.weight} ${ln.size}px ${BODY}`;
      const sp = ctx.measureText(' ').width;
      const pw = ln.prefix ? ctx.measureText(ln.prefix).width + sp : 0;
      return pw + ln.ids.reduce((w, id, i) => w + (i ? sp : 0) + ctx.measureText(short(id)).width, 0);
    };
    const giveSize = f => Math.max(9, Math.round(f * 0.88));
    const layoutCell = (c, f) => [...wrap('▲', c.de, f, 700), ...wrap('↓', c.gv, giveSize(f), 500)];
    const lineH = f => Math.round(f * 1.18);
    // One text size for the whole table: the largest at which every cell's lines fit its row
    let cfs = Math.max(10, Math.min(22, Math.floor(rowH * 0.36)));
    const fitsAll = f => rows.every(r => {
      for (let d = 1; d <= days; d++) {
        const ls = layoutCell(cellOf(r, d), f);
        if (ls.length * lineH(f) > rowH - 4 || ls.some(ln => lineWidth(ln) > maxW)) return false;
      }
      return true;
    });
    while (cfs > 10 && !fitsAll(cfs)) cfs--;

    rows.forEach((r, i) => {
      const y0 = top + i * rowH, mid = y0 + rowH / 2;
      for (let d = 1; d <= days; d++) {
        const cx = RX + (d - 0.5) * cw;
        const c = cellOf(r, d);
        if (!c.de.length && !c.gv.length) {
          ctx.font = `500 ${cfs}px ${BODY}`; ctx.fillStyle = C.text3; ctx.textAlign = 'center';
          ctx.fillText('–', cx, mid + cfs * 0.36);
          continue;
        }
        let ls = layoutCell(c, cfs);
        // Only in very unusual plans: more lines than the row can hold, so end the last one with "…"
        const maxLines = Math.max(1, Math.floor((rowH - 4) / lineH(cfs)));
        if (ls.length > maxLines) { ls = ls.slice(0, maxLines); ls[maxLines - 1] = { ...ls[maxLines - 1], ids: [...ls[maxLines - 1].ids, '…'] }; }
        const total = ls.length * lineH(cfs);
        let y = mid - total / 2 + lineH(cfs) * 0.78;
        ls.forEach(ln => {
          const isGive = ln.weight === 500;
          ctx.font = `${ln.weight} ${ln.size}px ${BODY}`; ctx.textAlign = 'left';
          const sp = ctx.measureText(' ').width;
          let x = cx - lineWidth(ln) / 2;
          if (ln.prefix) {
            ctx.fillStyle = isGive ? C.text3 : (c.over ? C.red : C.gold);
            ctx.fillText(ln.prefix, x, y); x += ctx.measureText(ln.prefix).width + sp;
          }
          ln.ids.forEach((id, k) => {
            if (k) x += sp;
            ctx.fillStyle = isGive || id === '…' ? C.text3 : tokColor(id);
            const t = id === '…' ? '…' : short(id);
            ctx.fillText(t, x, y); x += ctx.measureText(t).width;
          });
          y += lineH(cfs);
        });
      }
    });
    ctx.textAlign = 'left';

    // Footer: key on the left, site on the right
    ctx.font = `500 14px ${BODY}`;
    let fx = L;
    const key = (t, color) => { ctx.fillStyle = color; ctx.fillText(t, fx, 614); fx += ctx.measureText(t).width; };
    key('▲ declares   ↓ giveaways   ', C.text3);
    key('A', C.lv1); key(' town   ', C.text3);
    key('Obs', C.lv2); key(' dorm   ', C.text3);
    key('DW', C.lv3); key(' Darkwick', C.text3);
    ctx.textAlign = 'right'; ctx.fillStyle = C.text3;
    ctx.fillText('GoC / Ragnarok Planner', R, 614);
    ctx.textAlign = 'left';

    return cv.toDataURL('image/png');
  } catch (e) {
    console.warn('Preview image failed', e);
    return null;
  }
}