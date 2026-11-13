// js/calc.js
// Pure calculations: scores, occupation, declares, and plan validation (adjacency, wipes).

import { numDays } from './state.js';
import { getMapData } from './maps/index.js';

export function kPts(type) {
  return type === 'lv3' ? 3 : type === 'lv2' ? 2 : 1;
}

export function calcScores(srv) {
  const mapData = getMapData(srv.mode, srv.mapKey);
  const days = numDays(srv);
  const daily = {},
    cumul = {};
  for (const g of srv.guilds) {
    daily[g.id] = Array(days).fill(0);
    cumul[g.id] = Array(days).fill(0);
  }
  for (let d = 1; d <= days; d++) {
    for (const k of mapData.kingdoms) {
      const gid = srv.plan[d] && srv.plan[d][k.id];
      if (gid && daily[gid]) daily[gid][d - 1] += kPts(k.type);
    }
  }
  for (const g of srv.guilds) {
    let r = parseInt(g.basePoints || 0, 10) || 0;
    for (let d = 0; d < days; d++) {
      r += daily[g.id][d];
      cumul[g.id][d] = r;
    }
  }
  return { daily, cumul };
}

export function calcOcc(srv) {
  const mapData = getMapData(srv.mode, srv.mapKey);
  const days = numDays(srv);
  const occ = {};

  for (const g of srv.guilds) {
    occ[g.id] = {
      lv3: parseInt(g.baseLv3 || 0, 10),
      lv2: parseInt(g.baseLv2 || 0, 10),
      lv1: parseInt(g.baseLv1 || 0, 10), // Include base Lv1
      total: 0,
    };
  }

  for (let d = 1; d <= days; d++) {
    for (const [kid, gid] of Object.entries(srv.plan[d] || {})) {
      if (!gid || !occ[gid]) continue;
      const kObj = mapData.kingdoms.find(x => x.id === kid);
      if (kObj) occ[gid][kObj.type]++;
    }
  }

  for (const g of srv.guilds) {
    occ[g.id].total = occ[g.id].lv3 + occ[g.id].lv2 + occ[g.id].lv1;
  }

  return occ;
}

function adjMap(mode, mapKey) {
  const adj = {};
  for (const k of getMapData(mode, mapKey).kingdoms) adj[k.id] = k.adj;
  return adj;
}

export function validateAdj(srv) {
  const adj = adjMap(srv.mode, srv.mapKey);
  const mapData = getMapData(srv.mode, srv.mapKey);
  const days = numDays(srv);
  const issues = [];

  for (let d = 1; d <= days; d++) {
    const unplacedCaptures = {};
    for (const g of srv.guilds) unplacedCaptures[g.id] = 0;

    for (const [kid, gid] of Object.entries(srv.plan[d] || {})) {
      if (!gid) continue;

      // Skip towns that aren't on this map (e.g. left over after the map was changed)
      const kObj = mapData.kingdoms.find(x => x.id === kid);
      if (!kObj) continue;

      const prevPlan = srv.plan[d - 1] || {};
      const isNewCapture = prevPlan[kid] !== gid;

      if (isNewCapture) {
        if (kid === 'Darkwick') {
          const prevHeld = Object.entries(prevPlan).filter(([, g2]) => g2 === gid);
          let lv2Count = 0;
          let lv1Count = 0;
          prevHeld.forEach(([kId]) => {
            const prevKObj = mapData.kingdoms.find(x => x.id === kId);
            // Protect against ghost towns in the previous day's holdings
            if (prevKObj && prevKObj.type === 'lv2') lv2Count++;
            if (prevKObj && prevKObj.type === 'lv1') lv1Count++;
          });

          if (!(lv2Count >= 1 || lv1Count >= 2)) {
            issues.push({ day: d, kingdom: kid, guild: gid });
          }
        }

        const prevHeldIds = Object.entries(prevPlan)
          .filter(([, g2]) => g2 === gid)
          .map(([k2]) => k2);
        const canReach = prevHeldIds.some(pk => adj[pk] && adj[pk].includes(kid));

        if (prevHeldIds.length === 0) {
          if (kObj.type !== 'lv1') {
            issues.push({ day: d, kingdom: kid, guild: gid });
          } else {
            unplacedCaptures[gid]++;
            if (unplacedCaptures[gid] > 2) {
              issues.push({ day: d, kingdom: kid, guild: gid });
            }
          }
        } else if (!canReach) {
          issues.push({ day: d, kingdom: kid, guild: gid });
        }
      }
    }
  }
  return issues;
}

export function calcDec(srv) {
  const mapData = getMapData(srv.mode, srv.mapKey);
  const validKids = new Set(mapData.kingdoms.map(k => k.id));
  const days = numDays(srv);
  const dec = {},
    give = {};

  for (const g of srv.guilds) {
    dec[g.id] = Array.from({ length: days }, () => []);
    give[g.id] = Array.from({ length: days }, () => []);
  }
  for (let d = 1; d <= days; d++) {
    const prev = srv.plan[d - 1] || {};
    for (const [kid, gid] of Object.entries(srv.plan[d] || {})) {
      if (!gid || !validKids.has(kid)) continue; // skip towns not on this map

      const prevOwner = prev[kid] || '';
      if (prevOwner !== gid) {
        if (dec[gid]) dec[gid][d - 1].push(kid);
        if (prevOwner && give[prevOwner]) give[prevOwner][d - 1].push(kid);
      }
    }
  }
  return { dec, give };
}

// How many towns a guild starts with on Day 0. Ragnarok: always 4. Game of Claws depends on the map:
// the top guilds (in guild-list order) get 2, the next one gets 1 and the rest start with none.
// In words, for hints: "4 each." / "The top 6 guilds start with 2, the 7th with 1, the rest with none."
export function startRule(srv) {
  if (srv.mode !== 'goc') return '4 each.';
  const top = GOC_TWO_TOWNS[srv.mapKey] ?? 8;
  return `The top ${top} guilds start with 2, the ${top + 1}th with 1, the rest with none.`;
}
const GOC_TWO_TOWNS = { forest: 8, wetland: 6, snowfield: 8, woodlands: 5, badlands: 8 };
export function startingTownLimit(srv, gid) {
  if (srv.mode !== 'goc') return 4;
  const top = GOC_TWO_TOWNS[srv.mapKey] ?? 8;
  const rank = srv.guilds.findIndex(g => g.id === gid);
  return rank < 0 ? 0 : rank < top ? 2 : rank === top ? 1 : 0;
}

// Some guild already has points or days held entered in the guild settings (Points / Castle / Dorms /
// Towns). The Planning mid-event switch can't be turned off while it does.
export const hasMidEventNumbers = srv =>
  (srv.guilds || []).some(g => ['basePoints', 'baseLv1', 'baseLv2', 'baseLv3'].some(f => Number(g[f]) > 0));

// Planning from the middle of an event: Planning mid-event is on under Guilds (or numbers are already
// entered). Day 0 is then wherever things stand, not the event's start: any guild can be on any town,
// dorm or castle, and the starting towns aren't counted.
export const isMidEvent = srv => !!srv.showMidEvent || hasMidEventNumbers(srv);

// Day 0 at the start of an event: every guild on exactly its starting towns (only plain towns, no
// dorms or castle). Only checked once Day 0 has been started (a new, empty plan isn't flagged), and
// not at all when planning from the middle of an event.
//   { guild, count, want }      a guild with more or fewer starting towns than it should have
//   { guild, kingdom }          a guild on a dorm or the castle
export function validateStarts(srv) {
  if (isMidEvent(srv)) return [];
  const day0 = srv.plan[0] || {};
  const type = Object.fromEntries(getMapData(srv.mode, srv.mapKey).kingdoms.map(k => [k.id, k.type]));
  const count = {};
  const out = [];
  Object.entries(day0).forEach(([kid, gid]) => {
    if (!gid) return;
    count[gid] = (count[gid] || 0) + 1;
    if (type[kid] && type[kid] !== 'lv1') out.push({ guild: gid, kingdom: kid });
  });
  if (!Object.keys(count).length) return [];
  [...srv.guilds]
    .reverse()
    .filter(g => (count[g.id] || 0) !== startingTownLimit(srv, g.id))
    .forEach(g => out.unshift({ guild: g.id, count: count[g.id] || 0, want: startingTownLimit(srv, g.id) }));
  return out;
}

export function validateWipes(srv) {
  const days = numDays(srv);
  const mapData = getMapData(srv.mode, srv.mapKey);
  const wipes = [];

  for (let d = 1; d <= days; d++) {
    const prevPlan = srv.plan[d - 1] || {};
    const currPlan = srv.plan[d] || {};

    const prevHeld = {};
    const currHeld = {};
    for (const g of srv.guilds) {
      prevHeld[g.id] = 0;
      currHeld[g.id] = 0;
    }

    for (const k of mapData.kingdoms) {
      if (prevPlan[k.id]) prevHeld[prevPlan[k.id]]++;
      if (currPlan[k.id]) currHeld[currPlan[k.id]]++;
    }

    for (const g of srv.guilds) {
      // A wipe is: Held last day, held 0 this day
      if (prevHeld[g.id] > 0 && currHeld[g.id] === 0) {
        wipes.push({ day: d, guild: g.id });
      }
    }
  }
  return wipes;
}

export function getEligibleGuilds(srv, kId, d) {
  const prevPlan = srv.plan[d - 1] || {};
  const adjMapData = adjMap(srv.mode, srv.mapKey);
  const kObj = getMapData(srv.mode, srv.mapKey).kingdoms.find(k => k.id === kId);

  const occupiedGuildIds = new Set(Object.values(prevPlan).filter(gid => gid !== ''));
  const unplacedGuilds = srv.guilds.filter(g => !occupiedGuildIds.has(g.id));

  const currentOwner = prevPlan[kId];
  const adjKingdoms = adjMapData[kId] || [];
  const adjacentGuilds = [...new Set(adjKingdoms.map(adjK => prevPlan[adjK]).filter(g => g && g !== ''))];

  let eligibleIds;
  if (kObj && kObj.type === 'lv1') {
    eligibleIds = new Set(
      [currentOwner, ...adjacentGuilds, ...unplacedGuilds.map(g => g.id)].filter(g => g && g !== ''),
    );
  } else {
    eligibleIds = new Set([currentOwner, ...adjacentGuilds].filter(g => g && g !== ''));
  }

  // Always include the currently assigned guild so optimizer results always render,
  // and fall back to all guilds if nothing is eligible (e.g. early days, fresh plan)
  const currentAssigned = (srv.plan[d] || {})[kId];
  if (currentAssigned) eligibleIds.add(currentAssigned);

  const eligible = srv.guilds.filter(g => eligibleIds.has(g.id));
  return eligible.length > 0 ? eligible : srv.guilds;
}
