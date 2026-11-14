// js/map-zoom.js
// Zooming the Map: pinch with two fingers (or Ctrl and the scroll wheel, or the + / - buttons) to zoom, and
// drag to move around once zoomed in. One finger still scrolls the page while the map is not zoomed, so
// a swipe over the map does not get stuck on it. The zoom is kept per server and stays as you change day.
//
// It zooms by changing the SVG's viewBox, so the drawing stays sharp, and renderMapView (map-view.js) reads
// the same numbers, so a redraw after an edit keeps the zoom.

const MAX = 5; // how far in
const BTN_STEP = 1.6; // one tap of + or -

const state = new Map(); // server id -> { x, y, s } (s = 1 is the whole map)

export const getZoom = srvId => state.get(srvId) || { x: 0, y: 0, s: 1 };

// The viewBox for a zoom, kept inside the map
function box(z, W, H) {
  const w = W / z.s;
  const h = H / z.s;
  return { x: Math.min(Math.max(z.x, 0), W - w), y: Math.min(Math.max(z.y, 0), H - h), w, h };
}

// What the markup of a zoomed map looks like (used by renderMapView and when applying a zoom to the page)
export function zoomView(srvId, W, H) {
  const z = getZoom(srvId);
  const b = box(z, W, H);
  return { viewBox: `${round(b.x)} ${round(b.y)} ${round(b.w)} ${round(b.h)}`, scale: z.s, zoomed: z.s > 1.001 };
}
const round = n => Math.round(n * 100) / 100;

function svgOf(el) {
  return el.closest('.map-frame') ? el.closest('.map-frame').querySelector('.map-svg') : null;
}

function apply(svg, srvId, z) {
  const W = Number(svg.dataset.w);
  const H = Number(svg.dataset.h);
  const b = box(z, W, H);
  const next = { x: b.x, y: b.y, s: Math.min(Math.max(z.s, 1), MAX) };
  if (next.s <= 1.001) state.delete(srvId);
  else state.set(srvId, next);
  const v = zoomView(srvId, W, H);
  svg.setAttribute('viewBox', v.viewBox);
  svg.style.setProperty('--zs', String(v.scale));
  svg.classList.toggle('zoomed', v.zoomed);
  const frame = svg.closest('.map-frame');
  if (frame) {
    frame.classList.toggle('zoomed', v.zoomed);
    const reset = frame.querySelector('[data-dir="reset"]');
    if (reset) reset.hidden = !v.zoomed;
  }
}

// Zoom by a factor around a point of the map (a fraction 0-1 across and down the picture)
function zoomAt(svg, srvId, factor, fx, fy) {
  const W = Number(svg.dataset.w);
  const H = Number(svg.dataset.h);
  const z = getZoom(srvId);
  const b = box(z, W, H);
  const s = Math.min(Math.max(z.s * factor, 1), MAX);
  const px = b.x + fx * b.w; // the map point under that spot stays under it
  const py = b.y + fy * b.h;
  apply(svg, srvId, { x: px - fx * (W / s), y: py - fy * (H / s), s });
}

// The + / - / Fit buttons
export function zoomButton(btn) {
  const svg = svgOf(btn);
  if (!svg) return;
  const id = svg.dataset.srv;
  const dir = btn.dataset.dir;
  if (dir === 'reset') apply(svg, id, { x: 0, y: 0, s: 1 });
  else zoomAt(svg, id, dir === 'in' ? BTN_STEP : 1 / BTN_STEP, 0.5, 0.5);
}

// ── Gestures ──
const pointers = new Map();
let g = null; // the gesture in progress
let moved = false;

function frameOf(e) {
  return e.target.closest && e.target.closest('.map-frame');
}

function begin(svg) {
  const r = svg.getBoundingClientRect();
  const pts = [...pointers.values()];
  const id = svg.dataset.srv;
  const z = getZoom(id);
  const W = Number(svg.dataset.w);
  const H = Number(svg.dataset.h);
  const b = box(z, W, H);
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  g = {
    svg,
    id,
    W,
    H,
    z0: { ...z },
    b0: b,
    c0: { x: cx, y: cy },
    d0: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
    // the map point under the fingers when the gesture starts
    p0: { x: b.x + ((cx - r.left) / r.width) * b.w, y: b.y + ((cy - r.top) / r.height) * b.h },
    n: pts.length,
  };
}

document.addEventListener(
  'pointerdown',
  e => {
    const frame = frameOf(e);
    if (!frame || e.target.closest('.map-zoomctl')) return;
    const svg = frame.querySelector('.map-svg');
    if (!svg) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = false;
    begin(svg);
  },
  true,
);

document.addEventListener(
  'pointermove',
  e => {
    if (!g || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    const r = g.svg.getBoundingClientRect();
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    if (pts.length >= 2 && g.n >= 2 && g.d0 > 0) {
      if (!moved) hold();
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const s = Math.min(Math.max(g.z0.s * (d / g.d0), 1), MAX);
      const fx = (cx - r.left) / r.width;
      const fy = (cy - r.top) / r.height;
      apply(g.svg, g.id, { x: g.p0.x - fx * (g.W / s), y: g.p0.y - fy * (g.H / s), s });
    } else if (pts.length === 1 && g.n === 1 && g.z0.s > 1.001) {
      // one finger (or the mouse) moves around the zoomed map
      const dx = cx - g.c0.x;
      const dy = cy - g.c0.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) hold();
      apply(g.svg, g.id, {
        x: g.b0.x - (dx / r.width) * g.b0.w,
        y: g.b0.y - (dy / r.height) * g.b0.h,
        s: g.z0.s,
      });
    }
  },
  true,
);

function end(e) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size === 0) g = null;
  else if (g) begin(g.svg); // a finger lifted: carry on from here with the rest
}
document.addEventListener('pointerup', end, true);
document.addEventListener('pointercancel', end, true);

// Once a drag or pinch is under way, keep its fingers on the map even if they slide off it. (Not from the
// start: a captured pointer sends its tap to the frame instead of the town under it.)
function hold() {
  moved = true;
  if (!g) return;
  const frame = g.svg.closest('.map-frame');
  pointers.forEach((_, id) => {
    try {
      frame.setPointerCapture(id);
    } catch (_) {
      /* the pointer is already gone */
    }
  });
}

document.addEventListener('pointerdown', () => (moved = false), true);

// A drag or pinch that ends over a town must not also tap it
document.addEventListener(
  'click',
  e => {
    if (moved && e.target.closest && e.target.closest('.map-svg')) {
      e.stopPropagation();
      e.preventDefault();
    }
    moved = false;
  },
  true,
);

// Ctrl (or ⌘) and the scroll wheel zoom around the pointer; the plain wheel still scrolls the page
document.addEventListener(
  'wheel',
  e => {
    const frame = frameOf(e);
    if (!frame || !(e.ctrlKey || e.metaKey)) return;
    const svg = frame.querySelector('.map-svg');
    if (!svg) return;
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(
      svg,
      svg.dataset.srv,
      Math.exp(-e.deltaY * 0.01),
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
    );
  },
  { passive: false },
);
