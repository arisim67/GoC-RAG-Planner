// js/import-export.js
// Import modal (guild list, daily map data, server backups) and Export Server.

import { activeSrv, GUILD_COLORS, MAX_GUILDS, save } from './state.js';
import { renderAll } from './render.js';
import { getMapData } from './maps/index.js';

export function openImport() {
  document.getElementById('modal-import').classList.add('open');
  // Reset state
  document.getElementById('import-dropzone').style.display = 'block';
  document.getElementById('import-text').value = '';
  document.getElementById('import-file').value = '';
}

export function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.add('drag-over');
}

export function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.remove('drag-over');
}

export function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('import-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) readImportFile(file);
}

export function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) readImportFile(file);
}

function readImportFile(file) {
  if (!file.name.endsWith('.json')) {
    alert('Please select a .json file');
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    document.getElementById('import-text').value = text;
    // Auto-switch to guilds mode if it looks like a server export
    try {
      const parsed = JSON.parse(text);
      if (parsed.version === 1 && parsed.server) {
        document.getElementById('import-mode').value = 'guilds';
        document.getElementById('import-day-container').style.opacity = '0.3';
        document.getElementById('import-day').disabled = true;
      }
    } catch (err) {
      /* not JSON, keep current mode */
    }
  };
  reader.readAsText(file);
}

export function exportServer() {
  const srv = activeSrv();
  if (!srv) return;

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
        id: g.id,
        name: g.name,
        color: g.color,
        basePoints: g.basePoints || 0,
        baseLv3: g.baseLv3 || g.baseLv3s || 0,
        baseLv2: g.baseLv2 || g.baseLv2s || 0,
        baseLv1: g.baseLv1 || 0,
        isSmall: g.isSmall || false,
        isExcluded: g.isExcluded || false,
        ...(g.msgName ? { msgName: g.msgName } : {}),
      })),
      plan: srv.plan,
      notes: srv.notes || '',
    },
  };

  const json = JSON.stringify(exportData, null, 2);

  // Trigger file download directly
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${srv.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Visual feedback
  const btn = typeof event !== 'undefined' && event && event.target ? event.target.closest('button') : null;
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Downloaded!';
    btn.style.background = 'var(--green-glow)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
  }
}

export function processImport() {
  const srv = activeSrv();
  const textarea = document.getElementById('import-text');
  const text = textarea.value.trim();
  const mode = document.getElementById('import-mode') ? document.getElementById('import-mode').value : 'day';
  const day = parseInt(document.getElementById('import-day').value, 10);

  if (!text) {
    alert('Please paste data first!');
    return;
  }

  // Try to parse as exported JSON first
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    /* not JSON, continue to line-based parsing */
  }

  // One entry per pasted line. Blank lines are kept so that, for the daily map import,
  // line N still lines up with town N in the planning grid.
  const lines = text.split(/\r?\n/);

  if (parsed && parsed.version === 1 && parsed.server) {
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
        isSmall: g.isSmall || false,
        isExcluded: g.isExcluded || false,
        ...(typeof g.msgName === 'string' && g.msgName.trim() ? { msgName: g.msgName.trim() } : {}),
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

    alert(
      `Server "${srv.name}" imported successfully! ${srv.guilds.length} guilds, ${Object.keys(srv.plan).length} days planned.`,
    );
  } else if (mode === 'guilds') {
    // Extract unique, valid names
    const uniqueNames = [
      ...new Set(
        lines
          .map(line => line.trim().replace(/^["']|["']$/g, ''))
          .filter(name => name && name.toLowerCase() !== 'none' && name !== '—'),
      ),
    ];

    if (uniqueNames.length > MAX_GUILDS) {
      alert(
        `That list has ${uniqueNames.length} guilds; a server can have at most ${MAX_GUILDS}. Please shorten the list and try again.`,
      );
      return;
    }

    // Completely replace the guild list
    srv.guilds = uniqueNames.map((name, index) => {
      return {
        id: 'g_' + Date.now() + index, // Generate fresh IDs
        name: name,
        color: GUILD_COLORS[index % GUILD_COLORS.length],
        basePoints: 0,
        baseLv3s: 0,
        baseLv2s: 0,
      };
    });

    // Wipe the existing map plan since old guild IDs no longer exist
    srv.plan = {};

    alert(`Replaced roster with ${uniqueNames.length} guilds! The map plan has been reset for the new roster.`);
  } else {
    // MODE: IMPORT DAILY MAP DATA
    const mapData = getMapData(srv.mode, srv.mapKey);
    const sortedKingdoms = [...mapData.kingdoms].sort((a, b) => {
      const pts = { lv3: 3, lv2: 2, lv1: 1 };
      return pts[b.type] - pts[a.type];
    });

    lines.forEach((line, index) => {
      if (index >= sortedKingdoms.length) return;

      const guildName = line.trim().replace(/^["']|["']$/g, '');
      if (!guildName || guildName.toLowerCase() === 'none' || guildName === '—') return;

      const guild = srv.guilds.find(g => g.name.toLowerCase() === guildName.toLowerCase());
      if (guild) {
        if (!srv.plan[day]) srv.plan[day] = {};
        srv.plan[day][sortedKingdoms[index].id] = guild.id;
      }
    });
  }

  save();
  renderAll();

  textarea.value = '';
  document.getElementById('modal-import').classList.remove('open');
}
