// js/state.js
// Shared app state (servers, active server), server factory, and saving to / loading from the browser.

import { getMapData } from './maps/index.js';

// 15 guild colors, picked to be clearly distinct from each other on the dark background
// (every pair is at least ~11 apart in CIEDE2000 colour difference). The guild limit is
// GUILD_COLORS.length, so no two guilds on a server ever share a colour.
export const GUILD_COLORS = [
  '#a08cff','#6bffb4','#ffb86b','#ff6b9d','#6baff5',
  '#f5e46b','#ff6b6b','#6bffe8','#d46bff','#b4ff6b',
  '#ff9f6b','#26c0d0','#fec4ff','#9bb670','#ff6bda'
];
export const MAX_GUILDS = GUILD_COLORS.length;

// First palette colour not already used by a guild on this server
// (falls back to cycling the palette only if every colour is taken).
export function nextGuildColor(guilds) {
  const used = new Set(guilds.map(g => (g.color || '').toLowerCase()));
  return GUILD_COLORS.find(c => !used.has(c)) || GUILD_COLORS[guilds.length % GUILD_COLORS.length];
}

// servers: every planning server (one per tab). activeId: id of the tab being shown.
// Kept on one object because other modules reassign them (state.servers = ...), which a plain
// exported `let` would not allow.
export const state = {
  servers: [],
  activeId: null,
};

export function getSrv(id){ return state.servers.find(s=>s.id===id); }
export function activeSrv(){ return getSrv(state.activeId); }

export function numDays(srv){
  if(!srv.endDate||!srv.startDate) return srv.mode === 'goc' ? 12 : 6;
  const ms = new Date(srv.endDate)-new Date(srv.startDate);
  return Math.max(1, Math.round(ms/86400000)+1);
}

export function numDisplayDays(srv){
  return numDays(srv) + 1; 
}

export function mkSrv(name,mode,mapKey,startDate,endDate){
  const mapData = getMapData(mode,mapKey);
  const defGuilds = mode==='ragnarok'
    ? ['Guild 1','Guild 2','Guild 3','Guild 4']
    : Array.from({length:8},(_,i)=>`Guild ${i+1}`);
  const guilds = defGuilds.map((n,i)=>({id:'g'+i,name:n,color:GUILD_COLORS[i],basePoints:0,baseLv3:0,baseLv2:0}));
  const days = 6; 
  const plan = {};
  for(let d=0;d<14;d++){plan[d]={};for(const k of mapData.kingdoms)plan[d][k.id]='';}
  return {id:'s'+Date.now()+'_'+Math.random().toString(36).slice(2), name,mode,mapKey,startDate,endDate,guilds,plan,notes:''};
}

export function save(){
  try{
    localStorage.setItem('goc_v3',JSON.stringify({servers: state.servers,activeId: state.activeId}));
    const ss = document.getElementById('save-status');
    if(ss){
      ss.textContent = 'Saving...';
      ss.style.color = 'var(--accent)';
      clearTimeout(window.saveTimer);
      window.saveTimer = setTimeout(()=>{
        const s = activeSrv();
        // 🚨 NEW: Only show Cloud Linked if it was explicitly published/synced
        if (s && s.cloudSynced) {
          ss.innerHTML = '☁️ <b style="color:#6baff5">Cloud Linked</b> &nbsp;·&nbsp; ✓ Saved locally';
        } else {
          ss.innerHTML = '✓ Saved to browser';
        }
        ss.style.color = 'var(--text3)';
      }, 800);
    }
  }catch(e){}
}

export function load(){
  try{
    const r=localStorage.getItem('goc_v3');
    if(r){const d=JSON.parse(r);state.servers=(d.servers||[]).filter(x=>!x.isTutorial);state.activeId=d.activeId||null;
      if(!state.servers.find(x=>x.id===state.activeId))state.activeId=state.servers[0]?.id||null;}
  }catch(e){}
}
