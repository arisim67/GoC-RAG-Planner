// ══════════════════════════════════════════════════════════════
//  MAP DATA
// ══════════════════════════════════════════════════════════════

// Full names for Lv2 dorms (shared across maps)
// ══════════════════════════════════════════════════════════════
//  MAP DATA
// ══════════════════════════════════════════════════════════════

const DORM_NAMES = {
  Darkwick:'Darkwick', Vagastrom:'Vagastrom', Hotarubi:'Hotarubi',
  Obscuary:'Obscuary', Sinostra:'Sinostra', Frostheim:'Frostheim',
  Jabberwock:'Jabberwock', Mortkranken:'Mortkranken', Dionysia:'Dionysia'
};

const ALIAS = {
  'Castle':'Darkwick','DW':'Darkwick',
  'Vaga':'Vagastrom','Vagastrom':'Vagastrom',
  'Hota':'Hotarubi','Hotarubi':'Hotarubi',
  'Obs':'Obscuary','Obscuary':'Obscuary','Obscurary':'Obscuary','Obscuaary':'Obscuary',
  'Sino':'Sinostra','Sinostra':'Sinostra','SInostra':'Sinostra','Sionstra':'Sinostra',
  'Frost':'Frostheim','Frostheim':'Frostheim',
  'Jabber':'Jabberwock','Jabberwock':'Jabberwock',
  'Mort':'Mortkranken','Mortkranken':'Mortkranken','Mortkraken':'Mortkranken',
  'Dio':'Dionysia','Dionysia':'Dionysia'
};

function canon(s){ return ALIAS[s.trim()] || s.trim(); }

const RAG_MAPS = {
  floating:{
    name:'Floating City',
    kingdoms:[
      {id:'Darkwick',   type:'lv3',  adj:['Dionysia','Vagastrom','Hotarubi','Obscuary']},
      {id:'Vagastrom',  type:'lv2', adj:['B','C','G','Frostheim','Darkwick']},
      {id:'Hotarubi',   type:'lv2', adj:['Darkwick','J','N']},
      {id:'Obscuary',   type:'lv2', adj:['Darkwick','N','O','L']},
      {id:'Dionysia',   type:'lv2', adj:['B','Darkwick','L','H']},
      {id:'Frostheim',  type:'lv2', adj:['D','G','Vagastrom','J']},
      {id:'Jabberwock', type:'lv2', adj:['M','N','R']},
      {id:'Mortkranken',type:'lv2', adj:['K','L','O','Q']},
      {id:'A',type:'lv1',adj:['E','F','B']},
      {id:'B',type:'lv1',adj:['A','F','Dionysia','Vagastrom','C']},
      {id:'C',type:'lv1',adj:['B','Vagastrom','D']},
      {id:'D',type:'lv1',adj:['C','G','Frostheim']},
      {id:'E',type:'lv1',adj:['A','F','K']},
      {id:'F',type:'lv1',adj:['A','B','H','E']},
      {id:'G',type:'lv1',adj:['Vagastrom','D','Frostheim']},
      {id:'H',type:'lv1',adj:['F','Dionysia','K','L']},
      {id:'J',type:'lv1',adj:['Frostheim','Hotarubi','M']},
      {id:'K',type:'lv1',adj:['E','H','Mortkranken']},
      {id:'L',type:'lv1',adj:['H','Dionysia','Obscuary','Mortkranken']},
      {id:'M',type:'lv1',adj:['J','Jabberwock']},
      {id:'N',type:'lv1',adj:['Obscuary','Hotarubi','Jabberwock','P']},
      {id:'O',type:'lv1',adj:['Mortkranken','Obscuary','P']},
      {id:'P',type:'lv1',adj:['O','N','R','Q']},
      {id:'Q',type:'lv1',adj:['Mortkranken','P','R']},
      {id:'R',type:'lv1',adj:['Q','P','Jabberwock']},
    ]
  },
  galaxy:{
    name:'Galaxy Terminal',
    kingdoms:[
      {id:'Darkwick',   type:'lv3',  adj:['Frostheim','Hotarubi','Obscuary','L']},
      {id:'Frostheim',  type:'lv2', adj:['Vagastrom','M','Darkwick','P']},
      {id:'Hotarubi',   type:'lv2', adj:['G','F','Darkwick']},
      {id:'Obscuary',   type:'lv2', adj:['Darkwick','O']},
      {id:'Vagastrom',  type:'lv2', adj:['Dionysia','Q','Frostheim']},
      {id:'Dionysia', type:'lv2', adj:['J','H','Vagastrom']},
      {id:'Sinostra',   type:'lv2', adj:['K','J','E']},
      {id:'A',type:'lv1',adj:['B','F']},
      {id:'B',type:'lv1',adj:['A','C']},
      {id:'C',type:'lv1',adj:['B','D','G']},
      {id:'D',type:'lv1',adj:['C','E']},
      {id:'E',type:'lv1',adj:['D','Sinostra']},
      {id:'F',type:'lv1',adj:['A','Hotarubi','L']},
      {id:'G',type:'lv1',adj:['C','H','Hotarubi','M']},
      {id:'H',type:'lv1',adj:['G','Dionysia','M']},
      {id:'J',type:'lv1',adj:['Sinostra','Dionysia']},
      {id:'K',type:'lv1',adj:['N','Sinostra']},
      {id:'L',type:'lv1',adj:['Darkwick','F']},
      {id:'M',type:'lv1',adj:['Frostheim','G','H']},
      {id:'N',type:'lv1',adj:['K','R']},
      {id:'O',type:'lv1',adj:['Obscuary','P']},
      {id:'P',type:'lv1',adj:['Frostheim','O','Q']},
      {id:'Q',type:'lv1',adj:['P','R','Vagastrom']},
      {id:'R',type:'lv1',adj:['N','Q']},
    ]
  },
  poseidon:{
    name:'Sea of Poseidon',
    kingdoms:[
      {id:'Darkwick',   type:'lv3',  adj:['N','Vagastrom','Jabberwock','Obscuary']},
      {id:'Vagastrom',  type:'lv2', adj:['M','L','B','Darkwick']},
      {id:'Jabberwock', type:'lv2', adj:['B','C','O','Darkwick']},
      {id:'Obscuary',   type:'lv2', adj:['G','F','Q','Dionysia','Darkwick']},
      {id:'Dionysia',  type:'lv2', adj:['H','G','Obscuary']},
      {id:'Sinostra',   type:'lv2', adj:['K','J','N']},
      {id:'Hotarubi',   type:'lv2', adj:['E','P','D']},
      {id:'A',type:'lv1',adj:['K','L','B']},
      {id:'B',type:'lv1',adj:['A','Vagastrom','Jabberwock','C']},
      {id:'C',type:'lv1',adj:['B','Jabberwock','D']},
      {id:'D',type:'lv1',adj:['C','O','Hotarubi']},
      {id:'E',type:'lv1',adj:['F','Hotarubi']},
      {id:'F',type:'lv1',adj:['G','Obscuary','E']},
      {id:'G',type:'lv1',adj:['H','Dionysia','Obscuary','F']},
      {id:'H',type:'lv1',adj:['J','N','Dionysia','G']},
      {id:'J',type:'lv1',adj:['Sinostra','H']},
      {id:'K',type:'lv1',adj:['Sinostra','M','L','A']},
      {id:'L',type:'lv1',adj:['A','K','Vagastrom']},
      {id:'M',type:'lv1',adj:['K','N','Vagastrom']},
      {id:'N',type:'lv1',adj:['Sinostra','M','Darkwick','H']},
      {id:'O',type:'lv1',adj:['Jabberwock','Q','D']},
      {id:'P',type:'lv1',adj:['Q','Hotarubi']},
      {id:'Q',type:'lv1',adj:['Obscuary','O','P']},
    ]
  }
};

function makeGoCMap(name, rows) {
  const kingdoms = [];
  for (const [adjRaw, kidRaw] of rows) {
    // 🚨 Skip this town completely if it has no adjacencies (null)
    if (!kidRaw || !adjRaw) continue; 
    
    const kid = canon(kidRaw.trim());
    if (!kid) continue;
    
    // Since we know adjRaw is not null, we can safely split it
    const adj = adjRaw.split(',').map(s => canon(s.trim())).filter(s=>s&&s!==kid);
    let type = 'lv1';
    
    if (kid === 'Darkwick') type = 'lv3';
    else if (DORM_NAMES[kid]) type = 'lv2';
    
    kingdoms.push({id:kid, type, adj});
  }
  return {name, kingdoms};
}

const GOC_MAPS = {
  forest: makeGoCMap('Forest', [
    ['Hota, Obs, Sino, L','Darkwick'],
    ['Sino, Jabber, Q','Vagastrom'],
    ['Castle, Vaga, M, P','Sinostra'],
    ['Castle, F, G','Hotarubi'],
    ['Castle, O','Obscuary'],
    ['E, J, K','Mortkranken'],
    ['Vaga, J, H','Jabberwock'],
    ['B, F','A'],['A, C','B'],['B, D, G','C'],['C, E','D'],['D, Mort','E'],
    ['A, L, Hota','F'],['C, H, M, Hota','G'],['G, M, Jabber','H'],
    ['Jabber, Mort','J'],['Mort, N','K'],['F, Castle','L'],
    ['G, H, Sino','M'],['K, R','N'],['P, Obs','O'],
    ['O, Q, Sino','P'],['P, R, Vaga','Q'],['Q, N','R'],
  ]),
  wetland: makeGoCMap('Wetland', [
    ['E, Mortkranken, Jabberwock, Obscuary','Darkwick'],
    ['C, D, F, H','Vagastrom'],
    ['Sinostra, Darkwick','Jabberwock'],
    ['F, H, J, Darkwick','Obscuary'],
    [null,'Frostheim'],
    ['K, N, J, Jabberwock','Sinostra'],
    ['B, D, Darkwick','Mortkranken'],
    [null,'Hotarubi'],
    ['B, C','A'],['A, Mortkranken','B'],['A, Vagastrom','C'],
    ['Mortkranken, Vagastrom','D'],['G, Darkwick','E'],
    ['Vagastrom, Obscuary','F'],['E, K','G'],
    ['L, Obscuary, Vagastrom','H'],['M, Sinostra, Obscuary','J'],
    ['G, N, Sinostra','K'],['M, H','L'],['L, J','M'],['K, Sinostra','N'],
  ]),
  badlands: makeGoCMap('Badlands', [
    ['A, Dio, G','Darkwick'],
    ['K, M, P, O','Vagastrom'],
    ['Castle, E, H, J','Dionysia'],
    [null,'Obscuary'],
    ['G, Sino, M','Frostheim'],
    ['Frost, G, J','Sinostra'],
    [null,'Mortkranken'],
    ['N, P, R','Hotarubi'],
    ['B, Castle','A'],['A, C','B'],['B, D','C'],['C, E','D'],
    ['D, F, Dio','E'],['E, H','F'],
    ['Castle, Sino, Frost, K','G'],['F, Dio','H'],
    ['Dio, Sino','J'],['G, Vaga','K'],['M, N','L'],
    ['Frost, Vaga, L','M'],['L, Hota','N'],['Q, Vaga','O'],
    ['Vaga, Hota, Q','P'],['O, P, R','Q'],['Hota, Q','R'],
  ]),
  snowfield: makeGoCMap('Snowfield', [
    ['Vagastrom, J, Obscuary, M','Darkwick'],
    ['H, J, Mortkranken, Darkwick','Vagastrom'],
    [null,'Jabberwock'],
    ['K, N, P, Darkwick','Obscuary'],
    ['A, G, H','Frostheim'],
    [null,'Sinostra'],
    ['E, G, F, Vagastrom','Mortkranken'],
    [null,'Hotarubi'],
    ['B, Frostheim','A'],['A, C','B'],['B, D, E','C'],['C, E, F','D'],
    ['C, D, Mortkranken','E'],['D, Mortkranken','F'],
    ['Frostheim, Mortkranken','G'],['J, Frostheim, Vagastrom','H'],
    ['H, K, Vagastrom, Darkwick','J'],['L, J, Obscuary','K'],
    ['K, N','L'],['P, Darkwick','M'],['L, Q, O, Obscuary','N'],
    ['N, R, P','O'],['M, O, Obscuary','P'],['N, R, P','Q'],['O, Q','R'],
  ]),
  woodlands: makeGoCMap('Woodlands', [
    ['Jabberwock, Sinostra, Hotarubi, Frostheim','Darkwick'],
    ['E, C, Darkwick, G','Jabberwock'],
    ['A, E, F','Obscuary'],
    ['H, K, Darkwick','Frostheim'],
    ['C, D, Darkwick','Sinostra'],
    ['F, H, J','Mortkranken'],
    ['D, L, Darkwick','Hotarubi'],
    ['Obscuary, B','A'],['A, C','B'],['B, Sinostra, Jabberwock','C'],
    ['Sinostra, Hotarubi','D'],['Obscuary, Jabberwock','E'],
    ['G, Obscuary, Mortkranken','F'],['F, H, Jabberwock','G'],
    ['G, Mortkranken, Frostheim','H'],['Mortkranken, K','J'],
    ['J, L, Frostheim','K'],['K, Hotarubi','L'],
  ]),
};

function getMaps(mode){ return mode==='ragnarok' ? RAG_MAPS : GOC_MAPS; }
function getMapList(mode){ return Object.entries(getMaps(mode)).map(([k,v])=>({key:k,name:v.name})); }
function getMapData(mode,mapKey){ return getMaps(mode)[mapKey]; }

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
    b.addEventListener('contextmenu', e=>{ e.preventDefault(); openTabCtx(e, s.id); });
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
  const x = Math.min(e.clientX, window.innerWidth  - menu.offsetWidth  - 8);
  const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
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
  const target=Math.floor((totalPts+totalBase)/srv.guilds.length);

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
      ${renderScores(srv,scores,target)}
      ${renderOcc(srv,occ)}
      ${renderDecTable(srv,days,dec,give)}
    </div>
    
    ${renderMsgs(srv,days,dec,give)}
  `;
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
          <button class="btn" onclick="openImport()">📥 Import</button>
          <button class="btn" onclick="exportServer()">📤 Export Server</button>
          <button class="btn" onclick="takeScreenshots()">📸 Screenshots</button>
          <button class="btn-gold" onclick="autoOptimize()">⚡ Auto-Optimize</button>
          ${srv.undoPlan ? `<button class="btn-accent" onclick="undoOptimize()" style="border-color:var(--gold);color:var(--gold2)">↩ Undo Optimize</button>` : ''}
          <button class="btn-accent" onclick="openRepair()">🔧 Repair</button>
        </div></div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:var(--text3)">
      ${days} days planned · ${getMapData(srv.mode,srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
    </div>
  </div>
  ${renderOptimizerSettings(srv)}`;
}

// ── DEFAULT CAP HELPERS ──────────────────────────────────────────────────────
function getDefaultCaps(srv) {
  const mapData  = getMapData(srv.mode, srv.mapKey);
  const days     = numDays(srv); // Use actual planned days, not mode default
  const n        = srv.guilds.length;
  const numLv3   = mapData.kingdoms.filter(k => k.type === 'lv3').length;
  const numLv2   = mapData.kingdoms.filter(k => k.type === 'lv2').length;

  // Use ceiling for fair cap: ensures total capacity >= total available slots
  // So with 6 Darkwick over 12 guilds, cap=1 (6 guilds get 1, 6 get 0)
  const defLv3   = numLv3 > 0 ? Math.floor((days * numLv3) / n) : 0;
  const defLv2   = Math.floor((days * numLv2) / n);
  return { defLv3, defLv2 };
}

function renderOptimizerSettings(srv) {
  const { defLv3, defLv2 } = getDefaultCaps(srv);
  const capLv3 = srv.optCapLv3 !== undefined ? srv.optCapLv3 : defLv3;
  const capLv2 = srv.optCapLv2 !== undefined ? srv.optCapLv2 : defLv2; 

  return `<div class="section">
    <div class="sec-title">Optimizer Settings
      <span style="font-size:9px;color:var(--text3);font-family:var(--font-body);font-weight:400;letter-spacing:0;margin-left:4px">
        Controls how ⚡ Auto-Optimize distributes kingdoms. Changes take effect on the next run.
      </span>
    </div>
    <div class="row" style="gap:20px;align-items:flex-start;flex-wrap:wrap;">

      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;flex:1;min-width:220px;">
        <div style="font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">
          Per-Guild Caps <span style="font-size:9px;color:var(--text3);font-weight:400">(max days on each tier)</span>
        </div>
        <div class="row" style="gap:14px;">
          <div class="fg">
            <label style="color:var(--lv3)">Darkwick days ≤</label>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="number" min="0" max="30" step="1" value="${capLv3}"
                style="width:58px;" onchange="updOptCap('lv3',+this.value)" title="Max times any one guild can hold Darkwick">
              <span style="font-size:10px;color:var(--text3)">(fair = ${defLv3})</span>
            </div>
          </div>
          <div class="fg">
            <label style="color:var(--lv2)">Dorm days ≤</label>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="number" min="0" max="60" step="1" value="${capLv2}"
                style="width:58px;" onchange="updOptCap('lv2',+this.value)" title="Max times any one guild can hold any single dorm">
              <span style="font-size:10px;color:var(--text3)">(fair = ${defLv2})</span>
            </div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;line-height:1.5;">
          "Fair" = total available days ÷ guilds, rounded <strong>up</strong> (ceiling). This ensures enough total capacity for all kingdoms. Lower the cap to spread Darkwick/dorm time more tightly; raise it if too restrictive.
        </div>
      </div>

    </div>
  </div>`;
}

function updOptCap(tier, val){
  const s = activeSrv(); if(!s) return;
  if(tier==='lv3') s.optCapLv3 = Math.max(0,val);
  if(tier==='lv2') s.optCapLv2 = Math.max(0,val);
  save();
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
            
          <input type="checkbox" id="sm_${g.id}" class="guild-small-check" ${g.isSmall ? 'checked' : ''} 
            onchange="updGuildSmall('${g.id}', this.checked)">
          <label for="sm_${g.id}" class="guild-small-label" title="Check this if this is a smaller guild. The optimizer will limit them to 1 declare and deprioritize their point totals, while still giving them fair Castle/Dorm time.">Small Guild</label>
          
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

function renderScores(srv,scores,target){
  const days=numDays(srv);
  const final=srv.guilds.map(g=>({g,pts:scores.cumul[g.id][days-1]}));
  final.sort((a,b)=>b.pts-a.pts);
  const maxPts=Math.max(...final.map(x=>x.pts),1);
  return `<div class="section">
    <div class="sec-title">Final Scores <span style="font-size:9px;color:var(--text3);font-family:var(--font-body);font-weight:400;letter-spacing:0"> Even target: ${target} pts</span></div>
    <div class="score-grid">
      ${final.map(({g,pts})=>{
        const diff=pts-target;
        const cls=Math.abs(diff)<=1?'diff-ok':Math.abs(diff)<=3?'diff-warn':'diff-bad';
        const pct=Math.round(pts/maxPts*100);
        return `<div class="score-card">
          <div class="sc-label"><div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}</div>
          <div class="sc-val" style="color:${g.color}">${pts}</div>
          <div class="sc-sub">target: ${target}</div>
          <div class="sc-diff ${cls}">${diff>=0?'+':''}${diff}</div>
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
            <div style="margin-top:6px;"><button onclick="clearDay(${d})" style="background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:9px;padding:2px 6px;border-radius:4px;cursor:pointer;">Clear</button></div>
          </th>`).join('')}
        </tr>
        <tr class="pts-row">
          <th colspan="3" style="padding:4px 10px;font-size:10px;color:var(--text2);text-align:left;border-bottom:1px solid var(--border);">Running pts →</th>
          ${Array.from({length:totalCols},(_,d)=>{
            return `<th style="padding:3px 4px;vertical-align:top;border-bottom:1px solid var(--border);">
              ${srv.guilds.map(g => {
                let pts = 0;
                if (d === 0) {
                    pts = parseInt(g.basePoints || 0, 10);
                } else if (scores.cumul[g.id]) {
                    pts = scores.cumul[g.id][d-1] || 0;
                }
                return `<div style="color:${g.color};font-size:9px;white-space:nowrap">${esc(g.name.length>8?g.name.slice(0,7)+'…':g.name)}: ${pts}</div>`;
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
      optCapLv3: srv.optCapLv3,
      optCapLv2: srv.optCapLv2
    }
  };

  const json = JSON.stringify(exportData, null, 2);

  // Copy to clipboard
  navigator.clipboard.writeText(json).then(() => {
    // Visual feedback
    const btn = event.target;
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
    srv.optCapLv3 = imp.optCapLv3;
    srv.optCapLv2 = imp.optCapLv2;

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

// Helper for calculating real-time holdings to enforce strict caps
function countType(plan, gid, type, maxD, mapData) {
    let c = 0;
    for(let i=1; i<=maxD; i++) {
        if(!plan[i]) continue;
        for(const kdm of mapData.kingdoms) {
            if(kdm.type === type && plan[i][kdm.id] === gid) c++;
        }
    }
    return c;
}

function distanceToDarkwick(kingdom, adj, mapData){
  if(kingdom === 'Darkwick') return 0;
  const visited = new Set();
  let frontier = ['Darkwick'];
  visited.add('Darkwick');
  let dist = 1;
  while(frontier.length > 0){
    const next = [];
    for(const loc of frontier){
      for(const n of adj[loc]||[]){
        if(n === kingdom) return dist;
        if(!visited.has(n)){
          visited.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
    dist++;
  }
  return 999;
}

// Helper for enforcing Darkwick capture restrictions
function canDeclareDarkwick(prevPlan, gid, mapData) {
    let lv2Held = 0, lv1Held = 0;
    for (const [kId, owner] of Object.entries(prevPlan)) {
        if (owner === gid) {
            const kObj = mapData.kingdoms.find(x => x.id === kId);
            if (kObj) {
                if (kObj.type === 'lv2') lv2Held++;
                if (kObj.type === 'lv1') lv1Held++;
            }
        }
    }
    return (lv2Held >= 1 || lv1Held >= 2);
}


// ══════════════════════════════════════════════════════════════
//  AUTO OPTIMIZE (ANTI-OSCILLATION + SMART STICKINESS + SIMULATED ANNEALING)
// ══════════════════════════════════════════════════════════════

function autoOptimize(){
  try {
    const srv = activeSrv();
    if(!srv) return;

    // Snapshot current plan so user can undo
    srv.undoPlan = JSON.parse(JSON.stringify(srv.plan));

    const mapData   = getMapData(srv.mode, srv.mapKey);
    const adj       = adjMap(srv.mode, srv.mapKey);
    const days      = numDays(srv);
    const n         = srv.guilds.length;
    const pts       = {lv3:3, lv2:2, lv1:1};
    const kingdoms  = [...mapData.kingdoms].sort((a,b) => pts[b.type]-pts[a.type]);
    const maxGainGlobal = srv.mode === 'goc' ? 2 : 3;

    const baseLv3s  = Object.fromEntries(srv.guilds.map(g=>[g.id, parseInt(g.baseLv3||g.baseLv3s||0,10)]));
    const baseLv2s  = Object.fromEntries(srv.guilds.map(g=>[g.id, parseInt(g.baseLv2||g.baseLv2s||0,10)]));
    const basePoints= Object.fromEntries(srv.guilds.map(g=>[g.id, parseInt(g.basePoints||0,10)||0]));
    let   totalBase = srv.guilds.reduce((s,g)=>s+basePoints[g.id],0);

    const { defLv3, defLv2 } = getDefaultCaps(srv);
    const maxLv3 = srv.optCapLv3 !== undefined ? srv.optCapLv3 : defLv3;
    const maxLv2 = srv.optCapLv2 !== undefined ? srv.optCapLv2 : defLv2;

    // Hardcoded weights — mode-dependent
    const isRagnarok = srv.mode === 'ragnarok';
    const wPts  = isRagnarok ? 15 : 25;  // Ragnarok: lower pts weight (4 guilds balance easier)
    const wLv3  = 8;                      // Darkwick fairness weight
    const wLv2  = 5;                      // Dorm fairness weight
    const wMove = isRagnarok ? 6 : 1;    // Ragnarok: high stickiness (4 guilds stay on Lv1); GoC: low (12 guilds need churn)

    const totalDayValue  = mapData.kingdoms.reduce((s,k)=>s+pts[k.type],0);
    const smallCount = srv.guilds.filter(g => g.isSmall).length;
    const bigCount = Math.max(1, n - smallCount);
    const absoluteTarget = (totalDayValue * days + totalBase) / bigCount;

    const numLv3 = mapData.kingdoms.filter(k=>k.type==='lv3').length;
    const numLv2 = mapData.kingdoms.filter(k=>k.type==='lv2').length;
    const lv3Target = (days * numLv3) / n;
    const lv2Target = (days * numLv2) / n;

    // ── QUICK WIN 1: Pre-compute fair integer quotas per guild (largest remainder method) ──
    function fairQuotas(total, n) {
      const base = Math.floor(total / n);
      const rem  = total % n;
      const quotas = Array(n).fill(base);
      for (let i = 0; i < rem; i++) quotas[i]++;
      return quotas;
    }
    const lv3Quotas = fairQuotas(days * numLv3, n);
    const lv2Quotas = fairQuotas(days * numLv2, n);
    const ptsQuotas = fairQuotas(Math.round(totalDayValue * days), n);
    // Map quotas to guild IDs (sorted by basePoints desc for deterministic assignment)
    const sortedGuildIds = [...srv.guilds].sort((a,b) => (parseInt(b.basePoints||0,10)) - (parseInt(a.basePoints||0,10))).map(g=>g.id);
    const targetLv3 = Object.fromEntries(sortedGuildIds.map((id,i)=>[id, lv3Quotas[i] + (baseLv3s[id]||0)]));
    const targetLv2 = Object.fromEntries(sortedGuildIds.map((id,i)=>[id, lv2Quotas[i] + (baseLv2s[id]||0)]));
    const targetPts = Object.fromEntries(sortedGuildIds.map((id,i)=>[id, ptsQuotas[i] + (basePoints[id]||0)]));

    let bestPlan     = null;
    let bestScore    = Infinity;                 
    const biases     = Object.fromEntries(srv.guilds.map(g=>[g.id, 0]));
    const MAX_ATTEMPTS = 80;

    const today = new Date(); today.setHours(0,0,0,0);
    let startDt = null;
    if(srv.startDate){ const [yy,mm,dd]=srv.startDate.split('-'); startDt=new Date(+yy,mm-1,+dd); }

    function planScore(tempPlanLocal, gPtsMap, lv3Map, lv2Map){
      const gIds = srv.guilds.map(g=>g.id);

      // Target-based scoring: penalize deviation from fair quotas
      let score = 0;
      for (const id of gIds) {
        const ptsDev = Math.abs(gPtsMap[id] - targetPts[id]);
        const l3Dev  = Math.abs(lv3Map[id]  - targetLv3[id]);
        const l2Dev  = Math.abs(lv2Map[id]  - targetLv2[id]);
        score += wPts * ptsDev * ptsDev * 0.01;  // quadratic penalty
        score += wLv3 * l3Dev  * l3Dev  * 10;   // lv3 deviation heavily weighted
        score += wLv2 * l2Dev  * l2Dev  * 5;    // lv2 deviation weighted
      }

      // Movement penalties (same as before)
      let emptyCount = 0;
      let movePenalty = 0;

      for(let dL=1; dL<=days; dL++){
         const planD = tempPlanLocal[dL] || {};
         const planPrev = tempPlanLocal[dL-1] || {};
         const planPrev2 = tempPlanLocal[dL-2] || {};

         for(const kL of mapData.kingdoms) {
            if(!planD[kL.id]) {
                emptyCount++;
            } else if (kL.id !== 'Darkwick' && planPrev[kL.id] && planD[kL.id] !== planPrev[kL.id]) {

                // 🚨 ANTI-FLIP-FLOP PENALTY 🚨
                if (planPrev2[kL.id] === planD[kL.id]) {
                    movePenalty += 50; // flip-flop penalty
                }

                const loserGid = planPrev[kL.id];

                if (kL.type === 'lv2') {
                    if (!kL.adj.includes('Darkwick')) {
                        movePenalty += 20; // Outer Base Dorm
                    } else {
                        let loserPrevDormsCount = 0;
                        for (const [kId, owner] of Object.entries(planPrev)) {
                            if (owner === loserGid) {
                                const kObj = mapData.kingdoms.find(x => x.id === kId);
                                if (kObj && kObj.type === 'lv2') loserPrevDormsCount++;
                            }
                        }
                        if (loserPrevDormsCount <= 1) {
                            movePenalty += 20; // Only home
                        } else {
                            movePenalty += 5; // Steady Bridge
                        }
                    }
                } else {
                    movePenalty += 1; // Lv1 towns
                }
            }
         }
      }

      return (emptyCount * 1000000) + score + (movePenalty * wMove);
    }

    for(let attempt=0; attempt<MAX_ATTEMPTS; attempt++){
      const tempPlan = { 0: {...(srv.plan[0]||{})} };
      for(let d=1; d<=days; d++) tempPlan[d] = {};

      const gPts = {...basePoints};
      const lv3Days = Object.fromEntries(srv.guilds.map(g=>[g.id, baseLv3s[g.id]]));
      const lv2Days = Object.fromEntries(srv.guilds.map(g=>[g.id, baseLv2s[g.id]]));

      for(let d=1; d<=days; d++){
        const prevPlan = tempPlan[d-1]||{};
        const gainCount = Object.fromEntries(srv.guilds.map(g=>[g.id,0]));
        const unplacedLv1Used = Object.fromEntries(srv.guilds.map(g=>[g.id,0]));

        let dayIsLocked = false;
        if(startDt){
          const colDate = new Date(startDt.getTime());
          colDate.setDate(colDate.getDate()+d-1);
          if(colDate.getTime() < today.getTime()) dayIsLocked = true;
        }
        
        if(dayIsLocked){
          tempPlan[d] = {...(srv.plan[d]||{})};
          for(const k of mapData.kingdoms){
            const owner = tempPlan[d][k.id];
            if(!owner) continue;
            const prevOwner = prevPlan[k.id]||'';
            if(prevOwner!==owner) gainCount[owner]++;
            gPts[owner]   += pts[k.type];
            if(k.type==='lv3') lv3Days[owner]++;
            if(k.type==='lv2') lv2Days[owner]++;
            const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===owner).map(([k2])=>k2);
            if(prevHeld.length===0 && k.type==='lv1') unplacedLv1Used[owner]++;
          }
          continue;
        }

        // Lock anything already on the grid — optimizer only fills blanks.
        tempPlan[d] = {};
        const manuallyLocked = new Set();

        for(const k of mapData.kingdoms){
          const owner = (srv.plan[d]||{})[k.id];
          if(!owner) continue;  // blank — optimizer will fill this
          tempPlan[d][k.id] = owner;
          manuallyLocked.add(k.id);
          const prevOwner = prevPlan[k.id]||'';
          if(prevOwner!==owner) gainCount[owner]++;
          gPts[owner]   += pts[k.type];
          if(k.type==='lv3') lv3Days[owner]++;
          if(k.type==='lv2') lv2Days[owner]++;
          const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===owner).map(([k2])=>k2);
          if(prevHeld.length===0 && k.type==='lv1') unplacedLv1Used[owner]++;
        }

        const eligible = new Map();
        for(const k of kingdoms){
          const prevOwner = prevPlan[k.id]||'';
          let cands = srv.guilds.filter(g=>{
            if(prevOwner===g.id) return true;
            const held = Object.entries(prevPlan).filter(([,g2])=>g2===g.id).map(([k2])=>k2);
            if(held.length===0 && k.type==='lv1') return true;
            return held.some(pk=>adj[pk]&&adj[pk].includes(k.id));
          }).map(g=>g.id);
          // NO nuclear fallback — if no guild can legally declare, eligible stays empty                                                    
          // Phase 4 & Final Guarantee will leave town blank rather than violate adjacency  
          eligible.set(k.id, cands);
        }

        const unassigned = [...kingdoms]
          .filter(k => !manuallyLocked.has(k.id))
          .sort((a,b)=>{
            const diff = eligible.get(a.id).length - eligible.get(b.id).length;
            return diff!==0 ? diff : pts[b.type]-pts[a.type];
          });

        for(const k of unassigned){
          const prevOwner = prevPlan[k.id]||'';

          const opts = eligible.get(k.id).filter(gid=>{
            if(k.id==='Darkwick' && prevOwner!==gid && !canDeclareDarkwick(prevPlan,gid,mapData)) return false;
            
            if(prevOwner!==gid){
              let maxGain = maxGainGlobal;
              const gObj = srv.guilds.find(x => x.id === gid);
              if (gObj && gObj.isSmall) maxGain = 1;
              else if(srv.mode==='goc'){
                const twoDec = Object.values(gainCount).filter(c=>c>=2).length;
                if(gainCount[gid]===1 && twoDec>=8) maxGain=1;
              }
              if(gainCount[gid]>=maxGain) return false;
            }
            const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===gid).map(([k2])=>k2);
            if(prevHeld.length===0 && k.type==='lv1' && unplacedLv1Used[gid]>=2) return false;
            if(prevHeld.length===0 && k.type!=='lv1') return false; 
            if(k.type==='lv3' && lv3Days[gid]>=maxLv3) return false;
            if(k.type==='lv2' && lv2Days[gid]>=maxLv2) return false;
            return true;
          });

          if(!opts.length){
            const fallback1 = eligible.get(k.id).filter(gid => {
              const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===gid).map(([k2])=>k2);
              if(prevHeld.length===0 && k.type==='lv1' && unplacedLv1Used[gid]>=2) return false;
              if(prevHeld.length===0 && k.type!=='lv1') return false;
              if(k.id==='Darkwick' && prevOwner!==gid && !canDeclareDarkwick(prevPlan,gid,mapData)) return false;

              if(prevOwner!==gid){
                let mg = maxGainGlobal;
                const gObj = srv.guilds.find(x => x.id === gid);
                if (gObj && gObj.isSmall) mg = 1;
                else if (srv.mode === 'goc') {
                    const twoDec = Object.values(gainCount).filter(c => c >= 2).length;
                    if (gainCount[gid] === 1 && twoDec >= 8) mg = 1;
                }
                if(gainCount[gid] >= mg) return false;
              }
              return true;
            });

            if(fallback1.length){
              fallback1.sort((a,b) => {
                const ca = k.type==='lv3' ? lv3Days[a] : k.type==='lv2' ? lv2Days[a] : gPts[a];
                const cb = k.type==='lv3' ? lv3Days[b] : k.type==='lv2' ? lv2Days[b] : gPts[b];
                return ca - cb;
              });
              const fWinner = fallback1[0];
              tempPlan[d][k.id] = fWinner;
              if(prevOwner!==fWinner) gainCount[fWinner]++;
              gPts[fWinner] += pts[k.type];
              if(k.type==='lv3') lv3Days[fWinner]++;
              if(k.type==='lv2') lv2Days[fWinner]++;
            } else {
               const fallback2 = eligible.get(k.id).filter(gid => {
                   const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===gid).map(([k2])=>k2);
                   if(prevHeld.length===0 && k.type!=='lv1') return false; 
                   return true;
               });

               if(fallback2.length > 0) {
                   fallback2.sort((a,b) => gPts[a] - gPts[b]); 
                   const eWinner = fallback2[0];
                   tempPlan[d][k.id] = eWinner;
                   if(prevOwner!==eWinner) gainCount[eWinner]++;
                   gPts[eWinner] += pts[k.type];
                   if(k.type==='lv3') lv3Days[eWinner]++;
                   if(k.type==='lv2') lv2Days[eWinner]++;
               } else {
                   // Last resort: any guild, fewest points wins — Phase 4 will catch
                   // adjacency violations and tidy up, but nothing stays blank
                   const lastResort = prevOwner
                     ? prevOwner
                     : [...srv.guilds].sort((a,b) => gPts[a.id] - gPts[b.id])[0]?.id;
                   if(lastResort){
                     tempPlan[d][k.id] = lastResort;
                     gPts[lastResort] += pts[k.type];
                     if(k.type==='lv3') lv3Days[lastResort]++;
                     if(k.type==='lv2') lv2Days[lastResort]++;
                   }
               }
            }
            continue;
          }

          opts.sort((a,b)=>{
            const scoreA = guildNeedScore(a, k, gPts, lv3Days, lv2Days, absoluteTarget, lv3Target, lv2Target, targetPts, targetLv3, targetLv2, biases, wPts, wLv3, wLv2, maxLv3, maxLv2, prevPlan, wMove);
            const scoreB = guildNeedScore(b, k, gPts, lv3Days, lv2Days, absoluteTarget, lv3Target, lv2Target, targetPts, targetLv3, targetLv2, biases, wPts, wLv3, wLv2, maxLv3, maxLv2, prevPlan, wMove);
            return scoreB - scoreA;
          });

          const winner = opts[0];
          tempPlan[d][k.id] = winner;
          if(prevOwner!==winner) gainCount[winner]++;
          gPts[winner] += pts[k.type];
          if(k.type==='lv3') lv3Days[winner]++;
          if(k.type==='lv2') lv2Days[winner]++;
          const prevHeldW = Object.entries(prevPlan).filter(([,g2])=>g2===winner).map(([k2])=>k2);
          if(prevHeldW.length===0 && k.type==='lv1'){
            unplacedLv1Used[winner]++;
          }
        }

        // ── PHASE 2: Survival ─────────────────
        let survivalIssues = true, survivalIters = 0;
        while(survivalIssues && survivalIters<20){
          survivalIssues = false; survivalIters++;
          const heldCount = Object.fromEntries(srv.guilds.map(g=>[g.id,0]));
          for(const k of kingdoms) if(tempPlan[d][k.id]) heldCount[tempPlan[d][k.id]]++;

          for(const g of srv.guilds){
            if(heldCount[g.id]>0) continue;
            survivalIssues = true;
            const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===g.id).map(([k2])=>k2);

            const targets = prevHeld.length>0 ? prevHeld : kingdoms.filter(k=>eligible.get(k.id).includes(g.id)).map(k=>k.id);
            let restored = false;
            
            for(const pk2 of targets){
              if (manuallyLocked.has(pk2)) continue; 
              const kdm = mapData.kingdoms.find(x=>x.id===pk2);
              if(!kdm) continue;
              
              const prevOwner = prevPlan[pk2] || '';
              if (prevOwner !== g.id) {
                  let mg = maxGainGlobal;
                  const gObj = srv.guilds.find(x => x.id === g.id);
                  if (gObj && gObj.isSmall) mg = 1;
                  else if (srv.mode === 'goc') {
                      const twoDec = Object.values(gainCount).filter(c => c >= 2).length;
                      if (gainCount[g.id] === 1 && twoDec >= 8) mg = 1;
                  }
                  if (gainCount[g.id] >= mg) continue;
              }

              if(kdm.id==='Darkwick' && !canDeclareDarkwick(prevPlan,g.id,mapData)) continue;
              if(kdm.type==='lv3' && lv3Days[g.id]>=maxLv3) continue;
              if(kdm.type==='lv2' && lv2Days[g.id]>=maxLv2) continue;
              if(prevHeld.length===0 && kdm.type==='lv1' && unplacedLv1Used[g.id]>=2) continue;
              if(prevHeld.length===0 && kdm.type!=='lv1') continue;
              
              const thief = tempPlan[d][pk2];
              if(thief && heldCount[thief]>1){
                tempPlan[d][pk2]=g.id; heldCount[g.id]++; heldCount[thief]--;
                gPts[thief]-=pts[kdm.type]; gPts[g.id]+=pts[kdm.type];
                if(kdm.type==='lv3'){lv3Days[thief]--;lv3Days[g.id]++;}
                if(kdm.type==='lv2'){lv2Days[thief]--;lv2Days[g.id]++;}
                gainCount[thief]=Math.max(0,gainCount[thief]-1);
                
                if (prevOwner !== g.id) gainCount[g.id]++;
                
                if(prevHeld.length===0 && kdm.type==='lv1'){ unplacedLv1Used[g.id]++; }
                restored=true; break;
              }
            }
            if(!restored){
              for(const pk2 of targets){
                if (manuallyLocked.has(pk2)) continue; 
                const kdm=mapData.kingdoms.find(x=>x.id===pk2); if(!kdm) continue;
                
                const prevOwner = prevPlan[pk2] || '';
                if (prevOwner !== g.id) {
                    let mg = maxGainGlobal;
                    const gObj = srv.guilds.find(x => x.id === g.id);
                    if (gObj && gObj.isSmall) mg = 1;
                    else if (srv.mode === 'goc') {
                        const twoDec = Object.values(gainCount).filter(c => c >= 2).length;
                        if (gainCount[g.id] === 1 && twoDec >= 8) mg = 1;
                    }
                    if (gainCount[g.id] >= mg) continue;
                }

                if(prevHeld.length===0 && kdm.type==='lv1' && unplacedLv1Used[g.id]>=2) continue;
                if(prevHeld.length===0 && kdm.type!=='lv1') continue;
                const thief=tempPlan[d][pk2];
                if(thief){
                  tempPlan[d][pk2]=g.id; heldCount[g.id]++; heldCount[thief]--;
                  gPts[thief]-=pts[kdm.type]; gPts[g.id]+=pts[kdm.type];
                  if(kdm.type==='lv3'){lv3Days[thief]=Math.max(0,lv3Days[thief]-1);lv3Days[g.id]++;}
                  if(kdm.type==='lv2'){lv2Days[thief]=Math.max(0,lv2Days[thief]-1);lv2Days[g.id]++;}
                  gainCount[thief]=Math.max(0,gainCount[thief]-1);
                  
                  if (prevOwner !== g.id) gainCount[g.id]++; 
                  
                  if(prevHeld.length===0 && kdm.type==='lv1'){ unplacedLv1Used[g.id]++; }
                  restored=true; break;
                }
              }
            }
            if(!restored) {
                const affordable = kingdoms.filter(k=> {
                    if (manuallyLocked.has(k.id)) return false; 
                    if(!eligible.get(k.id).includes(g.id)) return false;
                    
                    let mg = maxGainGlobal;
                    const gObj = srv.guilds.find(x => x.id === g.id);
                    if (gObj && gObj.isSmall) mg = 1;
                    else if (srv.mode === 'goc') {
                        const twoDec = Object.values(gainCount).filter(c => c >= 2).length;
                        if (gainCount[g.id] === 1 && twoDec >= 8) mg = 1;
                    }
                    if(gainCount[g.id] >= mg) return false;
                    
                    if(prevHeld.length === 0 && k.type === 'lv1' && unplacedLv1Used[g.id] >= 2) return false;
                    
                    const cLv3 = baseLv3s[g.id] + countType(tempPlan, g.id, 'lv3', d, mapData);
                    const cLv2 = baseLv2s[g.id] + countType(tempPlan, g.id, 'lv2', d, mapData);
                    if(k.type === 'lv3' && cLv3 >= maxLv3) return false;
                    if(k.type === 'lv2' && cLv2 >= maxLv2) return false;
                    
                    return true;
                }).sort((a,b)=>{
                    return eligible.get(a.id).length - eligible.get(b.id).length || pts[a.type] - pts[b.type];
                });
                
                for (const chosen of affordable) {
                    const currentOwner = tempPlan[d][chosen.id];
                    if(currentOwner && heldCount[currentOwner] <= 1) continue; 
                    
                    survivalIssues = true; 
                    const prevOwner = prevPlan[chosen.id]||'';
                    if(prevOwner!==g.id) gainCount[g.id]++;
                    if(prevOwner!==currentOwner && currentOwner && gainCount[currentOwner] > 0) {
                        gainCount[currentOwner] = Math.max(0, gainCount[currentOwner]-1);
                    }
                    
                    tempPlan[d][chosen.id] = g.id;
                    heldCount[g.id]++;
                    if (currentOwner) heldCount[currentOwner]--;
                    gPts[g.id] += pts[chosen.type];
                    if (currentOwner) gPts[currentOwner] -= pts[chosen.type];
                    
                    if(prevHeld.length === 0 && chosen.type === 'lv1') unplacedLv1Used[g.id]++;
                    break; 
                }
            }
          }
        }

        // ── PHASE 3: Simulated Annealing (replaces hill-climbing) ──────────
        // QUICK WIN 5: SA escapes local optima, accepts worse moves early
        const saIterations = 200;
        const saStartTemp  = 50;
        const saEndTemp    = 0.5;
        let currentScore = planScore(tempPlan, gPts, lv3Days, lv2Days);

        for(let saIter=0; saIter<saIterations; saIter++){
          const temp = saStartTemp * Math.pow(saEndTemp / saStartTemp, saIter / saIterations);

          // Pick a random movable kingdom
          const movable = kingdoms.filter(k =>
            !manuallyLocked.has(k.id) && tempPlan[d][k.id] &&
            kingdoms.filter(k2 => tempPlan[d][k2.id] === tempPlan[d][k.id]).length > 1
          );
          if (movable.length === 0) break;

          const k = movable[Math.floor(Math.random() * movable.length)];
          const curOwner = tempPlan[d][k.id];
          const prevOwner = prevPlan[k.id] || '';

          // Find valid alternative guilds
          const altCandidates = (eligible.get(k.id) || []).filter(altGid => {
            if (altGid === curOwner) return false;
            if (k.id === 'Darkwick' && prevOwner !== altGid && !canDeclareDarkwick(prevPlan, altGid, mapData)) return false;
            if (k.type === 'lv3' && lv3Days[altGid] >= maxLv3) return false;
            if (k.type === 'lv2' && lv2Days[altGid] >= maxLv2) return false;
            const altPrevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===altGid).map(([k2])=>k2);
            if (altPrevHeld.length === 0 && k.type === 'lv1' && unplacedLv1Used[altGid] >= 2) return false;
            if (altPrevHeld.length === 0 && k.type !== 'lv1') return false;
            if (prevOwner !== altGid) {
              let maxGain = maxGainGlobal;
              const gObj = srv.guilds.find(x => x.id === altGid);
              if (gObj && gObj.isSmall) maxGain = 1;
              else if (srv.mode === 'goc') {
                const twoDec = Object.values(gainCount).filter(c => c >= 2).length;
                if (gainCount[altGid] === 1 && twoDec >= 8) maxGain = 1;
              }
              if (gainCount[altGid] >= maxGain) return false;
            }
            return true;
          });

          if (altCandidates.length === 0) continue;
          const altGid = altCandidates[Math.floor(Math.random() * altCandidates.length)];
          const altPrevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===altGid).map(([k2])=>k2);

          // Apply move
          gPts[curOwner] -= pts[k.type]; gPts[altGid] += pts[k.type];
          if (k.type === 'lv3') { lv3Days[curOwner]--; lv3Days[altGid]++; }
          if (k.type === 'lv2') { lv2Days[curOwner]--; lv2Days[altGid]++; }
          tempPlan[d][k.id] = altGid;

          const newScore = planScore(tempPlan, gPts, lv3Days, lv2Days);
          const delta = newScore - currentScore;

          // Accept if better, or with probability if worse
          if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
            // Accept move
            currentScore = newScore;
            if (prevOwner !== curOwner) gainCount[curOwner] = Math.max(0, gainCount[curOwner] - 1);
            if (prevOwner !== altGid) gainCount[altGid]++;
            if (altPrevHeld.length === 0 && k.type === 'lv1') unplacedLv1Used[altGid]++;
            const curPrevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===curOwner).map(([k2])=>k2);
            if (curPrevHeld.length === 0 && k.type === 'lv1') unplacedLv1Used[curOwner] = Math.max(0, unplacedLv1Used[curOwner] - 1);
          } else {
            // Revert move
            tempPlan[d][k.id] = curOwner;
            gPts[curOwner] += pts[k.type]; gPts[altGid] -= pts[k.type];
            if (k.type === 'lv3') { lv3Days[curOwner]++; lv3Days[altGid]--; }
            if (k.type === 'lv2') { lv2Days[curOwner]++; lv2Days[altGid]--; }
          }
        }

        // ── PHASE 4: Fill remaining blanks — respects adjacency, caps & Darkwick rules ──
        // Only assigns to eligible (adjacent) guilds with cap room.
        // If no valid guild exists, leaves town blank (valid in Ragnarok/GoC rules).
        for(const k of kingdoms){
          if(tempPlan[d][k.id]) continue;
          if(manuallyLocked && manuallyLocked.has(k.id)) continue;

          // Score by weighted deficit
          const scoreGuild = (gid) => {
            const l3Def = (k.type==='lv3' ? Math.max(0, targetLv3[gid] - lv3Days[gid]) : 0) * wLv3 * 10;
            const l2Def = (k.type==='lv2' ? Math.max(0, targetLv2[gid] - lv2Days[gid]) : 0) * wLv2 * 5;
            const ptsDef = Math.max(0, targetPts[gid] - gPts[gid]) * wPts * 0.01;
            return l3Def + l2Def + ptsDef;
          };

          // Eligible guilds with cap room AND Darkwick requirement check
          const validCands = (eligible.get(k.id)||[]).filter(gid => {
            if(k.type === 'lv3' && lv3Days[gid] >= maxLv3) return false;
            if(k.type === 'lv2' && lv2Days[gid] >= maxLv2) return false;
            // Darkwick can only be captured if guild holds 1+ Lv2 or 2+ Lv1 from prev day
            if(k.id === 'Darkwick' && prevPlan[k.id] !== gid && !canDeclareDarkwick(prevPlan, gid, mapData)) return false;
            return true;
          }).sort((a,b) => scoreGuild(b) - scoreGuild(a));

          const winner = validCands[0];
          if(!winner) continue; // leave blank — no eligible guild with cap room

          const prevOwner = prevPlan[k.id]||'';
          tempPlan[d][k.id] = winner;
          if(prevOwner !== winner) gainCount[winner] = (gainCount[winner]||0) + 1;
          gPts[winner] += pts[k.type];
          if(k.type==='lv3') lv3Days[winner]++;
          if(k.type==='lv2') lv2Days[winner]++;
        }
      } 

      const attemptScore = planScore(tempPlan, gPts, lv3Days, lv2Days);
      if(attemptScore < bestScore){
        bestScore = attemptScore;
        bestPlan  = JSON.parse(JSON.stringify(tempPlan));
      }
      if(attemptScore < 0.3) break;

      // ── QUICK WIN 2: Target-based bias learning (replaces magic number weights) ──
      for(const g of srv.guilds){
        const ptErr = (targetPts[g.id] - gPts[g.id])   * wPts * 0.1;
        const l3Err = (targetLv3[g.id] - lv3Days[g.id]) * wLv3 * 0.5;
        const l2Err = (targetLv2[g.id] - lv2Days[g.id]) * wLv2 * 0.3;
        biases[g.id] += ptErr + l3Err + l2Err;
      }
    } 

    if(!bestPlan){
      alert("No valid plan could be found.");
      return;
    }

    // ── FINAL GUARANTEE: fill blanks in bestPlan — respects adjacency & caps ──
    // Only assigns to eligible (adjacent) guilds with cap room.
    // If no valid guild exists, leaves town blank.
    {
      const mapData2 = getMapData(srv.mode, srv.mapKey);
      const adj2 = adjMap(srv.mode, srv.mapKey);
      const pts2 = {lv3:3, lv2:2, lv1:1};
      // Rebuild running totals from bestPlan
      const runPts  = Object.fromEntries(srv.guilds.map(g=>[g.id, parseInt(g.basePoints||0,10)||0]));
      const runLv3  = Object.fromEntries(srv.guilds.map(g=>[g.id, baseLv3s[g.id]]));
      const runLv2  = Object.fromEntries(srv.guilds.map(g=>[g.id, baseLv2s[g.id]]));
      for(let d=1; d<=days; d++){
        for(const k of mapData2.kingdoms){
          const owner = (bestPlan[d]||{})[k.id];
          if(owner) {
            runPts[owner]  += pts2[k.type];
            if(k.type==='lv3') runLv3[owner]++;
            if(k.type==='lv2') runLv2[owner]++;
          }
        }
      }
      // Eligibility check per day (same logic as getEligibleGuilds)
      for(let d=1; d<=days; d++){
        if(!bestPlan[d]) bestPlan[d] = {};
        const prevPlan = bestPlan[d-1] || {};
        for(const k of mapData2.kingdoms){
          if(bestPlan[d][k.id]) continue;
          // Build eligible guilds for this kingdom on this day
          const prevOwner = prevPlan[k.id] || '';
          const eligibleIds = new Set();
          for(const g of srv.guilds){
            const gid = g.id;
            if(prevOwner === gid) { eligibleIds.add(gid); continue; }
            const held = Object.entries(prevPlan).filter(([,g2])=>g2===gid).map(([k2])=>k2);
            if(held.length === 0 && k.type === 'lv1') { eligibleIds.add(gid); continue; }
            if(held.some(pk => adj2[pk] && adj2[pk].includes(k.id))) { eligibleIds.add(gid); }
          }
          // Filter by cap room + eligibility + Darkwick requirement, sort by deficit
          const validCands = [...eligibleIds].filter(gid => {
            if(k.type === 'lv3' && runLv3[gid] >= maxLv3) return false;
            if(k.type === 'lv2' && runLv2[gid] >= maxLv2) return false;
            // Darkwick can only be captured if guild holds 1+ Lv2 or 2+ Lv1 from prev day
            if(k.id === 'Darkwick' && prevOwner !== gid && !canDeclareDarkwick(prevPlan, gid, mapData2)) return false;
            return true;
          }).sort((a,b) => {
            const deficitA = (k.type==='lv3' ? (targetLv3[a] - runLv3[a]) : 0) * wLv3 * 10
                           + (k.type==='lv2' ? (targetLv2[a] - runLv2[a]) : 0) * wLv2 * 5
                           + (targetPts[a] - runPts[a]) * wPts * 0.01;
            const deficitB = (k.type==='lv3' ? (targetLv3[b] - runLv3[b]) : 0) * wLv3 * 10
                           + (k.type==='lv2' ? (targetLv2[b] - runLv2[b]) : 0) * wLv2 * 5
                           + (targetPts[b] - runPts[b]) * wPts * 0.01;
            return deficitB - deficitA;
          });
          const winner = validCands[0];
          if(!winner) continue; // leave blank — no eligible guild with cap room
          bestPlan[d][k.id] = winner;
          runPts[winner]  += pts2[k.type];
          if(k.type==='lv3') runLv3[winner]++;
          if(k.type==='lv2') runLv2[winner]++;
        }
      }
    }

    srv.plan = bestPlan;
    save(); renderAll();

  } catch(err){
    console.error("Optimizer crashed:", err);
    alert("Optimizer encountered an error. Check the console for details.");
    renderAll();
  }
}

// ── Need-score: how much does guild gid "deserve" kingdom k right now? ──────
// QUICK WIN 4: Replaced 15+ magic numbers with target-based scoring using fair quotas
function guildNeedScore(gid, k, gPts, lv3Days, lv2Days, absTgt, l3Tgt, l2Tgt, targetPts, targetLv3, targetLv2, biases, wPts, wLv3, wLv2, pacingMaxLv3, pacingMaxLv2, prevPlan, wMove){
  const srv = activeSrv();
  const gObj = srv.guilds.find(x => x.id === gid);
  const isSmall = gObj && gObj.isSmall;

  // ── DEFICITS vs TARGETS ──
  const ptsDeficit  = Math.max(0, targetPts[gid]  - gPts[gid]);
  const l3Deficit   = Math.max(0, targetLv3[gid]  - lv3Days[gid]);
  const l2Deficit   = Math.max(0, targetLv2[gid]  - lv2Days[gid]);
  const bias        = biases[gid] || 0;

  let score = 0;

  // ── INERTIA / STICKINESS (same logic, calibrated to wMove scale) ──
  if (k.id !== 'Darkwick' && prevPlan[k.id] === gid) {
      if (k.type === 'lv2') {
          if (!k.adj.includes('Darkwick')) {
              score += wMove * 30; // Outer base
          } else {
              let prevDormsCount = 0;
              for (const [kId, owner] of Object.entries(prevPlan)) {
                  if (owner === gid) {
                      const kObj = getMapData(srv.mode, srv.mapKey).kingdoms.find(x => x.id === kId);
                      if (kObj && kObj.type === 'lv2') prevDormsCount++;
                  }
              }
              score += wMove * (prevDormsCount <= 1 ? 30 : 5);
          }
      } else if (k.type === 'lv1') {
          score += wMove * 16; // Lv1 town
      } else {
          score += wMove * 1;  // Darkwick (rarely held same owner)
      }
  }

  const prevHeld = Object.entries(prevPlan).filter(([,g2])=>g2===gid);
  const isEnteringMap = prevHeld.length === 0;

  // ── PATHFINDING GRAVITY: reward progress toward Darkwick ──
  if (k.id !== 'Darkwick' && l3Deficit > 0) {
      const mapDataLocal = getMapData(srv.mode, srv.mapKey);
      const adjMapLocal = adjMap(srv.mode, srv.mapKey);

      let currentMinDist = 999;
      for (const [kId, owner] of Object.entries(prevPlan)) {
          if (owner === gid) {
              const dist = distanceToDarkwick(kId, adjMapLocal, mapDataLocal);
              if (dist < currentMinDist) currentMinDist = dist;
          }
      }

      const kDist = distanceToDarkwick(k.id, adjMapLocal, mapDataLocal);

      // Reward towns closer to Darkwick (scaled by deficit and wLv3)
      if (kDist <= 5) score += wLv3 * (6 - kDist) * 20 * l3Deficit;

      // MASSIVE reward for stepping closer
      if (kDist < currentMinDist) {
          score += wLv3 * 600 * l3Deficit;
      }

      // Bridge squatting (distance 1)
      if (kDist === 1) {
          score += wLv3 * 400 * l3Deficit;
      }
  }

  // ── TIER ALLOCATIONS: quadratic deficit scoring ──
  if(k.type === 'lv3'){
    score += wLv3 * l3Deficit * l3Deficit * 20;  // quadratic: more deficit = much higher score
    const capRoom = Math.max(0, pacingMaxLv3 - lv3Days[gid]);
    score += capRoom * 2; // small bonus for having cap room
    score -= bias * 0.5;  // bias penalizes over-represented guilds
    score += Math.random() * wPts * 0.5; // small jitter
  } else if(k.type === 'lv2'){
    score += wLv2 * l2Deficit * l2Deficit * 5;
    const capRoom = Math.max(0, pacingMaxLv2 - lv2Days[gid]);
    score += capRoom * 1;
    const dwRoom = Math.max(0, pacingMaxLv3 - lv3Days[gid]);
    if(dwRoom > 0) score += wLv3 * 1; // slight preference if still needs Darkwick
    score -= bias * 0.3;
    score += Math.random() * wPts * 0.5;
  }
  // ── LEVEL 1 POINT BALANCING ──
  else {
    if(isSmall){
      score += isEnteringMap ? 20 : 1;
    } else {
      score += wPts * ptsDeficit * ptsDeficit * 0.02;
      score += wPts * ptsDeficit * 0.2;
    }
  }

  return score;
}

// ══════════════════════════════════════════════════════════════
//  REPAIR
// ══════════════════════════════════════════════════════════════

let repairChanges={};

function openRepair(){
  const srv=activeSrv();if(!srv)return;
  const days=numDays(srv);
  const mapData=getMapData(srv.mode,srv.mapKey);
  repairChanges={};

  const daysel=document.getElementById('repair-day');
  // Account for Day 0 up to the final day
  daysel.innerHTML=Array.from({length:days+1},(_,d)=>`<option value="${d}">${dateLabelShort(srv,d).replace(/<[^>]+>/g,'')}</option>`).join('');

  const ksel=document.getElementById('repair-kingdom');
  ksel.innerHTML=mapData.kingdoms.map(k=>`<option value="${k.id}">${k.id}</option>`).join('');

  renderRepairTable();
  document.getElementById('modal-repair').classList.add('open');
}

function renderRepairTable(){
  const srv=activeSrv();if(!srv)return;
  const fromDay=+document.getElementById('repair-day').value;
  const focusKingdom=document.getElementById('repair-kingdom').value;
  const days=numDays(srv);
  const mapData=getMapData(srv.mode,srv.mapKey);
  const gOpts=[['','—'],...srv.guilds.map(g=>[g.id,g.name])];

  const k=mapData.kingdoms.find(x=>x.id===focusKingdom);
  if(!k){document.getElementById('repair-body').innerHTML='';return;}

  let html=`<div style="margin-bottom:8px;font-size:11px;color:var(--text2)">
    Reassign <strong style="color:var(--accent2)">${k.id}</strong> from ${dateLabelShort(srv,fromDay).replace(/<[^>]+>/g,'')} onwards.
    Adjacent towns: <span style="color:var(--text)">${k.adj.join(', ')}</span>
  </div>
  <table class="repair-tbl">
    <thead><tr><th>Day</th><th>Current owner</th><th>New owner</th><th>Note</th></tr></thead>
    <tbody>`;

  // Loop from the deviation day to the end of the event
  for(let d=fromDay;d<=days;d++){
    const curGid=(srv.plan[d]||{})[k.id]||'';
    const curG=srv.guilds.find(x=>x.id===curGid);
    const repKey=`${d}_${k.id}`;
    const repVal=repairChanges[repKey]!==undefined?repairChanges[repKey]:curGid;
    html+=`<tr>
      <td style="color:var(--text2)">${dateLabelShort(srv,d).replace(/<[^>]+>/g,'')}</td>
      <td style="color:${curG?curG.color:'var(--text3)'}">
        ${curG?esc(curG.name):'<em>empty</em>'}
      </td>
      <td>
        <select class="csel" style="background:var(--bg3);padding:3px 6px" 
          onchange="repairChange(${d},'${k.id}',this.value)">
          ${gOpts.map(([v,n])=>`<option value="${v}"${v===repVal?' selected':''}>${esc(n)}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:10px;color:var(--text3)">
        ${d===fromDay?'← deviation day':''}
      </td>
    </tr>`;
  }
  html+='</tbody></table>';

  html+=`<div style="margin-top:14px;font-size:11px;color:var(--text2)">
    <strong style="color:var(--text)">Adjacent kingdom owners on ${dateLabelShort(srv,fromDay).replace(/<[^>]+>/g,'')}:</strong>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
    ${k.adj.map(adjId=>{
      const adjGid=(srv.plan[fromDay]||{})[adjId]||'';
      const adjG=srv.guilds.find(x=>x.id===adjGid);
      return `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:4px 8px">
        <span style="color:var(--text)">${adjId}</span>
        <span style="color:${adjG?adjG.color:'var(--text3)'}"> → ${adjG?esc(adjG.name):'empty'}</span>
      </div>`;
    }).join('')}
    </div>
  </div>`;

  document.getElementById('repair-body').innerHTML=html;
}

function repairChange(day,kid,gid){
  repairChanges[`${day}_${kid}`]=gid;
}

function applyRepair(){
  const srv=activeSrv();if(!srv)return;
  for(const[key,gid]of Object.entries(repairChanges)){
    const[d,kid]=key.split('_');
    const dayNum=+d;
    if(!srv.plan[dayNum])srv.plan[dayNum]={};
    srv.plan[dayNum][kid]=gid;
  }
  repairChanges={};
  closeModal('modal-repair');
  save();renderAll();
}

// ══════════════════════════════════════════════════════════════
//  SERVER MANAGEMENT
// ══════════════════════════════════════════════════════════════

function openAdd(){
  const t=new Date(),fmt=d=>d.toISOString().slice(0,10);
  document.getElementById('ns-name').value='';
  document.getElementById('ns-start').value=fmt(t);
  onAddModalModeChange(); // populates map list AND sets end date from today
  document.getElementById('modal-add').classList.add('open');
}

function onAddModalModeChange(){
  const mode = document.getElementById('ns-mode').value;
  const maps = getMapList(mode);
  document.getElementById('ns-map').innerHTML = maps.map(m=>`<option value="${m.key}">${m.name}</option>`).join('');
  onAddModalStartChange();
}

function onAddModalStartChange(){
  const mode  = document.getElementById('ns-mode').value;
  const start = document.getElementById('ns-start').value;
  if(!start) return;
  const eventDays = mode === 'goc' ? 12 : 6;  // GoC = 12 days, Rag = 6 days
  const [yy, mm, dd] = start.split('-');
  const endDt = new Date(+yy, mm - 1, +dd);
  endDt.setDate(endDt.getDate() + eventDays - 1); // end = start + (days-1)
  document.getElementById('ns-end').value = endDt.toISOString().slice(0, 10);
}

function confirmAdd(){
  const name=document.getElementById('ns-name').value.trim()||'Server '+(servers.length+1);
  const mode=document.getElementById('ns-mode').value;
  const mapKey=document.getElementById('ns-map').value;
  const start=document.getElementById('ns-start').value;
  const end=document.getElementById('ns-end').value;
  const s=mkSrv(name,mode,mapKey,start,end);
  servers.push(s);activeId=s.id;
  closeModal('modal-add');
  save();renderTabs();renderAll();
}

function switchSrv(id){activeId=id;save();renderTabs();renderAll();}

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
    // Flash the saved text to ease paranoia
    const ss = document.getElementById('save-status');
    if(ss){
      ss.textContent = 'Saving...';
      ss.style.color = 'var(--accent)';
      clearTimeout(window.saveTimer);
      window.saveTimer = setTimeout(()=>{
        ss.textContent = '✓ Saved to browser';
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
  btn.textContent = '📸 Zipping...';
  
  try {
    const gridEl = document.getElementById('capture-grid');
    const statsEl = document.getElementById('capture-stats');
    const mainEl = document.getElementById('main-content');
    
    // --- BULLETPROOF EXPANSION ---
    function expandForCapture(el) {
      const originalStyles = [];
      const wraps = el.querySelectorAll('.tbl-wrap');
      wraps.forEach(wrap => {
        originalStyles.push({ el: wrap, prop: 'overflow', val: wrap.style.overflow });
        wrap.style.overflow = 'visible';
      });
      // Force the wrapper itself to push out to its maximum natural width
      originalStyles.push({ el: el, prop: 'width', val: el.style.width });
      el.style.width = 'max-content';
      return originalStyles;
    }

    function restoreStyles(styles) {
      styles.forEach(({ el, prop, val }) => { el.style[prop] = val; });
    }

    // 1. Expand the target sections
    const gridStyles = expandForCapture(gridEl);
    const statsStyles = expandForCapture(statsEl);
    
    // Get the new, unconstrained widths
    const gridWidth = gridEl.scrollWidth;
    const statsWidth = statsEl.scrollWidth;
    const maxWidth = Math.max(gridWidth, statsWidth) + 100;

    // 2. Temporarily stretch the body and main container so they don't clip the tables
    const origBodyWidth = document.body.style.width;
    const origMainMaxWidth = mainEl.style.maxWidth;
    document.body.style.width = maxWidth + 'px';
    mainEl.style.maxWidth = 'none';
    
    // 3. Take the screenshots, explicitly telling the camera to use the virtual widths
    const canvasGrid = await html2canvas(gridEl, {
      backgroundColor: '#191425',
      scale: 2,
      width: gridWidth,
      windowWidth: gridWidth
    });
    
    const canvasStats = await html2canvas(statsEl, {
      backgroundColor: '#191425',
      scale: 2,
      width: statsWidth,
      windowWidth: statsWidth
    });
    
    // 4. Immediately shrink everything back to normal
    restoreStyles(gridStyles);
    restoreStyles(statsStyles);
    document.body.style.width = origBodyWidth;
    mainEl.style.maxWidth = origMainMaxWidth;
    // ------------------------------
    
    const srv = activeSrv();
    const prefix = srv ? srv.name.replace(/[^a-z0-9]/gi, '_') : 'map';
    
    // Extract the raw Base64 image data
    const gridData = canvasGrid.toDataURL('image/png').split(',')[1];
    const statsData = canvasStats.toDataURL('image/png').split(',')[1];
    
    // Initialize JSZip and create a folder
    const zip = new JSZip();
    const folderName = `${prefix}_snapshots`;
    const imgFolder = zip.folder(folderName);
    
    // Add the images into the zip folder
    imgFolder.file(`${prefix}_grid.png`, gridData, { base64: true });
    imgFolder.file(`${prefix}_stats.png`, statsData, { base64: true });
    
    // Generate the .zip file and trigger a single download
    const zipContent = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipContent);
    link.download = `${folderName}.zip`;
    link.click();
    
    URL.revokeObjectURL(link.href);
    
    btn.textContent = '✓ Saved!';
    btn.style.color = 'var(--green)';
    
  } catch (err) {
    console.error("Screenshot/Zip failed:", err);
    btn.textContent = '❌ Error';
  }
  
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.color = '';
  }, 2000);
}
// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
load();renderTabs();renderAll();