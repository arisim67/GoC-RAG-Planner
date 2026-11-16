// js/ghouls.js
// The ghoul animations: a random ghoul fights on the welcome screen and when Auto-Optimize finishes,
// works on the plan while it runs, and sits on the tutorial's cards. They are animated WebP files in
// images/ghouls/<set>/<name>.webp, each with a still frame (<name>-still.webp) that is shown instead
// when the viewer has asked for less motion. Only the one that is picked is ever downloaded.
// The working set comes in two layers, <name>-back.webp (body and legs) and <name>.webp (the rest), so
// the page can draw the counter they sit at between the two.
// With a house theme on, only that house's ghouls show up.

export const HOUSES = {
  dionysia: ['elias', 'jo', 'mio', 'shion'],
  frostheim: ['jin', 'kaito', 'luca', 'tohma'],
  hotarubi: ['haku', 'subaru', 'zenji'],
  jabberwock: ['haru', 'ren', 'towa'],
  mortkranken: ['jiro', 'yuri'],
  obscuary: ['ed', 'lyca', 'rui'],
  sinostra: ['ritsu', 'romeo', 'taiga'],
  vagastrom: ['alan', 'leo', 'sho'],
};
export const GHOULS = Object.values(HOUSES).flat().sort();

const name = g => g[0].toUpperCase() + g.slice(1);

// The ghouls that can show up right now: the house theme's, or all of them.
function pool() {
  const theme = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme');
  return HOUSES[theme] || GHOULS;
}

// One pick per set for the whole visit, so a screen that redraws keeps the same ghoul. Each set
// avoids a ghoul already showing in another set when the house has enough of them. Switching to a
// house theme drops a pick from another house.
const picked = {};
function choose(set, avoid) {
  const all = pool();
  const taken = new Set(
    Object.entries(picked)
      .filter(([k]) => k !== set)
      .map(([, g]) => g),
  );
  // first choice: nobody else's and not the one to avoid; then just not the one to avoid; then anyone
  const tries = [all.filter(g => !taken.has(g) && g !== avoid), all.filter(g => g !== avoid), all];
  const from = tries.find(t => t.length);
  picked[set] = from[Math.floor(Math.random() * from.length)];
  return picked[set];
}
export function pickGhoul(set) {
  return pool().includes(picked[set]) ? picked[set] : choose(set);
}

// A new ghoul next time (Auto-Optimize gets a different one each run).
export function repickGhoul(set) {
  return choose(set, picked[set]);
}

// The battle and sitting pictures are each cropped to their own animation, so the same ghoul is drawn at a
// different scale in each file. [width, height] of each picture in the game's own units (a ghoul stands
// about 385 tall), and where its feet are: [x, y] as a fraction of the picture. The page draws every ghoul
// at one scale per place from these (--gz in the CSS), so they all come out the same size. The working
// set shares one frame and scale, so it needs none.
const SIZES = {
  battle: {
    alan: [617, 425, 0.565, 0.993],
    ed: [457, 398, 0.595, 0.991],
    elias: [488, 637, 0.751, 0.994],
    haku: [301, 401, 0.644, 0.991],
    haru: [532, 446, 0.583, 0.988],
    jin: [397, 470, 0.669, 0.994],
    jiro: [524, 511, 0.773, 0.875],
    jo: [855, 610, 0.698, 0.981],
    kaito: [495, 401, 0.524, 0.991],
    leo: [330, 435, 0.58, 0.988],
    luca: [553, 454, 0.474, 0.994],
    lyca: [528, 554, 0.507, 0.984],
    mio: [642, 540, 0.75, 0.975],
    ren: [530, 556, 0.582, 0.991],
    ritsu: [432, 581, 0.662, 0.981],
    romeo: [423, 358, 0.62, 0.991],
    rui: [758, 524, 0.552, 0.924],
    shion: [724, 502, 0.742, 0.993],
    sho: [672, 423, 0.491, 0.993],
    subaru: [672, 578, 0.69, 0.975],
    taiga: [500, 404, 0.696, 0.991],
    tohma: [786, 552, 0.476, 0.968],
    towa: [479, 515, 0.622, 0.991],
    yuri: [473, 403, 0.628, 0.991],
    zenji: [388, 397, 0.425, 0.984],
  },
  sitting: {
    alan: [245, 401, 0.448, 0.993],
    ed: [505, 486, 0.7, 0.993],
    elias: [275, 396, 0.44, 0.993],
    haku: [235, 399, 0.387, 0.993],
    haru: [205, 383, 0.394, 0.993],
    jin: [263, 401, 0.462, 0.993],
    jiro: [268, 400, 0.517, 0.993],
    jo: [239, 401, 0.355, 0.99],
    kaito: [255, 405, 0.431, 0.99],
    leo: [305, 400, 0.603, 0.993],
    luca: [206, 396, 0.388, 0.993],
    lyca: [402, 440, 0.635, 0.99],
    mio: [268, 393, 0.344, 0.99],
    ren: [218, 395, 0.419, 0.993],
    ritsu: [201, 386, 0.369, 0.993],
    romeo: [227, 398, 0.374, 0.993],
    rui: [370, 402, 0.607, 0.993],
    shion: [260, 415, 0.407, 0.99],
    sho: [308, 401, 0.37, 0.95],
    subaru: [235, 393, 0.475, 0.993],
    taiga: [234, 394, 0.435, 0.993],
    tohma: [198, 387, 0.305, 0.993],
    towa: [220, 400, 0.406, 0.99],
    yuri: [242, 392, 0.459, 0.993],
    zenji: [392, 386, 0.592, 0.99],
  },
}; // prettier-ignore

const files = (set, g, layer) => `images/ghouls/${set}/${g}${layer}`;

// The CSS variables that size and place one picture (see .ghoul-sized in css/base.css).
function sizeVars(set, g) {
  const z = SIZES[set] && SIZES[set][g];
  return z ? `--gw:${z[0]}px;--gh:${z[1]}px;--gx:${z[2]};--gy:${z[3]}` : '';
}

// The picture for one set (layer '-back' for the back layer of the working set). Decorative, so screen
// readers skip it; hovering shows who it is. A missing file just leaves nothing behind.
// who: a particular ghoul instead of the set's pick (the one who worked on a plan celebrates it). It
// stays that ghoul even if the theme changes.
export function ghoulHTML(set, cls = '', layer = '', who = '') {
  const g = who || pickGhoul(set);
  const base = files(set, g, layer);
  const title = layer ? '' : ` title="${name(g)}"`;
  const data = who ? '' : ` data-set="${set}" data-layer="${layer}"`;
  const vars = sizeVars(set, g);
  const sized = vars ? ` ghoul-sized" style="${vars}` : '';
  return `<picture class="ghoul ${cls}${sized}"${data} aria-hidden="true">
    <source srcset="${base}-still.webp" media="(prefers-reduced-motion: reduce)">
    <img src="${base}.webp" alt=""${title} decoding="async" draggable="false" onerror="this.parentNode.remove()">
  </picture>`;
}

// A theme change swaps any ghoul on screen that isn't in the new house for one that is.
if (typeof document !== 'undefined') {
  document.addEventListener('themechange', () => {
    for (const p of document.querySelectorAll('picture.ghoul[data-set]')) {
      const { set, layer } = p.dataset;
      const g = pickGhoul(set);
      const base = files(set, g, layer);
      const img = p.querySelector('img');
      if (img.getAttribute('src') === `${base}.webp`) continue;
      p.querySelector('source').srcset = `${base}-still.webp`;
      img.src = `${base}.webp`;
      if (!layer) img.title = name(g);
      const vars = sizeVars(set, g);
      if (vars) p.style.cssText = vars;
    }
  });
}
