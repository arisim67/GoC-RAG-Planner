// js/ui.js
// Small UI helpers: toast messages, HTML escaping, date labels, closing modals.

export function showToast(msg, isError = true, duration = 5000) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; 
    background: ${isError ? 'var(--red)' : 'var(--green)'}; 
    color: ${isError ? '#fff' : '#000'}; 
    padding: 14px 24px; border-radius: 8px; 
    max-width: min(420px, calc(100vw - 48px)); 
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

  // Animate out and remove after `duration` ms
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

export function dateLabel(srv,d){
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

export function dateLabelShort(srv,d){
  if(!srv.startDate) return d===0 ? 'D0' : `D${d}`;
  const [yy, mm, dd] = srv.startDate.split('-');
  const dt = new Date(yy, mm - 1, dd);
  dt.setDate(dt.getDate()+d-1);
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dateStr = `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
  return d===0 ? `D0 ${days[dt.getDay()]} ${dateStr}` : `D${d} ${days[dt.getDay()]} ${dateStr}`;
}

export function closeModal(id){document.getElementById(id).classList.remove('open');}
