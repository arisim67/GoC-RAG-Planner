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

const files = (set, g, layer) => `images/ghouls/${set}/${g}${layer}`;

// The picture for one set (layer '-back' for the back layer of the working set). Decorative, so screen
// readers skip it; hovering shows who it is. A missing file just leaves nothing behind.
export function ghoulHTML(set, cls = '', layer = '') {
  const g = pickGhoul(set);
  const base = files(set, g, layer);
  const title = layer ? '' : ` title="${name(g)}"`;
  return `<picture class="ghoul ${cls}" data-set="${set}" data-layer="${layer}" aria-hidden="true">
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
    }
  });
}
