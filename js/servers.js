// js/servers.js
// Server tabs: add / switch / rename / duplicate / delete servers, and the tutorial demo server.

import { state, getSrv, save, mkSrv, activeSrv } from './state.js';
import { closeModal } from './ui.js';
import { renderTabs, renderAll } from './render.js';
import { getMapList, getMapData } from './maps/index.js';

// ── TAB CONTEXT MENU ─────────────────────────────────────────────────────────

let _ctxSrvId = null;

export function openTabCtx(e, srvId){
  _ctxSrvId = srvId;
  if(state.activeId !== srvId){ switchSrv(srvId); }
  const menu = document.getElementById('tab-ctx');
  menu.classList.add('open');
  
  // Figure out if it's a mouse click or a touch tap
  let clientX = e.clientX;
  let clientY = e.clientY;
  
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
    // Prevent the default browser context menu from popping up
    if(e.cancelable) e.preventDefault();
  }

  const x = Math.min(clientX, window.innerWidth  - menu.offsetWidth  - 8);
  const y = Math.min(clientY, window.innerHeight - menu.offsetHeight - 8);
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
}

function closeTabCtx(){ document.getElementById('tab-ctx').classList.remove('open'); _ctxSrvId=null; }

export function ctxRename(){
  const srvId = _ctxSrvId;
  closeTabCtx();
  const srv = getSrv(srvId);
  if(!srv) return;

  // Find the tab button and swap the label span for an input
  const btn = document.querySelector(`.tab-btn[data-srv-id="${srvId}"]`)
           || [...document.querySelectorAll('.tab-btn')].find(b=>b.dataset.srvId===srvId);
  if(!btn) return;
  const label = btn.querySelector('.tab-label');
  if(!label) return;

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'tab-rename-inp';
  inp.value = srv.name;
  inp.style.width = Math.max(60, srv.name.length * 8) + 'px';

  label.replaceWith(inp);
  inp.focus();
  inp.select();

  function commit(){
    const val = inp.value.trim() || srv.name;
    srv.name = val;
    save(); renderTabs(); renderAll();
  }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){ e.preventDefault(); inp.blur(); }
    if(e.key === 'Escape'){ inp.removeEventListener('blur', commit); renderTabs(); }
  });
  // Stop click on the input from triggering switchSrv
  inp.addEventListener('click', e=>e.stopPropagation());
}

export function ctxDuplicate(){
  const src = getSrv(_ctxSrvId); closeTabCtx();
  if(!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id   = 's' + Date.now() + '_' + Math.random().toString(36).slice(2);
  copy.name = src.name + ' (copy)';
  const idx = state.servers.findIndex(s => s.id === src.id);
  state.servers.splice(idx + 1, 0, copy);
  state.activeId = copy.id;
  save(); renderTabs(); renderAll();
}

export function ctxDelete(){
  const id = _ctxSrvId;
  closeTabCtx();
  removeSrv(id);
}

// Close context menu on any outside click or Escape
document.addEventListener('click', e=>{
  const menu = document.getElementById('tab-ctx');
  if(menu && !menu.contains(e.target)) closeTabCtx();
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeTabCtx(); });

export function openAdd(){
  const t=new Date(),fmt=d=>d.toISOString().slice(0,10);
  document.getElementById('ns-name').value='';
  document.getElementById('ns-start').value=fmt(t);
  
  // Reset mode to Ragnarok default
  document.getElementById('ns-mode').value = 'ragnarok';
  onAddModalModeChange(); 
  
  document.getElementById('modal-add').classList.add('open');
}

export function onAddModalModeChange(){
  const mode = document.getElementById('ns-mode').value;
  // Use the imported getMapList function
  const maps = getMapList(mode);
  
  document.getElementById('ns-map').innerHTML = maps.map(m=>`<option value="${m.key}">${m.name}</option>`).join('');
  onAddModalStartChange();
}

export function onAddModalStartChange(){
  const mode  = document.getElementById('ns-mode').value;
  const start = document.getElementById('ns-start').value;
  if(!start) return;
  const eventDays = mode === 'goc' ? 13 : 6;
  const [yy, mm, dd] = start.split('-');
  const endDt = new Date(+yy, mm - 1, +dd);
  endDt.setDate(endDt.getDate() + eventDays - 1);
  document.getElementById('ns-end').value = endDt.toISOString().slice(0, 10);
}

export function confirmAdd(){
  const name=document.getElementById('ns-name').value.trim()||'Server '+(state.servers.length+1);
  const mode=document.getElementById('ns-mode').value;
  const mapKey=document.getElementById('ns-map').value;
  const start=document.getElementById('ns-start').value;
  const end=document.getElementById('ns-end').value;
  const s=mkSrv(name,mode,mapKey,start,end);
  state.servers.push(s);
  state.activeId=s.id;
  closeModal('modal-add');
  save();
  renderTabs();
  renderAll();
}

export function switchSrv(id){
  state.activeId=id;
  // Clear the URL parameter so users don't confuse local tabs with share links
  window.history.replaceState({}, document.title, window.location.pathname);
  save();
  renderTabs();
  renderAll();
}

let _deleteSrvId = null;

export function removeSrv(id){
  const srv = getSrv(id);
  if(!srv) return;
  _deleteSrvId = id;
  document.getElementById('confirm-delete-msg').textContent = `Delete "${srv.name}"?`;
  document.getElementById('modal-confirm-delete').classList.add('open');
}

export function confirmDeleteSrv(){
  closeModal('modal-confirm-delete');
  const id = _deleteSrvId; _deleteSrvId = null;
  if(!id) return;
  state.servers = state.servers.filter(s => s.id !== id);
  if(state.activeId === id) state.activeId = state.servers[0]?.id || null;
  save(); renderTabs(); renderAll();
}

// Gives viewers a way to create their own editable sandbox copy
window.duplicateCurrentPlan = function() {
  const src = activeSrv();
  if(!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id   = 's' + Date.now() + '_' + Math.random().toString(36).slice(2);
  copy.name = src.name + ' (My Copy)';
  copy.isViewOnly = false; // Unlock the copy!
  const idx = state.servers.findIndex(s => s.id === src.id);
  state.servers.splice(idx + 1, 0, copy);
  state.activeId = copy.id;
  save(); 
  renderTabs(); 
  renderAll();
};

// Temporary server the tutorial points at when there is nothing else to show.
// It is flagged isTutorial so load() discards it if the page is closed mid-tour.
export function createTutorialServer() {
  const prevId = state.activeId;
  const mapKey = getMapList('ragnarok')[0].key;
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const s = mkSrv('Tutorial Server', 'ragnarok', mapKey, day(0), day(5));
  s.isTutorial = true;
  // Give each guild a Day 0 foothold so the grid and stats have something to show.
  const lv1 = getMapData('ragnarok', mapKey).kingdoms.filter(k => k.type === 'lv1');
  s.guilds.forEach((g, i) => { if (lv1[i]) s.plan[0][lv1[i].id] = g.id; });
  state.servers.push(s);
  state.activeId = s.id;
  renderTabs();
  renderAll();
  return prevId;
}

export function removeTutorialServer(prevId) {
  state.servers = state.servers.filter(s => !s.isTutorial);
  state.activeId = state.servers.find(s => s.id === prevId) ? prevId : (state.servers[0]?.id || null);
  save();
  renderTabs();
  renderAll();
}
