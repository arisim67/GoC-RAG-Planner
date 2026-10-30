import { getMaps, getMapList, getMapData } from './maps/index.js';
import { MilpBuilder } from './milp.js';
import { buildModel, getPerfectTargets } from './model.js';

const solverWorker = new Worker('worker.js', { type: 'module' });

// A helper function to turn the Worker's message events into a clean async Promise
function runHighsSolver(matrixData) {
  return new Promise((resolve, reject) => {
    const handler = (e) => {
      if (e.data.status === 'success') {
        solverWorker.removeEventListener('message', handler);
        resolve(e.data.result);
      } else if (e.data.status === 'error') {
        solverWorker.removeEventListener('message', handler);
        reject(new Error(e.data.error));
      }
    };
    solverWorker.addEventListener('message', handler);
    solverWorker.postMessage({ type: 'SOLVE', payload: matrixData });
  });
}

function showToast(msg, isError = true) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; 
    background: ${isError ? 'var(--red)' : 'var(--green)'}; 
    color: ${isError ? '#fff' : '#000'}; 
    padding: 14px 24px; border-radius: 8px; 
    box-shadow: 0 8px 24px rgba(0,0,0,0.5); 
    z-index: 9999; font-weight: 600; 
    transform: translateY(100px); opacity: 0; 
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  // Animate out and remove after 5 seconds
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════

const GUILD_COLORS = [
  '#a08cff','#6bffb4','#ffb86b','#ff6b9d','#6baff5',
  '#f5e46b','#ff6b6b','#6bffe8','#d46bff','#b4ff6b',
  '#ff9f6b','#6b9dff','#ffe06b','#6bffcf','#ff6bda','#a8ff6b'
];

let servers = [];
let activeId  = null;

function getSrv(id){ return servers.find(s=>s.id===id); }
function activeSrv(){ return getSrv(activeId); }

function numDays(srv){
  if(!srv.endDate||!srv.startDate) return srv.mode === 'goc' ? 12 : 6;
  const ms = new Date(srv.endDate)-new Date(srv.startDate);
  return Math.max(1, Math.round(ms/86400000)+1);
}

function numDisplayDays(srv){
  return numDays(srv) + 1; 
}

function mkSrv(name,mode,mapKey,startDate,endDate){
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

// ══════════════════════════════════════════════════════════════
//  CALC
// ══════════════════════════════════════════════════════════════

function kPts(type){return type==='lv3'?3:type==='lv2'?2:1;}

function calcScores(srv){
  const mapData=getMapData(srv.mode,srv.mapKey);
  const days=numDays(srv);
  const daily={},cumul={};
  for(const g of srv.guilds){daily[g.id]=Array(days).fill(0);cumul[g.id]=Array(days).fill(0);}
  for(let d=1;d<=days;d++){
    for(const k of mapData.kingdoms){
      const gid=srv.plan[d]&&srv.plan[d][k.id];
      if(gid&&daily[gid])daily[gid][d-1]+=kPts(k.type);
    }
  }
  for(const g of srv.guilds){
    let r=parseInt(g.basePoints||0,10)||0;
    for(let d=0;d<days;d++){r+=daily[g.id][d];cumul[g.id][d]=r;}
  }
  return{daily,cumul};
}

// ══════════════════════════════════════════════════════════════
//  OCCUPATION CALCULATOR
// ══════════════════════════════════════════════════════════════
function calcOcc(srv){
  const mapData = getMapData(srv.mode, srv.mapKey);
  const days = numDays(srv);
  const occ = {};
  
  for(const g of srv.guilds){
    occ[g.id] = {
      lv3: parseInt(g.baseLv3 || 0, 10),
      lv2: parseInt(g.baseLv2 || 0, 10),
      lv1: parseInt(g.baseLv1 || 0, 10), // Include base Lv1
      total: 0
    };
  }
  
  for(let d=1; d<=days; d++){
    for(const [kid, gid] of Object.entries(srv.plan[d] || {})){
      if(!gid || !occ[gid]) continue;
      const kObj = mapData.kingdoms.find(x => x.id === kid);
      if(kObj) occ[gid][kObj.type]++;
    }
  }
  
  for(const g of srv.guilds){
    occ[g.id].total = occ[g.id].lv3 + occ[g.id].lv2 + occ[g.id].lv1;
  }
  
  return occ;
}

function adjMap(mode,mapKey){
  const adj={};
  for(const k of getMapData(mode,mapKey).kingdoms)adj[k.id]=k.adj;
  return adj;
}

function validateAdj(srv){
  const adj=adjMap(srv.mode,srv.mapKey);
  const mapData=getMapData(srv.mode,srv.mapKey);
  const days=numDays(srv);
  const issues=[];
  
  for(let d=1;d<=days;d++){
    const unplacedCaptures = {};
    for(const g of srv.guilds) unplacedCaptures[g.id] = 0;

    for(const[kid,gid]of Object.entries(srv.plan[d]||{})){
      if(!gid)continue;
      
      // 🚨 GHOST TOWN PROTECTION
      const kObj = mapData.kingdoms.find(x=>x.id===kid);
      if(!kObj) continue; 

      const prevPlan = srv.plan[d-1]||{};
      const isNewCapture = prevPlan[kid] !== gid;
      
      if(isNewCapture) {
          if(kid === 'Darkwick') {
              const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===gid);
              let lv2Count = 0;
              let lv1Count = 0;
              prevHeld.forEach(([kId]) => {
                  const prevKObj = mapData.kingdoms.find(x=>x.id === kId);
                  // Protect against ghost towns in the previous day's holdings
                  if(prevKObj && prevKObj.type === 'lv2') lv2Count++;
                  if(prevKObj && prevKObj.type === 'lv1') lv1Count++;
              });
              
              if(!(lv2Count >= 1 || lv1Count >= 2)) {
                  issues.push({day:d, kingdom:kid, guild:gid});
              }
          }
          
          const prevHeldIds = Object.entries(prevPlan).filter(([,g2])=>g2===gid).map(([k2])=>k2);
          const canReach = prevHeldIds.some(pk=>adj[pk]&&adj[pk].includes(kid));

          if(prevHeldIds.length === 0) {
             if(kObj.type !== 'lv1') {
                issues.push({day:d, kingdom:kid, guild:gid});
             } else {
                unplacedCaptures[gid]++;
                if(unplacedCaptures[gid] > 2) { 
                   issues.push({day:d, kingdom:kid, guild:gid});
                }
             }
          } else if(!canReach){
            issues.push({day:d, kingdom:kid, guild:gid});
          }
      }
    }
  }
  return issues;
}

function calcDec(srv){
  const mapData = getMapData(srv.mode, srv.mapKey);
  const validKids = new Set(mapData.kingdoms.map(k=>k.id)); // 🚨 Get list of valid towns
  const days=numDays(srv);
  const dec={},give={};
  
  for(const g of srv.guilds){dec[g.id]=Array.from({length:days},()=>[]);give[g.id]=Array.from({length:days},()=>[]);}
  for(let d=1;d<=days;d++){
    const prev=srv.plan[d-1]||{};
    for(const[kid,gid]of Object.entries(srv.plan[d]||{})){
      if(!gid || !validKids.has(kid)) continue; // 🚨 Skip ghost towns
      
      const prevOwner=prev[kid]||'';
      if(prevOwner!==gid){
        if(dec[gid])dec[gid][d-1].push(kid);
        if(prevOwner&&give[prevOwner])give[prevOwner][d-1].push(kid);
      }
    }
  }
  return{dec,give};
}

function validateWipes(srv){
  const days = numDays(srv);
  const mapData = getMapData(srv.mode, srv.mapKey);
  const wipes = [];
  
  for(let d=1; d<=days; d++){
    const prevPlan = srv.plan[d-1]||{};
    const currPlan = srv.plan[d]||{};
    
    const prevHeld = {};
    const currHeld = {};
    for(const g of srv.guilds){ prevHeld[g.id]=0; currHeld[g.id]=0; }
    
    for(const k of mapData.kingdoms){
      if(prevPlan[k.id]) prevHeld[prevPlan[k.id]]++;
      if(currPlan[k.id]) currHeld[currPlan[k.id]]++;
    }
    
    for(const g of srv.guilds){
      // A wipe is: Held last day, held 0 this day
      if(prevHeld[g.id] > 0 && currHeld[g.id] === 0){
        wipes.push({day: d, guild: g.id});
      }
    }
  }
  return wipes;
}
// ══════════════════════════════════════════════════════════════
//  RENDER HELPERS
// ══════════════════════════════════════════════════════════════

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function dateLabel(srv,d){
  if(!srv.startDate){
    return d===0 ? 'Day 0' : `Day ${d}`;
  }
  // Split to avoid UTC timezone shifting issues
  const [yy, mm, dd] = srv.startDate.split('-');
  const dt = new Date(yy, mm - 1, dd);
  dt.setDate(dt.getDate()+d-1);
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateStr = `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
  
  if(d===0){
    return `Day 0<br><small style="font-size:9px;color:var(--text3)">${days[dt.getDay()]} ${dateStr}</small>`;
  }
  return `Day ${d}<br><small style="font-size:9px;color:var(--text3)">${days[dt.getDay()]} ${dateStr}</small>`;
}

function dateLabelShort(srv,d){
  if(!srv.startDate) return d===0 ? 'D0' : `D${d}`;
  const [yy, mm, dd] = srv.startDate.split('-');
  const dt = new Date(yy, mm - 1, dd);
  dt.setDate(dt.getDate()+d-1);
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateStr = `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
  return d===0 ? `D0 ${days[dt.getDay()]} ${dateStr}` : `D${d} ${days[dt.getDay()]} ${dateStr}`;
}

// ══════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════

function renderTabs(){
  const bar=document.getElementById('tabs-bar');
  bar.innerHTML='';
  for(const s of servers){
    const b=document.createElement('button');
    b.className='tab-btn'+(s.id===activeId?' active':'');
    b.dataset.srvId=s.id;
    b.innerHTML=`<span class="tab-label" onclick="switchSrv('${s.id}')">${esc(s.name)}</span><span class="tab-close" onclick="removeSrv('${s.id}')">✕</span>`;
    
    // Desktop Right-Click
    b.addEventListener('contextmenu', e=>{ e.preventDefault(); openTabCtx(e, s.id); });
    
    // Mobile Long-Press (500ms)
    let pressTimer, longPressed = false;
    b.addEventListener('touchstart', e => {
      longPressed = false;
      pressTimer = setTimeout(() => { longPressed = true; openTabCtx(e, s.id); }, 500);
    }, {passive: true});
    b.addEventListener('touchend', e => {
      clearTimeout(pressTimer);
      // If the long-press opened the menu, swallow the click that follows the lift,
      // otherwise the document click-handler closes the menu instantly.
      if (longPressed && e.cancelable) e.preventDefault();
    }, {passive: false});
    b.addEventListener('touchmove', () => clearTimeout(pressTimer));
    b.addEventListener('touchcancel', () => clearTimeout(pressTimer));

    bar.appendChild(b);
  }
  const a=document.createElement('button');
  a.className='add-tab-btn';a.textContent='+ Add Server';a.onclick=openAdd;
  bar.appendChild(a);
}

// ── TAB CONTEXT MENU ─────────────────────────────────────────────────────────

let _ctxSrvId = null;

function openTabCtx(e, srvId){
  _ctxSrvId = srvId;
  if(activeId !== srvId){ switchSrv(srvId); }
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

function ctxRename(){
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

function ctxDuplicate(){
  const src = getSrv(_ctxSrvId); closeTabCtx();
  if(!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id   = 's' + Date.now() + '_' + Math.random().toString(36).slice(2);
  copy.name = src.name + ' (copy)';
  const idx = servers.findIndex(s => s.id === src.id);
  servers.splice(idx + 1, 0, copy);
  activeId = copy.id;
  save(); renderTabs(); renderAll();
}

function ctxDelete(){
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

function renderAll(){
  const srv=activeSrv();
  const mc=document.getElementById('main-content');
  if(!srv){mc.innerHTML='<div style="color:var(--text2);text-align:center;padding:60px 0;font-size:13px;">No servers yet. Click <strong style="color:var(--accent2)">+ Add Server</strong> to get started.</div>';return;}
  const days=numDays(srv);
  const mapData=getMapData(srv.mode,srv.mapKey);
  const scores=calcScores(srv);
  const occ=calcOcc(srv);
  const issues=validateAdj(srv);
  const wipes = validateWipes(srv);
  const{dec,give}=calcDec(srv);
  const totalPts=mapData.kingdoms.reduce((s,k)=>s+kPts(k.type),0)*days;
  const totalBase=srv.guilds.reduce((s,g)=>s+(parseInt(g.basePoints||0,10)||0),0);
  const targets=getPerfectTargets(srv, mapData);

  // Remember scroll positions so editing a cell doesn't snap the grid back to the left
  const scrollSel = '.tbl-wrap, .guild-list';
  const hScroll = [...mc.querySelectorAll(scrollSel)].map(w => w.scrollLeft);
  const pageY = window.scrollY;

  mc.innerHTML=`
    ${renderSettings(srv)}
    ${renderGuilds(srv)}
    ${renderStatus(srv,issues,wipes)}
    
    <!-- WRAPPER 1: The Grid -->
    <div id="capture-grid" style="background:var(--bg); padding:2px; border-radius:16px;">
      ${renderGrid(srv,days,mapData,issues,wipes)}
    </div>

    <!-- WRAPPER 2: The Stats -->
    <div id="capture-stats" style="background:var(--bg); padding:2px; border-radius:16px; margin-top:20px;">
      ${renderScores(srv,scores,targets)}
      ${renderOcc(srv,occ)}
      ${renderDecTable(srv,days,dec,give)}
    </div>
    
    ${renderMsgs(srv,days,dec,give)}
  `;
  mc.querySelectorAll(scrollSel).forEach((w,i) => { w.scrollLeft = hScroll[i] || 0; });
  window.scrollTo(0, pageY);

  // Dynamically set pts-row sticky offset to match the actual first header row height
  requestAnimationFrame(()=>{
    const firstTh = document.querySelector('table.ptbl thead tr:first-child th');
    const ptsRow  = document.querySelector('table.ptbl tr.pts-row');
    if(firstTh && ptsRow){
      const h = firstTh.getBoundingClientRect().height;
      ptsRow.querySelectorAll('th').forEach(th => th.style.top = h + 'px');
    }
  });
}

function renderSettings(srv){
  const maps=getMapList(srv.mode);
  const days=numDays(srv);
  return `<div class="section">
    <div class="sec-title">Server Settings</div>
    <div class="row">
      <div class="fg"><label>Server Name</label>
        <input type="text" value="${esc(srv.name)}" onchange="updName(this.value)" style="width:130px"></div>
      <div class="fg"><label>Mode</label>
        <select onchange="updMode(this.value)">
          <option value="ragnarok"${srv.mode==='ragnarok'?' selected':''}>Ragnarok</option>
          <option value="goc"${srv.mode==='goc'?' selected':''}>Game of Claws</option>
        </select></div>
      <div class="fg"><label>Map</label>
        <select onchange="updMap(this.value)">
          ${maps.map(m=>`<option value="${m.key}"${srv.mapKey===m.key?' selected':''}>${m.name}</option>`).join('')}
        </select></div>
      <div class="fg"><label>Start Date</label>
        <input type="date" value="${srv.startDate||''}" onchange="updStart(this.value)" style="width:130px"></div>
      <div class="fg"><label>End Date</label>
        <input type="date" value="${srv.endDate||''}" onchange="updEnd(this.value)" style="width:130px"></div>
      <div class="fg"><label>&nbsp;</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn" onclick="clearPlan()">Clear Plan</button>
          <button class="btn-accent" style="background:#6bffb4;color:#0a1a14;box-shadow:0 4px 12px rgba(107,255,180,0.2)" onclick="openImport()">📥 Import</button>
          <button class="btn-accent" style="background:#ffb86b;color:#1a1105;box-shadow:0 4px 12px rgba(255,184,107,0.2)" onclick="exportServer()">📤 Export Server</button>
          <button class="btn-accent" style="background:#ff6b9d;color:#1a050d;box-shadow:0 4px 12px rgba(255,107,157,0.2)" onclick="takeScreenshots()">📸 Screenshots</button>
          <button id="opt-btn" class="btn-gold" onclick="autoOptimize()">⚡ Auto-Optimize</button>
          ${srv.undoPlan ? `<button class="btn-accent" onclick="undoOptimize()" style="border-color:var(--gold);color:var(--gold2)">↩ Undo Optimize</button>` : ''}
          <button class="btn-accent" id="btn-share-cloud" style="background:#6baff5;color:#0a1a14;box-shadow:0 4px 12px rgba(107,175,245,0.2)" onclick="publishToCloud()">🔗 Save to Cloud</button>
          <button class="btn-accent" id="btn-sync-cloud" style="background:#b886ee;color:#0a1a14;box-shadow:0 4px 12px rgba(184,134,238,0.2)" onclick="syncFromCloud()">🔄 Sync from Cloud</button>
        </div></div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:var(--text3)">
      ${days} days planned · ${getMapData(srv.mode,srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
    </div>
  </div>`;
}

function renderGuilds(srv){
  const sortedGuilds = [...srv.guilds].sort((a, b) => 
    (parseInt(b.basePoints || 0, 10)) - (parseInt(a.basePoints || 0, 10))
  );

  return `<div class="section">
    <div class="sec-title">Guilds</div>
    <div class="guild-list" id="guild-list">
      ${sortedGuilds.map((g,i)=>`
        <div class="guild-row">
          <div class="guild-dot" style="background:${g.color}"></div>
          
          <input class="guild-name-inp" data-guild-id="${g.id}" data-guild-field="name" value="${esc(g.name)}" placeholder="Guild name"
            oninput="updGuildName('${g.id}',this.value)" style="flex:1;">
            
          ${srv.mode === 'ragnarok' ? `
            <input type="checkbox" id="exc_${g.id}" class="guild-small-check" ${g.isExcluded ? 'checked' : ''} 
              onchange="updGuildExcluded('${g.id}', this.checked)">
            <label for="exc_${g.id}" class="guild-small-label"
             title="Exclude from map (keeps Day 0 holdings, does not declare, ignores point balancing)">Exclude Guild</label>
          ` : `
            <input type="checkbox" id="sm_${g.id}" class="guild-small-check" ${g.isSmall ? 'checked' : ''} 
              onchange="updGuildSmall('${g.id}', this.checked)">
            <label for="sm_${g.id}" class="guild-small-label" title="Check this if this is a smaller guild. The optimizer will limit them to 1 declare and deprioritize their point totals, while still giving them fair Castle/Dorm time.">Small Guild</label>
          `}

          <input type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="points" value="${esc(g.basePoints||0)}" style="width:50px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;margin-left:12px;"
            onchange="updGuildPoints('${g.id}',this.value)" title="Current points">
            
          <input type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv3" value="${esc(g.baseLv3||0)}" style="width:40px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;margin-left:8px;"
            onchange="updGuildLv3('${g.id}',this.value)" title="Previous Lv3 Days">
            
          <input type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv2" value="${esc(g.baseLv2||0)}" style="width:40px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;margin-left:8px;"
            onchange="updGuildLv2('${g.id}',this.value)" title="Previous Dorm Days">
            
          <input type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv1" value="${esc(g.baseLv1||0)}" style="width:40px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;margin-left:8px;"
            onchange="updGuildLv1('${g.id}',this.value)" title="Previous Lv1 Town Days">

          <span style="font-size:9px;color:var(--text2);margin-left:4px">Pts/L3/L2/L1</span>

          ${srv.guilds.length>2?`<span class="guild-remove" style="margin-left:auto;" onclick="removeGuild('${g.id}')">✕</span>`:''}
        </div>`).join('')}
    </div>
    <div style="margin-top:8px;display:flex;gap:6px">
      <button class="btn-accent" onclick="addGuild()">+ Add Guild</button>
    </div>
  </div>`;
}

function renderScores(srv, scores, targets) {
  const days = numDays(srv);
  
  // Calculate the target range for the header (e.g., "47-48")
  const isGoC = srv.mode === 'goc';
  const active = srv.guilds.filter(g => isGoC || !g.isExcluded);
  const targetVals = active.map(g => targets[g.id] ? targets[g.id].grandPts : 0);
  
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
  
  return `<div class="section">
    <div class="sec-title">Final Scores <span style="font-size:9px;color:var(--text3);font-family:var(--font-body);font-weight:400;letter-spacing:0"> Even target: ${targetHeader} pts</span></div>
    <div class="score-grid">
      ${final.map(({g, pts}) => {
        
        // Extract the mathematically perfect target for this specific guild
        const t = targets[g.id] ? targets[g.id].grandPts : 0;
        const diff = pts - t;
        
        const cls = Math.abs(diff) <= 1 ? 'diff-ok' : Math.abs(diff) <= 3 ? 'diff-warn' : 'diff-bad';
        const pct = Math.round(pts / maxPts * 100);
        
        return `<div class="score-card">
          <div class="sc-label"><div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}</div>
          <div class="sc-val" style="color:${g.color}">${pts}</div>
          <div class="sc-sub">target: ${t}</div>
          <div class="sc-diff ${cls}">${diff >= 0 ? '+' : ''}${diff}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${g.color}"></div></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderStatus(srv, issues, wipes){
  const days=numDays(srv);
  const baseMaxDecl=srv.mode==='goc'?2:3;
  const byDay=Array.from({length:days},(_,i)=>issues.filter(x=>x.day===i+1));
  const decViol=[];
  const {dec}=calcDec(srv);
  
  for(const g of srv.guilds){
    const maxDecl = g.isSmall ? 1 : baseMaxDecl;
    for(let d=0;d<days;d++){
      if(dec[g.id][d].length>maxDecl) decViol.push({g,d,c:dec[g.id][d].length});
    }
  }
  
  // Combine issues and wipes for the display text
  const issueText = [
    ...issues.map(i => {
      const g = srv.guilds.find(x => x.id === i.guild);
      return `Day ${i.day}: ${g ? esc(g.name) : '?'} → ${i.kingdom}`;
    }),
    ...wipes.map(w => {
      const g = srv.guilds.find(x => x.id === w.guild);
      return `Day ${w.day}: ${g ? esc(g.name) : '?'} Wiped`;
    })
  ].join(' · ');

  return `<div class="section">
    <div class="sec-title">Status</div>
    <div class="pills">
      ${byDay.map((_,i)=>{
        const ok=byDay[i].length===0;
        return `<div class="pill ${ok?'pill-ok':'pill-fail'}">
          <div class="pdot" style="background:${ok?'var(--green)':'var(--red)'}"></div>
          D${i+1}${!ok?` (${byDay[i].length})`:''}
        </div>`;
      }).join('')}
      <div class="pill ${decViol.length?'pill-fail':'pill-ok'}">
        <div class="pdot" style="background:${decViol.length?'var(--red)':'var(--green)'}"></div>
        Valid Declares
      </div>
      <div class="pill ${wipes.length ? 'pill-fail' : 'pill-ok'}">
        <div class="pdot" style="background:${wipes.length ? 'var(--red)' : 'var(--green)'}"></div>
        ${wipes.length ? `No Map Wipes (${wipes.length})` : 'No Map Wipes'}
      </div>
    </div>
    ${issueText ? `<div style="font-size:10px;color:var(--red);margin-top:4px">${issueText}</div>` : ''}
  </div>`;
}

function renderGrid(srv, days, mapData, issues, wipes) {
  const totalCols = numDisplayDays(srv);
  const issSet = new Set(issues.map(i => `${i.day}_${i.kingdom}`));
  const lv3 = mapData.kingdoms.filter(k => k.type === 'lv3');
  const lv2 = mapData.kingdoms.filter(k => k.type === 'lv2');
  const lv1 = mapData.kingdoms.filter(k => k.type === 'lv1');
  const ordered = [...lv3, ...lv2, ...lv1];
  const scores = calcScores(srv);

  return `<div class="section">
    <div class="sec-title">Planning Grid</div>
    <div class="tbl-wrap">
    <table class="ptbl">
      <thead>
        <tr>
          <th class="kadj">Adjacent Towns</th>
          <th class="kname">Town</th>
          <th class="ktype">Type</th>
          ${Array.from({length:totalCols},(_,d)=>`<th>
            ${dateLabel(srv,d)}
            <div style="margin-top:6px;"><button class="clear-day-btn" onclick="clearDay(${d})" style="background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:9px;padding:2px 6px;border-radius:4px;cursor:pointer;">Clear</button></div>
          </th>`).join('')}
        </tr>
        <tr class="pts-row">
          <th class="kadj" style="background:var(--bg, #191425); border-bottom:1px solid var(--border);"></th>
          <th class="kname" style="position:sticky; left:0; z-index:40; background:var(--bg, #191425); padding:4px 10px; font-size:10px; color:var(--text2); text-align:right; border-bottom:1px solid var(--border);">Running pts →</th>
          <th class="ktype" style="background:var(--bg, #191425); border-bottom:1px solid var(--border);"></th>
          ${Array.from({length:totalCols},(_,d)=>{
            return `<th style="padding:4px 4px 8px;vertical-align:top;border-bottom:1px solid var(--border);">
              ${srv.guilds.map(g => {
                let pts = 0;
                if (d === 0) {
                    pts = parseInt(g.basePoints || 0, 10);
                } else if (scores.cumul[g.id]) {
                    pts = scores.cumul[g.id][d-1] || 0;
                }
                return `<div style="color:${g.color};font-size:9px;white-space:nowrap;line-height:1.4;margin-bottom:1px;">${esc(g.name.length>8?g.name.slice(0,7)+'…':g.name)}:${pts}</div>`;
              }).join('')}
            </th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        ${ordered.map(k => {
          const nameColor = k.type==='lv3'?'var(--lv3)':k.type==='lv2'?'var(--lv2)':'var(--lv1)';
          return `<tr>
            <td class="kadj">${esc(k.adj.join(', ') || '—')}</td>
            <td class="kname" style="color:${nameColor}">${esc(k.id)}</td>
            <td class="ktype"><span class="badge badge-${k.type}">${k.type.toUpperCase()}</span></td>
            ${Array.from({length:totalCols},(_,d)=>{
              const eligible = (d === 0) ? srv.guilds : getEligibleGuilds(srv, k.id, d);
              const gOpts = [['', '—'], ...eligible.map(g => [g.id, g.name])];
              const gid = (srv.plan[d] || {})[k.id] || '';
              const g = srv.guilds.find(x => x.id === gid);
              const err = issSet.has(`${d}_${k.id}`);
              
              return `<td style="background:${g ? g.color+'18' : ''};" ${err ? 'class="cell-err"' : ''}>
                <select class="csel" data-k="${k.id}" data-d="${d}" style="${g ? 'color:'+g.color : ''}" onchange="onCell(event)">
                  ${gOpts.map(([v,n]) => `<option value="${v}" ${v===gid ? 'selected' : ''}>${esc(n)}</option>`).join('')}
                </select>
              </td>`;
            }).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
  </div>`;
}

function renderOcc(srv,occ){
  return `<div class="section">
    <div class="sec-title">Total Occupation (all days combined)</div>
    <div class="tbl-wrap"><table class="otbl">
      <thead><tr>
        <th style="text-align:left;padding-left:10px">Guild</th>
        <th style="color:var(--lv1)">Lv1 Towns</th>
        <th style="color:var(--lv2)">Lv2 Dorms</th>
        <th style="color:var(--lv3)">Lv3 Darkwick</th>
        <th>Total</th>
      </tr></thead>
      <tbody>
        ${srv.guilds.map(g=>`<tr>
          <td style="text-align:left;padding-left:10px">
            <div style="display:flex;align-items:center;gap:5px">
              <div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}
            </div>
          </td>
          <td style="color:var(--lv1)">${occ[g.id].lv1}</td>
          <td style="color:var(--lv2)">${occ[g.id].lv2}</td>
          <td style="color:var(--lv3)">${occ[g.id].lv3}</td>
          <td style="font-weight:600">${occ[g.id].total}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function renderDecTable(srv,days,dec,give){
  const baseMaxDecl=srv.mode==='goc'?2:3;
  return `<div class="section">
    <div class="sec-title">Declares & Giveaways</div>
    <div class="tbl-wrap"><table class="dtbl">
      <thead><tr>
        <th>Guild</th>
        ${Array.from({length:days},(_,d)=>`<th>${dateLabelShort(srv,d+1)}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${srv.guilds.map(g=>{
          const maxDecl = g.isSmall ? 1 : baseMaxDecl;
          return `<tr>
          <td style="display:flex;align-items:center;gap:5px;font-weight:500;white-space:nowrap">
            <div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}
            ${g.isSmall ? `<span style="font-size:9px;color:var(--text3);margin-left:4px">(Max 1)</span>` : ''}
          </td>
          ${Array.from({length:days},(_,d)=>{
            const cnt=dec[g.id][d].length;
            const cls=cnt>maxDecl?'dc-bad':cnt>0?'dc-warn':'dc-ok';
            return `<td>
              <div class="${cls}" style="font-weight:600">${cnt}▲</div>
              <div style="font-size:9px;color:var(--text2)">${dec[g.id][d].join(', ')||'—'}</div>
              ${give[g.id][d].length?`<div style="font-size:9px;color:var(--text3)">↓${give[g.id][d].join(',')}</div>`:''}
            </td>`;
          }).join('')}
        </tr>`}).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function renderMsgs(srv,days,dec,give){
  const mapData = getMapData(srv.mode, srv.mapKey);
  const validKids = new Set(mapData.kingdoms.map(k=>k.id));
  
  const kTypeMap = {};
  for (const k of mapData.kingdoms) kTypeMap[k.id] = k.type;
  
  // Base tier weights
  const typeScore = { 'lv3': 30, 'lv2': 20, 'lv1': 10 };

  const tDec = '- Declares';
  const tGive = '- Giveaways';
  const tHold = '- Place def on';
  const tNone = 'none';

  const msgs=Array.from({length:days},(_,d)=>{
    let s=`## ${dateLabelShort(srv,d+1).replace('<br>','')}\n`;
    
    for(const g of srv.guilds){
      const declares = dec[g.id][d] || [];
      const giveaways = give[g.id][d] || [];
      
      const held = Object.entries(srv.plan[d+1]||{})
        .filter(([k,gid]) => gid===g.id && validKids.has(k))
        .map(([k]) => k)
        .filter(k => !declares.includes(k));
        
      let defText = tNone;
      
      const candidates = [];
      for (const k of held) candidates.push({ id: k, type: kTypeMap[k], isHeld: true });
      for (const k of declares) candidates.push({ id: k, type: kTypeMap[k], isHeld: false });

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const scoreA = (typeScore[a.type] || 0) + (a.isHeld ? 100 : 0);
          const scoreB = (typeScore[b.type] || 0) + (b.isHeld ? 100 : 0);
          return scoreB - scoreA;
        });

        const best = candidates[0];
        if (best.isHeld) {
          defText = best.id;
        } else {
          // If they have no held towns, check if they are giving anything away today
          if (giveaways.length > 0) {
            defText = `${best.id} or place smallest team on ${giveaways.join(', ')} if not available for battle phase`;
          } else {
            defText = `${best.id} or place smallest team if not available for battle phase`;
          }
        }
      }
        
      const safeName = g.name.replace(/([\\*_~`])/g, '\\$1');
        
      s+=`### ${safeName}\n${tDec}: ${declares.join(', ')||tNone}\n${tGive}: ${giveaways.join(', ')||tNone}\n${tHold} ${defText}\n`;
    }
    return s.trim();
  });
  
  return `<div class="section">
    <div class="sec-title" style="display:flex; justify-content:space-between; align-items:center;">
      <div>Daily Messages <span style="font-size:9px;color:var(--text3);font-family:var(--font-body);letter-spacing:0;font-weight:400"> — click to copy</span></div>
    </div>
    
    <div class="msg-grid">
      ${msgs.map((m,d)=>`<div class="msg-card" onclick="cpyMsg(this,${d})" data-msg="${esc(m)}">
        <div style="font-size:10px;color:var(--accent2);margin-bottom:4px;font-weight:600">
          ${dateLabelShort(srv,d+1).replace('<br>',' ')} <span id="cpd-${d}" style="color:var(--green);font-size:9px"></span>
        </div>
        <div style="font-size:10px;line-height:1.6;white-space:pre-wrap">${esc(m)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
//  EVENT HANDLERS — settings
// ══════════════════════════════════════════════════════════════

function updName(v){const s=activeSrv();if(!s)return;s.name=v;save();renderTabs();}
function updMode(v){
  const s=activeSrv();if(!s)return;s.mode=v;
  const maps=getMapList(v);s.mapKey=maps[0].key;
  // reset guilds to mode default
  const n=v==='ragnarok'?4:8;
  while(s.guilds.length<n)s.guilds.push({id:'g'+Date.now()+'_'+s.guilds.length,name:`Guild ${s.guilds.length+1}`,color:GUILD_COLORS[s.guilds.length%GUILD_COLORS.length]});
  while(s.guilds.length>n)s.guilds.pop();
  resetPlan(s);save();renderAll();
}
function updMap(v){const s=activeSrv();if(!s)return;s.mapKey=v;resetPlan(s);save();renderAll();}
function updStart(v){const s=activeSrv();if(!s)return;s.startDate=v;save();renderAll();}
function updEnd(v){const s=activeSrv();if(!s)return;s.endDate=v;save();renderAll();}
function updNotes(v){const s=activeSrv();if(!s)return;s.notes=v;save();}

function resetPlan(srv){
  const mapData=getMapData(srv.mode,srv.mapKey);
  srv.plan={};
  for(let d=0;d<14;d++){srv.plan[d]={};for(const k of mapData.kingdoms)srv.plan[d][k.id]='';}
}

function clearPlan(){
  const s=activeSrv();
  if(!s) return;
  const mapData=getMapData(s.mode,s.mapKey);
  const day0 = {...(s.plan[0]||{})};
  s.plan = {};
  for(let d=0;d<14;d++){
    s.plan[d]={};
    for(const k of mapData.kingdoms){
      s.plan[d][k.id] = d===0 ? (day0[k.id]||'') : '';
    }
  }
  s.manualEdits = {};
  delete s.undoPlan;
  save();
  renderAll();
}

function updGuildSmall(gid, isSmall){
  const s=activeSrv(); if(!s) return;
  const g=s.guilds.find(x=>x.id===gid); if(!g) return;
  g.isSmall = isSmall; // save the boolean
  save(); 
  // No need to renderAll() here since it's just a checkbox toggle
}

function updGuildName(gid,name){
  const s=activeSrv();if(!s)return;
  const g=s.guilds.find(x=>x.id===gid);if(!g)return;
  const active=document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId===gid;
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.name=name;
  save();
  renderAll();
  if(restore){
    const input=document.querySelector(`input[data-guild-id="${gid}"]`);
    if(input){input.focus();if(selStart!==null&&selEnd!==null)input.setSelectionRange(selStart,selEnd);}  
  }
}
function updGuildPoints(gid,value){
  const s=activeSrv();if(!s)return;
  const g=s.guilds.find(x=>x.id===gid);
  if(!g) return;
  const active=document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId===gid && active.dataset.guildField==='points';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  const pts=Math.max(0,parseInt(value,10)||0);
  g.basePoints=pts;
  save();
  renderAll();
  if(restore){
    const input=document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="points"]`);
    if(input){input.focus();if(selStart!==null&&selEnd!==null)input.setSelectionRange(selStart,selEnd);}  
  }
}
function updGuildLv1(gid,value){
  const s=activeSrv();if(!s)return;
  const g=s.guilds.find(x=>x.id===gid);if(!g) return;
  g.baseLv1=Math.max(0,parseInt(value,10)||0);
  save(); renderAll();
}
function addGuild(){
  const s=activeSrv();if(!s||s.guilds.length>=16)return;
  s.guilds.push({id:'g'+Date.now(),name:`Guild ${s.guilds.length+1}`,color:GUILD_COLORS[s.guilds.length%GUILD_COLORS.length],basePoints:0});
  save();renderAll();
}
function removeGuild(gid){
  const s=activeSrv();if(!s||s.guilds.length<=2)return;
  s.guilds=s.guilds.filter(g=>g.id!==gid);
  for(let d=0;d<14;d++)for(const k in s.plan[d])if(s.plan[d][k]===gid)s.plan[d][k]='';
  save();renderAll();
}

function openImport(){
  document.getElementById('modal-import').classList.add('open');
  // Reset state
  document.getElementById('import-dropzone').style.display = 'block';
  document.getElementById('import-text').value = '';
  document.getElementById('import-file').value = '';
}

function handleDragOver(e){
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.add('drag-over');
}

function handleDragLeave(e){
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.remove('drag-over');
}

function handleDrop(e){
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) readImportFile(file);
}

function handleFileSelect(e){
  const file = e.target.files[0];
  if(file) readImportFile(file);
}

function readImportFile(file){
  if(!file.name.endsWith('.json')){
    alert('Please select a .json file');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e){
    const text = e.target.result;
    document.getElementById('import-text').value = text;
    // Auto-switch to guilds mode if it looks like a server export
    try {
      const parsed = JSON.parse(text);
      if(parsed.version === 1 && parsed.server){
        document.getElementById('import-mode').value = 'guilds';
        document.getElementById('import-day-container').style.opacity = '0.3';
        document.getElementById('import-day').disabled = true;
      }
    } catch(err) { /* not JSON, keep current mode */ }
  };
  reader.readAsText(file);
}

function exportServer(){
  const srv = activeSrv();
  if(!srv) return;

  // Create a clean export object
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    server: {
      name: srv.name,
      mode: srv.mode,
      mapKey: srv.mapKey,
      startDate: srv.startDate,
      endDate: srv.endDate,
      guilds: srv.guilds.map(g => ({
        id: g.id, // <-- ADD THIS LINE
        name: g.name,
        color: g.color,
        basePoints: g.basePoints || 0,
        baseLv3: g.baseLv3 || g.baseLv3s || 0,
        baseLv2: g.baseLv2 || g.baseLv2s || 0,
        baseLv1: g.baseLv1 || 0,
        isSmall: g.isSmall || false
      })),
      plan: srv.plan,
      notes: srv.notes || '',
    }
  };

  const json = JSON.stringify(exportData, null, 2);

  // `event` only exists during the click, so grab the button now (not inside .then)
  const btn = (typeof event !== 'undefined' && event && event.target) ? event.target.closest('button') : null;

  // Copy to clipboard
  Promise.resolve().then(() => navigator.clipboard.writeText(json)).then(() => {
    // Visual feedback
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = 'var(--green-glow)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  }).catch(() => {
    // Fallback: download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${srv.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ══════════════════════════════════════════════════════════════
//  IMPORT PROCESSOR
// ══════════════════════════════════════════════════════════════
function processImport(){
  const srv = activeSrv();
  const textarea = document.getElementById('import-text');
  const text = textarea.value.trim();
  const mode = document.getElementById('import-mode') ? document.getElementById('import-mode').value : 'day';
  const day = parseInt(document.getElementById('import-day').value, 10);

  if(!text) { alert("Please paste data first!"); return; }

  // Try to parse as exported JSON first
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch(e) { /* not JSON, continue to line-based parsing */ }

  if(parsed && parsed.version === 1 && parsed.server) {
    // EXPORTED SERVER FORMAT - full server restore
    const imp = parsed.server;

    // Restore guilds (using the exported ID so the map plan connects properly)
    srv.guilds = imp.guilds.map((g, i) => {
      return {
        id: g.id || 'g_' + Date.now() + '_' + i, // <-- GRABS EXPORTED ID
        name: g.name,
        color: g.color || GUILD_COLORS[i % GUILD_COLORS.length],
        basePoints: g.basePoints || 0,
        baseLv3: g.baseLv3 || 0,
        baseLv2: g.baseLv2 || 0,
        baseLv1: g.baseLv1 || 0,
        isSmall: g.isSmall || false
      };
    });

    // Restore server settings
    srv.name = imp.name || srv.name;
    srv.mode = imp.mode || srv.mode;
    srv.mapKey = imp.mapKey || srv.mapKey;
    srv.startDate = imp.startDate || srv.startDate;
    srv.endDate = imp.endDate || srv.endDate;
    srv.notes = imp.notes || '';

    // Restore plan (guild IDs will match since we preserved them by name)
    srv.plan = imp.plan || {};

    alert(`Server "${srv.name}" imported successfully! ${srv.guilds.length} guilds, ${Object.keys(srv.plan).length} days planned.`);

  } else if (mode === 'guilds') {
    // Extract unique, valid names
    const uniqueNames = [...new Set(lines.map(line => line.trim().replace(/^["']|["']$/g, ''))
      .filter(name => name && name.toLowerCase() !== 'none' && name !== '—'))];
    
    const colors = ['#FF5E7E','#FF9F5E','#FFD15E','#5EFEFF','#5E8FFF','#B85EFF','#FF5EEB','#5EFF8B','#FFFFFF','#A0A0A0'];
    
    // Completely replace the guild list
    srv.guilds = uniqueNames.map((name, index) => {
      return {
        id: 'g_' + Date.now() + index, // Generate fresh IDs
        name: name,
        color: colors[index % colors.length],
        basePoints: 0,
        baseLv3s: 0,
        baseLv2s: 0
      };
    });
    
    // Wipe the existing map plan since old guild IDs no longer exist
    srv.plan = {};
    
    alert(`Replaced roster with ${uniqueNames.length} guilds! The map plan has been reset for the new roster.`);
    
  } else {
    // MODE: IMPORT DAILY MAP DATA
    const mapData = getMapData(srv.mode, srv.mapKey);
    const sortedKingdoms = [...mapData.kingdoms].sort((a,b)=>{
        const pts={'lv3':3,'lv2':2,'lv1':1};
        return pts[b.type]-pts[a.type];
    });
    
    lines.forEach((line, index) => {
      if(index >= sortedKingdoms.length) return; 
      
      const guildName = line.trim().replace(/^["']|["']$/g, '');
      if(!guildName || guildName.toLowerCase() === 'none' || guildName === '—') return;
      
      const guild = srv.guilds.find(g => g.name.toLowerCase() === guildName.toLowerCase());
      if(guild) {
        if(!srv.plan[day]) srv.plan[day] = {};
        srv.plan[day][sortedKingdoms[index].id] = guild.id;
      }
    });
  }
  
  save();
  renderAll();
  
  textarea.value = '';
  document.getElementById('modal-import').classList.remove('open');
}

function onCell(evt){
  const s=activeSrv();if(!s)return;
  const kid=evt.target.dataset.k,day=+evt.target.dataset.d,gid=evt.target.value;
  if(!s.plan[day])s.plan[day]={};
  s.plan[day][kid]=gid;
  save();renderAll();
}

function cpyMsg(el,d){
  navigator.clipboard.writeText(el.dataset.msg).then(()=>{
    const h=document.getElementById('cpd-'+d);
    if(h){h.textContent='✓ Copied';setTimeout(()=>{h.textContent='';},2000);}
  }).catch(()=>{});
}

function clearDay(d){
  const s = activeSrv(); if(!s) return;
  const mapData = getMapData(s.mode,s.mapKey);
  if(!s.plan[d]) s.plan[d] = {};
  for(const k of mapData.kingdoms) s.plan[d][k.id] = '';
  // Clear manual edit locks for this day
  if(s.manualEdits){
    for(const k of mapData.kingdoms) delete s.manualEdits[`${d}_${k.id}`];
  }
  save();
  renderAll();
}

function undoOptimize(){
  const s=activeSrv(); if(!s||!s.undoPlan) return;
  s.plan = JSON.parse(JSON.stringify(s.undoPlan));
  delete s.undoPlan;
  save(); renderAll();
}

function updGuildLv3(gid,value){
  const g=s.guilds.find(x=>x.id===gid);if(!g) return;
  const active=document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId===gid && active.dataset.guildField==='lv3';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.baseLv3=Math.max(0,parseInt(value,10)||0);
  save(); renderAll();
  if(restore){
    const input=document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="lv3"]`);
    if(input){input.focus();if(selStart!==null&&selEnd!==null)input.setSelectionRange(selStart,selEnd);}  
  }
}

function updGuildLv2(gid,value){
  const s=activeSrv();if(!s)return;
  const g=s.guilds.find(x=>x.id===gid);if(!g) return;
  const active=document.activeElement;
  const restore = active && active.dataset && active.dataset.guildId===gid && active.dataset.guildField==='lv2';
  const selStart = restore ? active.selectionStart : null;
  const selEnd = restore ? active.selectionEnd : null;
  g.baseLv2=Math.max(0,parseInt(value,10)||0);
  save(); renderAll();
  if(restore){
    const input=document.querySelector(`input[data-guild-id="${gid}"][data-guild-field="lv2"]`);
    if(input){input.focus();if(selStart!==null&&selEnd!==null)input.setSelectionRange(selStart,selEnd);}  
  }
}

// ══════════════════════════════════════════════════════════════
//  AUTO OPTIMIZE
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
//  AUTO OPTIMIZE (ITERATIVE LEARNING)
// ══════════════════════════════════════════════════════════════

function getEligibleGuilds(srv, kId, d) {
  const prevPlan = srv.plan[d - 1] || {};
  const adjMapData = adjMap(srv.mode, srv.mapKey);
  const kObj = getMapData(srv.mode, srv.mapKey).kingdoms.find(k => k.id === kId);
  
  const occupiedGuildIds = new Set(Object.values(prevPlan).filter(gid => gid !== ''));
  const unplacedGuilds = srv.guilds.filter(g => !occupiedGuildIds.has(g.id));

  const currentOwner = prevPlan[kId];
  const adjKingdoms = adjMapData[kId] || [];
  const adjacentGuilds = [...new Set(adjKingdoms
    .map(adjK => prevPlan[adjK])
    .filter(g => g && g !== ''))];

  let eligibleIds;
  if (kObj && kObj.type === 'lv1') {
      eligibleIds = new Set([
          currentOwner, 
          ...adjacentGuilds, 
          ...unplacedGuilds.map(g => g.id)
      ].filter(g => g && g !== ''));
  } else {
      eligibleIds = new Set([currentOwner, ...adjacentGuilds].filter(g => g && g !== ''));
  }

  // Always include the currently assigned guild so optimizer results always render,
  // and fall back to all guilds if nothing is eligible (e.g. early days, fresh plan)
  const currentAssigned = (srv.plan[d] || {})[kId];
  if(currentAssigned) eligibleIds.add(currentAssigned);
  
  const eligible = srv.guilds.filter(g => eligibleIds.has(g.id));
  return eligible.length > 0 ? eligible : srv.guilds;
}

// ══════════════════════════════════════════════════════════════
//  AUTO OPTIMIZE (HiGHS WebAssembly Solver)
// ══════════════════════════════════════════════════════════════

async function autoOptimize() {
  let sec = 0;
  let optTimer;
  const srv = activeSrv();
  if (!srv) return;

  const btn = document.getElementById('opt-btn'); // Use your actual button ID here
  let originalText = 'Auto Optimize'; // Fallback text
  
  if (btn) {
    originalText = btn.textContent; // Capture the original text before changing it
    btn.style.pointerEvents = 'none';
    btn.innerHTML = `Crunching Matrix... (0s)`;
    optTimer = setInterval(() => {
      sec++;
      btn.innerHTML = `Crunching Matrix... (${sec}s)`;
    }, 1000);
  }

  try {
    // 1. Snapshot for the undo button
    srv.undoPlan = JSON.parse(JSON.stringify(srv.plan));
    const mapData = getMapData(srv.mode, srv.mapKey);

    // 2. Generate the algebraic matrix and decoder
    console.time('Matrix Generation');
    const { milp, decode } = buildModel(srv, mapData);
    const matrixArrays = milp.toArrays();
    console.timeEnd('Matrix Generation');

    console.log(`Generated ${matrixArrays.numRows} constraints and ${matrixArrays.numCols} binary variables.`);

    // 3. Send to Web Worker to run the Wasm Branch-and-Bound algorithm
    console.time('Wasm Solve Time');
    const result = await runHighsSolver(matrixArrays);
    console.timeEnd('Wasm Solve Time');

    // 4. Decode the binary output array back into town assignments
    const binaryValues = result; // Worker now returns the Float64Array directly
    srv.plan = decode(binaryValues);
    
    save();
    renderAll();
    
    if (btn) { btn.textContent = '✓ Perfect Plan Found'; btn.style.color = 'var(--green)'; }

  } catch (err) {
    console.error("Optimizer crashed:", err);
    // Replace alert() with our new in-app toast
    showToast(err.message || "Solver encountered an error.", true);
    if (btn) { btn.textContent = '❌ Failed'; btn.style.color = 'var(--red)'; }
  } finally {
    // 🚨 GUARANTEE TIMER STOPS
    clearInterval(optTimer);
    
    if (btn) {
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto'; // Restore clickability 
        btn.style.color = '';
      }, 3000);
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SERVER MANAGEMENT
// ══════════════════════════════════════════════════════════════

function openAdd(){
  const t=new Date(),fmt=d=>d.toISOString().slice(0,10);
  document.getElementById('ns-name').value='';
  document.getElementById('ns-start').value=fmt(t);
  
  // Reset mode to Ragnarok default
  document.getElementById('ns-mode').value = 'ragnarok';
  onAddModalModeChange(); 
  
  document.getElementById('modal-add').classList.add('open');
}

function onAddModalModeChange(){
  const mode = document.getElementById('ns-mode').value;
  // Use the imported getMapList function
  const maps = getMapList(mode);
  
  document.getElementById('ns-map').innerHTML = maps.map(m=>`<option value="${m.key}">${m.name}</option>`).join('');
  onAddModalStartChange();
}

function onAddModalStartChange(){
  const mode  = document.getElementById('ns-mode').value;
  const start = document.getElementById('ns-start').value;
  if(!start) return;
  const eventDays = mode === 'goc' ? 13 : 6;
  const [yy, mm, dd] = start.split('-');
  const endDt = new Date(+yy, mm - 1, +dd);
  endDt.setDate(endDt.getDate() + eventDays - 1);
  document.getElementById('ns-end').value = endDt.toISOString().slice(0, 10);
}

function confirmAdd(){
  const name=document.getElementById('ns-name').value.trim()||'Server '+(servers.length+1);
  const mode=document.getElementById('ns-mode').value;
  const mapKey=document.getElementById('ns-map').value;
  const start=document.getElementById('ns-start').value;
  const end=document.getElementById('ns-end').value;
  const s=mkSrv(name,mode,mapKey,start,end);
  servers.push(s);
  activeId=s.id;
  closeModal('modal-add');
  save();
  renderTabs();
  renderAll();
}

function switchSrv(id){
  activeId=id;
  // Clear the URL parameter so users don't confuse local tabs with share links
  window.history.replaceState({}, document.title, window.location.pathname);
  save();
  renderTabs();
  renderAll();
}

let _deleteSrvId = null;

function removeSrv(id){
  const srv = getSrv(id);
  if(!srv) return;
  _deleteSrvId = id;
  document.getElementById('confirm-delete-msg').textContent = `Delete "${srv.name}"?`;
  document.getElementById('modal-confirm-delete').classList.add('open');
}

function confirmDeleteSrv(){
  closeModal('modal-confirm-delete');
  const id = _deleteSrvId; _deleteSrvId = null;
  if(!id) return;
  servers = servers.filter(s => s.id !== id);
  if(activeId === id) activeId = servers[0]?.id || null;
  save(); renderTabs(); renderAll();
}

function closeModal(id){document.getElementById(id).classList.remove('open');}

// ══════════════════════════════════════════════════════════════
//  PERSISTENCE
// ══════════════════════════════════════════════════════════════

function save(){
  try{
    localStorage.setItem('goc_v3',JSON.stringify({servers,activeId}));
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

function load(){
  try{
    const r=localStorage.getItem('goc_v3');
    if(r){const d=JSON.parse(r);servers=d.servers||[];activeId=d.activeId||null;
      if(!servers.find(x=>x.id===activeId))activeId=servers[0]?.id||null;}
  }catch(e){}
}

async function takeScreenshots() {
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '📸 Processing...';
  
  try {
    // Make sure web fonts are loaded so measured widths match rendered widths
    if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
    // Pins screenshot-only sizing (see style.css) so phone and desktop captures match
    document.documentElement.classList.add('capturing');

    const gridEl = document.getElementById('capture-grid');
    const statsEl = document.getElementById('capture-stats');
    const mainEl = document.getElementById('main-content');
    
    // 🚨 FIX 1: Scroll to the top-left to prevent iOS/Android coordinate shifting bugs
    const origScrollX = window.scrollX;
    const origScrollY = window.scrollY;
    window.scrollTo(0, 0);
    
    const html = document.documentElement;
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    const origMainMaxWidth = mainEl.style.maxWidth;

    // Remove any hidden overflows on the main page that might clip the canvas
    html.style.overflow = 'visible';
    document.body.style.overflow = 'visible';
    mainEl.style.maxWidth = 'none';

    function expandForCapture(el) {
      const originalStyles = [];
      const wraps = el.querySelectorAll('.tbl-wrap');
      wraps.forEach(wrap => {
        originalStyles.push({ el: wrap, prop: 'overflow', val: wrap.style.overflow });
        wrap.style.overflow = 'visible';
      });
      
      const stickyHeaders = el.querySelectorAll('th');
      stickyHeaders.forEach(th => {
        originalStyles.push({ el: th, prop: 'position', val: th.style.position });
        th.style.position = 'static';
      });

      // Sticky first columns (added for mobile scrolling) must be flat for the capture
      el.querySelectorAll('td.kname').forEach(td => {
        originalStyles.push({ el: td, prop: 'position', val: td.style.position });
        td.style.position = 'static';
      });
      el.querySelectorAll('td.kname, th.kname').forEach(c => {
        originalStyles.push({ el: c, prop: 'boxShadow', val: c.style.boxShadow });
        c.style.boxShadow = 'none';
      });

      const table = el.querySelector('table');
      if (table) {
        originalStyles.push({ el: table, prop: 'width', val: table.style.width });
        originalStyles.push({ el: table, prop: 'minWidth', val: table.style.minWidth });
        // 🚨 FIX 2: Force the table to use natural text width (no stretching, no squishing)
        table.style.width = 'max-content';
        table.style.minWidth = 'max-content';
      }

      originalStyles.push({ el: el, prop: 'width', val: el.style.width });
      originalStyles.push({ el: el, prop: 'maxWidth', val: el.style.maxWidth });
      originalStyles.push({ el: el, prop: 'display', val: el.style.display });
      
      // 🚨 FIX 3: Shrink-wrap the container exactly to the table's natural bounds
      el.style.display = 'inline-block';
      el.style.width = 'max-content';
      el.style.maxWidth = 'none';

      return originalStyles;
    }

    function restoreStyles(styles) {
      styles.forEach(({ el, prop, val }) => { el.style[prop] = val; });
    }

    const gridStyles = expandForCapture(gridEl);
    const statsStyles = expandForCapture(statsEl);
    
    // Measure the exact, flawless pixel dimensions of the inline blocks
    const gridW = gridEl.scrollWidth;
    const gridH = gridEl.scrollHeight;
    const statsW = statsEl.scrollWidth;
    const statsH = statsEl.scrollHeight;
    // Keep the clone's viewport the same width as the real one so the @media (max-width:768px)
    // rules apply identically when measuring and when html2canvas renders its cloned copy.
    // (A wider windowWidth flips the clone to desktop CSS: wider cells, bigger fonts, so the
    // table grows past the width we measured and the right-hand day columns get cropped.)
    const captureWindowWidth = window.innerWidth;

    const isMobile = window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
    // iOS Safari refuses canvases above ~16.7M pixels, so shrink the scale if a big GoC map would exceed it
    const baseScale = isMobile ? 1.5 : 2;
    const fitScale = (w, h) => isMobile ? Math.min(baseScale, Math.sqrt(16000000 / (w * h))) : baseScale;
    
    // 🚨 FIX 4: Explicitly pass the measured bounds to the camera
    const canvasGrid = await html2canvas(gridEl, {
      backgroundColor: '#191425',
      scale: fitScale(gridW, gridH),
      width: gridW,
      height: gridH,
      windowWidth: captureWindowWidth,
      windowHeight: gridH + 200,
      scrollX: 0,
      scrollY: 0
    });
    
    const canvasStats = await html2canvas(statsEl, {
      backgroundColor: '#191425',
      scale: fitScale(statsW, statsH),
      width: statsW,
      height: statsH,
      windowWidth: captureWindowWidth,
      windowHeight: statsH + 200,
      scrollX: 0,
      scrollY: 0
    });
    
    // Instantly restore the UI back to normal
    restoreStyles(gridStyles);
    restoreStyles(statsStyles);
    html.style.overflow = origHtmlOverflow;
    document.body.style.overflow = origBodyOverflow;
    mainEl.style.maxWidth = origMainMaxWidth;
    document.documentElement.classList.remove('capturing');
    window.scrollTo(origScrollX, origScrollY);
    
    const srv = activeSrv();
    const prefix = srv ? srv.name.replace(/[^a-z0-9]/gi, '_') : 'map';
    
    const gridBlob = await new Promise(res => canvasGrid.toBlob(res, 'image/png'));
    const statsBlob = await new Promise(res => canvasStats.toBlob(res, 'image/png'));
    const gridFile = new File([gridBlob], `${prefix}_grid.png`, { type: 'image/png' });
    const statsFile = new File([statsBlob], `${prefix}_stats.png`, { type: 'image/png' });
    const filesArray = [gridFile, statsFile];

    if (isMobile) {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;padding:40px 20px;overflow-y:auto;';

      const shareBtnHtml = (navigator.canShare && navigator.canShare({ files: filesArray }))
        ? `<button id="ov-share-btn" style="background:var(--accent);color:#0a1a14;border:none;padding:12px 24px;border-radius:24px;font-weight:bold;font-size:16px;margin-bottom:20px;box-shadow:0 4px 12px var(--accent-glow);cursor:pointer;">📤 Share to Apps</button>`
        : '';

      overlay.innerHTML = `
        ${shareBtnHtml}
        <div style="color:var(--text);font-weight:bold;margin-bottom:20px;text-align:center;">
          Long-press each image to save to Photos<br>
          <span style="font-size:11px;color:var(--text2);font-weight:normal;">(Tap the black background to close)</span>
        </div>
        <img src="${URL.createObjectURL(gridBlob)}" style="width:100%;max-width:none;border-radius:8px;margin-bottom:20px;">
        <img src="${URL.createObjectURL(statsBlob)}" style="width:100%;max-width:none;border-radius:8px;margin-bottom:40px;">
      `;

      overlay.onclick = (e) => { if(e.target === overlay) document.body.removeChild(overlay); };
      document.body.appendChild(overlay);

      if (shareBtnHtml) {
        document.getElementById('ov-share-btn').onclick = async () => {
          try { await navigator.share({ files: filesArray }); }
          catch (e) { console.log("Share cancelled", e); }
        };
      }

      btn.textContent = '✓ Generated!';
      btn.style.color = 'var(--green)';
    } else {
      const zip = new JSZip();
      const folderName = `${prefix}_snapshots`;
      const imgFolder = zip.folder(folderName);
      
      imgFolder.file(`${prefix}_grid.png`, gridBlob);
      imgFolder.file(`${prefix}_stats.png`, statsBlob);
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      link.download = `${folderName}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      btn.textContent = '✓ Saved!';
      btn.style.color = 'var(--green)';
    }
    
  } catch (err) {
    console.error("Screenshot failed:", err);
    document.documentElement.classList.remove('capturing');
    btn.textContent = '❌ Error';
  }
  
  setTimeout(() => {
    btn.textContent = '📸 Screenshots';
    btn.style.color = '';
  }, 2000);
}

// ══════════════════════════════════════════════════════════════
//  CLOUD SYNC & SHARING
// ══════════════════════════════════════════════════════════════

const WORKER_URL = "https://mio-susuhara.elysesim.workers.dev"; // Replace with your subdomain!

async function publishToCloud() {
  const srv = activeSrv();
  if(!srv) return;
  
  const btn = document.getElementById('btn-share-cloud');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Saving...';
  btn.disabled = true;

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      body: JSON.stringify(srv),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if(response.ok) {
      srv.cloudSynced = true; // 🚨 NEW
      save();                 // 🚨 NEW

      // 🚨 Fix 1: Force the creator's URL bar to update immediately
      window.history.replaceState({}, document.title, window.location.pathname + '?plan=' + srv.id);
      
      const shareUrl = window.location.origin + window.location.pathname + '?plan=' + srv.id;
      // Safari drops the "user gesture" after an awaited fetch, so the clipboard write can be
      // refused even though the save worked. Treat that as a copy failure, not a save failure.
      let copied = false;
      try { await navigator.clipboard.writeText(shareUrl); copied = true; } catch (e) { console.warn('Clipboard blocked', e); }
      btn.innerHTML = copied ? '✓ Saved & Copied!' : '✓ Saved!';
      setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2500);
      if (!copied) setTimeout(() => window.prompt('Saved! Copy this share link:', shareUrl), 50);
    } else {
      throw new Error('Failed to save to cloud');
    }
  } catch(err) {
    console.error(err);
    alert("Failed to sync to cloud. Check your connection or Worker URL.");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function syncFromCloud() {
  const srv = activeSrv();
  if(!srv) return;
  
  const btn = document.getElementById('btn-sync-cloud');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Syncing...';
  btn.disabled = true;

  try {
    // 🚨 Fix 2: Add timestamp cache-buster so the browser is forced to pull fresh data
    const res = await fetch(`${WORKER_URL}?plan=${srv.id}&t=${Date.now()}`, { cache: 'no-store' });
    if(!res.ok) throw new Error('Plan not found in cloud');
    
    const sharedSrv = await res.json();
    sharedSrv.cloudSynced = true; // 🚨 NEW
    const existingIdx = servers.findIndex(s => s.id === sharedSrv.id);
    if(existingIdx >= 0) {
      servers[existingIdx] = sharedSrv; 
    }
    
    // 🚨 Fix 3: Ensure the URL updates if they clicked sync while on a base URL
    window.history.replaceState({}, document.title, window.location.pathname + '?plan=' + srv.id);

    save();
    renderAll();
    
    btn.innerHTML = '✓ Synced!';
  } catch(err) {
    console.error(err);
    alert("No cloud updates found for this specific server.");
    btn.innerHTML = '❌ Error';
  }
  
  setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2500);
}

async function checkUrlForSharedPlan() {
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan');
  if(!planId) return;

  try {
    const res = await fetch(`${WORKER_URL}?plan=${planId}`);
    if(!res.ok) throw new Error('Plan not found');
    const sharedSrv = await res.json();
    sharedSrv.cloudSynced = true; // 🚨 NEW
    
    const existingIdx = servers.findIndex(s => s.id === sharedSrv.id);
    if(existingIdx >= 0) {
      servers[existingIdx] = sharedSrv; 
    } else {
      // 🚨 REMOVED: The line that appended " (Shared)" to the name
      servers.push(sharedSrv); 
    }
    activeId = sharedSrv.id;
    save();
  } catch(err) {
    console.error(err);
    alert("Could not load the shared plan. It may have expired or the link is incorrect.");
  }
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
load();
checkUrlForSharedPlan().then(() => {
  renderTabs();
  renderAll();
});

function updGuildExcluded(gid, isExcluded){
  const s = activeSrv(); if(!s) return;
  const g = s.guilds.find(x => x.id === gid); if(!g) return;
  g.isExcluded = isExcluded; 
  save(); 
}

// ══════════════════════════════════════════════════════════════
//  GLOBAL EXPORTS (Because ES Modules hide functions from HTML)
// ══════════════════════════════════════════════════════════════
window.openAdd = openAdd;
window.confirmAdd = confirmAdd;
window.closeModal = closeModal;
window.onAddModalModeChange = onAddModalModeChange;
window.onAddModalStartChange = onAddModalStartChange;
window.switchSrv = switchSrv;
window.removeSrv = removeSrv;
window.confirmDeleteSrv = confirmDeleteSrv;

// 🚨 Tab Context Menu
window.ctxRename = ctxRename;
window.ctxDuplicate = ctxDuplicate;
window.ctxDelete = ctxDelete;

window.updName = updName;
window.updMode = updMode;
window.updMap = updMap;
window.updStart = updStart;
window.updEnd = updEnd;
window.clearPlan = clearPlan;

window.openImport = openImport;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleFileSelect = handleFileSelect;
window.processImport = processImport;
window.exportServer = exportServer;

window.takeScreenshots = takeScreenshots;
window.autoOptimize = autoOptimize;
window.undoOptimize = undoOptimize;
window.publishToCloud = publishToCloud;
window.syncFromCloud = syncFromCloud;

window.updGuildName = updGuildName;
window.updGuildSmall = updGuildSmall;
window.updGuildExcluded = updGuildExcluded;
window.updGuildPoints = updGuildPoints;
window.updGuildLv3 = updGuildLv3;
window.updGuildLv2 = updGuildLv2;
window.updGuildLv1 = updGuildLv1;
window.addGuild = addGuild;
window.removeGuild = removeGuild;

window.clearDay = clearDay;
window.onCell = onCell;
window.cpyMsg = cpyMsg;