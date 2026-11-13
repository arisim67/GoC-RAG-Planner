// ══════════════════════════════════════════════════════════════
// 🎨 Guild colors on the Light theme.
// The colors a guild is given (and that get saved, exported and shared) are pale shades picked for a
// dark background. On the Light theme they are drawn differently instead:
//   - the 15 default colors map to a separate Light palette, so they stay clearly different from each other;
//   - any other color (custom picks, imported plans) is darkened automatically: same hue, as much of
//     the chroma as stays in range, lightness lowered until text in it reads well on the page.
// Only what is drawn changes. gcolor(hex) is what to put in styles.
// ══════════════════════════════════════════════════════════════

// default color → the color drawn for it on Light: its own palette of 15, chosen to be clearly
// different from each other and readable on the pale page (the first few are the most different)
export const LIGHT_SHADES = {
  '#a08cff': '#2263bb', // blue
  '#6bffb4': '#c3171b', // red
  '#ffb86b': '#2d5e3c', // green
  '#ff6b9d': '#a44a0b', // orange
  '#6baff5': '#8509da', // purple
  '#f5e46b': '#076f75', // teal
  '#ff6b6b': '#b82476', // pink
  '#6bffe8': '#7e5e08', // amber
  '#d46bff': '#4846d7', // indigo
  '#b4ff6b': '#4f6d07', // lime
  '#ff9f6b': '#744936', // brown
  '#26c0d0': '#025885', // sky
  '#fec4ff': '#4c545e', // slate
  '#9bb670': '#9d4a5d', // rose
  '#ff6bda': '#993ca3', // orchid
};

const PAGE_BG = '#e6e1d3'; // the darkest surface guild text sits on in the Light theme
const MIN_CONTRAST = 4.5;
const MAX_LIGHTNESS = 0.6;

const toLinear = c => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = c => {
  c = Math.max(0, Math.min(1, c));
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
};
const parse = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

function toOklab(hex) {
  const [r, g, b] = parse(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = rgb => rgb.every(x => x >= -1e-4 && x <= 1 + 1e-4);

function hexAt(L, chroma, hue) {
  const rgb = oklabToLinear(L, chroma * Math.cos(hue), chroma * Math.sin(hue));
  return (
    '#' +
    rgb
      .map(x =>
        Math.round(fromLinear(x) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

// Largest chroma (up to `chroma`) that can be shown at this lightness and hue
function fitChroma(L, chroma, hue) {
  if (inGamut(oklabToLinear(L, chroma * Math.cos(hue), chroma * Math.sin(hue)))) return chroma;
  let lo = 0;
  let hi = chroma;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(L, mid * Math.cos(hue), mid * Math.sin(hue)))) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function luminance(hex) {
  const [r, g, b] = parse(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// A darker shade of any #rrggbb color, readable on the Light theme's surfaces
export function darkenForLight(hex) {
  const [L0, a, b] = toOklab(hex);
  const chroma = Math.hypot(a, b);
  const hue = Math.atan2(b, a);
  let out = hex;
  for (let L = Math.min(L0, MAX_LIGHTNESS); L > 0.2; L -= 0.005) {
    out = hexAt(L, fitChroma(L, chroma, hue), hue);
    if (contrast(out, PAGE_BG) >= MIN_CONTRAST) return out;
  }
  return out;
}

const cache = new Map();

export function lightShade(hex) {
  const key = String(hex || '').toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(key)) return hex;
  if (LIGHT_SHADES[key]) return LIGHT_SHADES[key];
  if (!cache.has(key)) cache.set(key, darkenForLight(key));
  return cache.get(key);
}

// The color to draw for a guild color on the current theme
export function gcolor(hex) {
  const light = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  return light ? lightShade(hex) : hex;
}
