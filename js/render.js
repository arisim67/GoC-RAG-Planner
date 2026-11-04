// js/render.js
// Builds the page: server tabs, settings, guilds, status, planning grid, stats and daily messages.

import { state, activeSrv, numDays, save, numDisplayDays } from './state.js';
import { esc, dateLabel, dateLabelShort } from './ui.js';
import { calcScores, calcOcc, validateAdj, validateWipes, calcDec, kPts, getEligibleGuilds } from './calc.js';
import { openTabCtx, openAdd } from './servers.js';
import { renderFillSel } from './grid-fill.js';
import { getMapData, getMapList } from './maps/index.js';
// Each mode's targets come from that mode's own model: Game of Claws has rules Ragnarok does not
// (Darkwick needs a dorm or two lv1 towns behind it), so the GoC model is the only one that knows
// which towns are really winnable. Reading GoC targets out of the Ragnarok model overstated them.
import { getPerfectTargets as getGocTargets } from './solver/model_goc.js';
import { getPerfectTargets as getRagnarokTargets } from './solver/model_ragnarok.js';

export function renderTabs(){
  const bar=document.getElementById('tabs-bar');
  bar.innerHTML='';
  for(const s of state.servers){
    const b=document.createElement('button');
    b.className='tab-btn'+(s.id===state.activeId?' active':'');
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

export function renderAll(){
  const srv=activeSrv();
  const mc=document.getElementById('main-content');
  if(!srv){mc.innerHTML='<div class="empty-state">No servers yet. Click <strong class="empty-state-cta">+ Add Server</strong> to get started.</div>';return;}
  const days=numDays(srv);
  const mapData=getMapData(srv.mode,srv.mapKey);
  const scores=calcScores(srv);
  const occ=calcOcc(srv);
  const issues=validateAdj(srv);
  const wipes = validateWipes(srv);
  const{dec,give}=calcDec(srv);
  const totalPts=mapData.kingdoms.reduce((s,k)=>s+kPts(k.type),0)*days;
  const totalBase=srv.guilds.reduce((s,g)=>s+(parseInt(g.basePoints||0,10)||0),0);
  const targets=(srv.mode==='goc'?getGocTargets:getRagnarokTargets)(srv, mapData);

  // Remember scroll positions so editing a cell doesn't snap the grid back to the left
  const scrollSel = '.tbl-wrap, .guild-list';
  const hScroll = [...mc.querySelectorAll(scrollSel)].map(w => w.scrollLeft);
  const pageY = window.scrollY;

  mc.innerHTML=`
    ${renderSettings(srv)}
    ${renderGuilds(srv)}
    ${renderStatus(srv,issues,wipes)}
    
    <!-- WRAPPER 1: The Grid -->
    <div class="capture-wrap" id="capture-grid">
      ${renderGrid(srv,days,mapData,issues,wipes)}
    </div>

    <!-- WRAPPER 2: The Stats -->
    <div class="capture-wrap capture-wrap-stats" id="capture-stats" data-tour="stats">
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

  // 🚨 NEW: Drag and Drop Initialization
  const guildListEl = document.getElementById('guild-list');
  if (guildListEl && !srv.isViewOnly && typeof Sortable !== 'undefined') {
    new Sortable(guildListEl, {
      handle: '.drag-handle', // Prevents accidental dragging when typing in inputs
      animation: 150,
      onEnd: function () {
        // Read the new DOM order via the data-id tags
        const newOrder = Array.from(guildListEl.children).map(row => row.dataset.id);
        // Rebuild the master guild array to match the new visual order
        srv.guilds = newOrder.map(id => srv.guilds.find(g => g.id === id));
        save();
        renderAll(); 
      }
    });
  }

  renderFillSel();
}

function renderSettings(srv){
  const maps=getMapList(srv.mode);
  const days=numDays(srv);
  
  // 🚨 VIEW-ONLY DASHBOARD
  if (srv.isViewOnly) {
    return `<div class="section view-only">
      <div class="sec-title view-only-title">👀 View-Only Mode</div>
      <div class="view-only-msg">
        You are viewing a shared plan: <strong>${esc(srv.name)}</strong>. To make your own changes, you must copy it.
      </div>
      <div class="btn-group">
        <button class="btn-gold" onclick="duplicateCurrentPlan()">📋 Duplicate to Edit</button>
        <button class="btn-accent btn-sync" id="btn-sync-cloud" onclick="syncFromCloud()">🔄 Pull Latest Updates</button>
        <button class="btn-accent btn-screenshot" onclick="takeScreenshots()">📸 Screenshots</button>
        <button class="btn-accent btn-export" onclick="exportServer()">📤 Export Data</button>
      </div>
      <div class="settings-meta">
        ${days} days planned · ${getMapData(srv.mode,srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
      </div>
    </div>`;
  }

  // STANDARD EDIT DASHBOARD
  return `<div class="section" data-tour="settings">
    <div class="sec-title">Server Settings</div>
    <div class="row">
      <div class="fg"><label>Server Name</label>
        <input class="settings-input" type="text" value="${esc(srv.name)}" onchange="updName(this.value)"></div>
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
        <input class="settings-input" type="date" value="${srv.startDate||''}" onchange="updStart(this.value)"></div>
      <div class="fg"><label>End Date</label>
        <input class="settings-input" type="date" value="${srv.endDate||''}" onchange="updEnd(this.value)"></div>
      <div class="fg"><label>&nbsp;</label>
        <div class="btn-group">
          <button class="btn" onclick="clearPlan()">Clear Plan</button>
          <button class="btn-accent btn-import" onclick="openImport()" data-tour="import">📥 Import</button>
          <button class="btn-accent btn-export" onclick="exportServer()">📤 Export Server</button>
          <button class="btn-accent btn-screenshot" onclick="takeScreenshots()">📸 Screenshots</button>
          <button id="opt-btn" class="btn-gold" data-tour="optimize" onclick="autoOptimize()">⚡ Auto-Optimize</button>
          
          ${srv.lastSolveTime ? `<span class="solve-badge">Last solve: ${srv.lastSolveTime}s</span>` : ''}
          
          ${srv.undoPlan ? `<button class="btn-accent btn-undo" onclick="undoOptimize()">↩ Undo Optimize</button>` : ''}
          <button class="btn-accent btn-share" id="btn-share-cloud" data-tour="share" onclick="publishToCloud()">🔗 Save to Cloud</button>
          <button class="btn-accent btn-sync" id="btn-sync-cloud" onclick="syncFromCloud()">🔄 Sync from Cloud</button>
        </div></div>
    </div>
    <div class="settings-meta">
      ${days} days planned · ${getMapData(srv.mode,srv.mapKey).kingdoms.length} kingdoms · ${srv.guilds.length} guilds
    </div>
  </div>`;
}

function renderGuilds(srv){
  // 🚨 Removed the .sort() function so the array stays in your manual dragged order
  const dAttr = srv.isViewOnly ? 'disabled' : '';

  return `<div class="section" data-tour="guilds">
    <div class="sec-title">Guilds</div>
    <div class="guild-list" id="guild-list">
      ${srv.guilds.map((g,i)=>`
        <div class="guild-row" data-id="${g.id}">
          ${!srv.isViewOnly ? `<div class="drag-handle">☰</div>` : ''}
          <div class="guild-dot" style="background:${g.color}"></div>
          
          <input class="guild-name-inp" data-guild-id="${g.id}" data-guild-field="name" value="${esc(g.name)}" placeholder="Guild name"
            oninput="updGuildName('${g.id}',this.value)" ${dAttr}>
            
          ${srv.mode === 'ragnarok' ? `
            <input type="checkbox" id="exc_${g.id}" class="guild-small-check" ${g.isExcluded ? 'checked' : ''} 
              onchange="updGuildExcluded('${g.id}', this.checked)" ${dAttr}>
            <label for="exc_${g.id}" class="guild-small-label"
             title="Exclude from map (keeps Day 0 holdings, does not declare, ignores point balancing)">Exclude Guild</label>
          ` : `
            <input type="checkbox" id="sm_${g.id}" class="guild-small-check" ${g.isSmall ? 'checked' : ''} 
              onchange="updGuildSmall('${g.id}', this.checked)" ${dAttr}>
            <label for="sm_${g.id}" class="guild-small-label" title="Check this if this is a smaller guild.">Small Guild</label>
          `}

          <input class="guild-num guild-num-pts" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="points" value="${esc(g.basePoints||0)}"
            onchange="updGuildPoints('${g.id}',this.value)" title="Current points" ${dAttr}>
            
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv3" value="${esc(g.baseLv3||0)}"
            onchange="updGuildLv3('${g.id}',this.value)" title="Previous Lv3 Days" ${dAttr}>
            
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv2" value="${esc(g.baseLv2||0)}"
            onchange="updGuildLv2('${g.id}',this.value)" title="Previous Dorm Days" ${dAttr}>
            
          <input class="guild-num" type="number" min="0" step="1" data-guild-id="${g.id}" data-guild-field="lv1" value="${esc(g.baseLv1||0)}"
            onchange="updGuildLv1('${g.id}',this.value)" title="Previous Lv1 Town Days" ${dAttr}>

          <span class="guild-num-label">Pts/L3/L2/L1</span>

          ${(!srv.isViewOnly && srv.guilds.length>2) ? `<span class="guild-remove" onclick="removeGuild('${g.id}')">✕</span>` : ''}
        </div>`).join('')}
    </div>
    ${!srv.isViewOnly ? `
    <div class="guild-actions">
      <button class="btn-accent" onclick="addGuild()">+ Add Guild</button>
    </div>` : ''}
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
    <div class="sec-title">Final Scores <span class="sec-note"> Even target: ${targetHeader} pts</span></div>
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

  return `<div class="section" data-tour="status">
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
    ${issueText ? `<div class="status-issues">${issueText}</div>` : ''}
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
  
  const dAttr = srv.isViewOnly ? 'disabled' : '';

  return `<div class="section" data-tour="grid">
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
            ${srv.isViewOnly ? '' : `<div class="clear-day-wrap"><button class="clear-day-btn" onclick="clearDay(${d})">Clear</button></div>`}
          </th>`).join('')}
        </tr>
        <tr class="pts-row">
          <th class="kadj pts-blank"></th>
          <th class="kname pts-label">Running pts →</th>
          <th class="ktype pts-blank"></th>
          ${Array.from({length:totalCols},(_,d)=>{
            return `<th class="pts-cell">
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
              
              return `<td data-k="${k.id}" data-d="${d}" style="background:${g ? g.color+'18' : ''}; position:relative;" ${err ? 'class="cell-err"' : ''}>
                <select class="csel" data-k="${k.id}" data-d="${d}" style="${g ? 'color:'+g.color : ''}" onchange="onCell(event)" ${dAttr}>
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

function renderOcc(srv, occ) {
  return `<div class="section">
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
        ${srv.guilds.map(g => `<tr>
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
          <td class="dec-guild">
            <div class="guild-dot" style="background:${g.color}"></div>${esc(g.name)}
            ${g.isSmall ? `<span class="dec-max">(Max 1)</span>` : ''}
          </td>
          ${Array.from({length:days},(_,d)=>{
            const cnt=dec[g.id][d].length;
            const cls=cnt>maxDecl?'dc-bad':cnt>0?'dc-warn':'dc-ok';
            return `<td>
              <div class="${cls} dec-count">${cnt}▲</div>
              <div class="dec-towns">${dec[g.id][d].join(', ')||'—'}</div>
              ${give[g.id][d].length?`<div class="dec-give">↓${give[g.id][d].join(',')}</div>`:''}
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
  
  return `<div class="section" data-tour="messages">
    <div class="sec-title sec-title-row">
      <div>Daily Messages <span class="sec-note"> — click to copy</span></div>
    </div>
    
    <div class="msg-grid">
      ${msgs.map((m,d)=>`<div class="msg-card" onclick="cpyMsg(this,${d})" data-msg="${esc(m)}">
        <div class="msg-date">
          ${dateLabelShort(srv,d+1).replace('<br>',' ')} <span class="msg-copied" id="cpd-${d}"></span>
        </div>
        <div class="msg-body">${esc(m)}</div>
      </div>`).join('')}
    </div>
  </div>`;
}