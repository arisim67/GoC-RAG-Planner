// js/screenshots.js
// Screenshots: captures the grid and stats tables with html2canvas and zips them.

import { activeSrv } from './state.js';
import { setBtnLabel } from './icons.js';

// html2canvas can't read the CSS color() form that browsers report for color-mix() (the Today column
// uses it), and gives up on the whole capture. In its cloned page, rewrite those colors as rgba().
const COLOR_FN = /color\(srgb ([\d.e+-]+) ([\d.e+-]+) ([\d.e+-]+)(?: \/ ([\d.e+-]+))?\)/g;
const toRgba = v =>
  v.replace(
    COLOR_FN,
    (_, r, g, b, a) => `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a ?? 1})`,
  );
function fixColors(doc) {
  const props = [
    'background-color',
    'color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'box-shadow',
    'text-shadow',
    'outline-color',
    'fill',
    'stroke',
  ];
  const win = doc.defaultView;
  doc.querySelectorAll('*').forEach(el => {
    const cs = win.getComputedStyle(el);
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (v.includes('color(')) el.style.setProperty(p, toRgba(v), 'important');
    }
  });
}

export async function takeScreenshots(e) {
  const evt = e || window.event;
  const btn =
    (evt && evt.target && evt.target.closest && evt.target.closest('button')) || document.createElement('button');
  const originalText = setBtnLabel(btn, 'Processing...');
  // Everything the capture changes on the page, so it can be put back even if the capture fails
  // (no connection, the browser refuses a big canvas...). Left in place, the page stays stretched
  // wide with the Town column no longer sticky until a reload.
  const undo = [];

  try {
    // Make sure web fonts are loaded so measured widths match rendered widths
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Pins screenshot-only sizing (see css/responsive.css) so phone and desktop captures match
    document.documentElement.classList.add('capturing');

    const gridEl = document.getElementById('capture-grid');
    const statsEl = document.getElementById('capture-stats');
    const mainEl = document.getElementById('main-content');

    // Scroll to the top-left first: on iOS and Android, capturing while scrolled shifts the image
    const origScrollX = window.scrollX;
    const origScrollY = window.scrollY;
    window.scrollTo(0, 0);
    undo.push(() => window.scrollTo(origScrollX, origScrollY));

    const html = document.documentElement;
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    const origMainMaxWidth = mainEl.style.maxWidth;
    undo.push(() => {
      html.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
      mainEl.style.maxWidth = origMainMaxWidth;
    });

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

      // Pin the planning grid and the Total Occupation table to their natural width while
      // the container is measured. (Occupation uses table-layout:fixed, and a fixed-layout table at
      // width:100% inside a shrink-to-fit box claims a near-infinite width, which breaks the capture.)
      const pinned = el.querySelectorAll('table.ptbl, table.otbl');
      pinned.forEach(table => {
        originalStyles.push({ el: table, prop: 'width', val: table.style.width });
        originalStyles.push({ el: table, prop: 'minWidth', val: table.style.minWidth });
        table.style.width = 'max-content';
        table.style.minWidth = 'max-content';
      });

      originalStyles.push({ el: el, prop: 'width', val: el.style.width });
      originalStyles.push({ el: el, prop: 'maxWidth', val: el.style.maxWidth });
      originalStyles.push({ el: el, prop: 'display', val: el.style.display });

      // Shrink-wrap the container exactly to the table's natural bounds
      el.style.display = 'inline-block';
      el.style.width = 'max-content';
      el.style.maxWidth = 'none';

      // Now that the container's width is known, fix it in pixels and let Total Occupation
      // stretch to fill it, so it matches the width of Final Scores and Declares & Giveaways.
      const occTables = el.querySelectorAll('table.otbl');
      if (occTables.length) {
        el.style.width = el.getBoundingClientRect().width + 'px';
        occTables.forEach(table => {
          table.style.width = '100%';
          table.style.minWidth = '0';
        });
      }

      return originalStyles;
    }

    function restoreStyles(styles) {
      styles.forEach(({ el, prop, val }) => {
        el.style[prop] = val;
      });
    }

    const gridStyles = expandForCapture(gridEl);
    const statsStyles = expandForCapture(statsEl);
    undo.push(() => {
      restoreStyles(gridStyles);
      restoreStyles(statsStyles);
    });

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
    // Match the page background of the current theme (it differs per theme)
    const captureBg = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#191425';

    const isMobile = window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent);
    // iOS Safari refuses canvases above ~16.7M pixels, so shrink the scale if a big GoC map would exceed it
    const baseScale = isMobile ? 1.5 : 2;
    const fitScale = (w, h) => (isMobile ? Math.min(baseScale, Math.sqrt(16000000 / (w * h))) : baseScale);

    // Pass the measured bounds to html2canvas explicitly
    const canvasGrid = await html2canvas(gridEl, {
      backgroundColor: captureBg,
      scale: fitScale(gridW, gridH),
      width: gridW,
      height: gridH,
      windowWidth: captureWindowWidth,
      windowHeight: gridH + 200,
      scrollX: 0,
      scrollY: 0,
      onclone: fixColors,
    });

    const canvasStats = await html2canvas(statsEl, {
      backgroundColor: captureBg,
      scale: fitScale(statsW, statsH),
      width: statsW,
      height: statsH,
      windowWidth: captureWindowWidth,
      windowHeight: statsH + 200,
      scrollX: 0,
      scrollY: 0,
      onclone: fixColors,
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
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;padding:40px 20px;overflow-y:auto;';

      const shareBtnHtml =
        navigator.canShare && navigator.canShare({ files: filesArray })
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

      overlay.onclick = e => {
        if (e.target === overlay) document.body.removeChild(overlay);
      };
      document.body.appendChild(overlay);

      if (shareBtnHtml) {
        document.getElementById('ov-share-btn').onclick = async () => {
          try {
            await navigator.share({ files: filesArray });
          } catch (e) {
            console.log('Share canceled', e);
          }
        };
      }

      setBtnLabel(btn, '✓ Generated!');
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

      setBtnLabel(btn, '✓ Saved!');
      btn.style.color = 'var(--green)';
    }
  } catch (err) {
    console.error('Screenshot failed:', err);
    document.documentElement.classList.remove('capturing');
    // Put the page back as it was (the steps that ran are undone, latest first; doing one twice is harmless)
    undo.reverse().forEach(fn => {
      try {
        fn();
      } catch (_) {
        /* keep undoing the rest */
      }
    });
    setBtnLabel(btn, 'Error');
  }

  setTimeout(() => {
    setBtnLabel(btn, originalText);
    btn.style.color = '';
  }, 2000);
}
