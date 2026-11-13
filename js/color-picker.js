// js/color-picker.js
// The pop-up that opens from a guild's colored dot: a "Palette" tab of colors chosen to suit the
// site (all readable on the dark background), and a "Custom" tab for any color at all.

import { esc } from './ui.js';
import { GUILD_COLORS } from './state.js';
import { gcolor } from './colors.js';

// The 15 default guild colors plus tones from the site's own theme, sorted by hue.
export const PALETTE = [
  '#ff6b6b',
  '#ffadad',
  '#ff9f6b',
  '#ffb86b',
  '#ffd6a5',
  '#e2c883',
  '#f5e46b',
  '#9bb670',
  '#b4ff6b',
  '#c3f0ca',
  '#6bffb4',
  '#45d6a8',
  '#6bffe8',
  '#26c0d0',
  '#6baff5',
  '#78a9f0',
  '#a0c4ff',
  '#a08cff',
  '#b886ee',
  '#e4c1f9',
  '#d46bff',
  '#fec4ff',
  '#ff6bda',
  '#ff6b9d',
];
// Every default color is in the palette, so new guilds always start on a palette color.
GUILD_COLORS.forEach(c => {
  if (!PALETTE.includes(c)) PALETTE.push(c);
});

const TAB_KEY = 'goc_color_tab';
const HEX_RE = /^#?([0-9a-f]{6})$/i;
let open = null; // the picker currently shown, if any

function closePicker(restore = true) {
  if (!open) return;
  if (restore) open.preview(open.original); // Escape / click outside: put the old color back
  open.el.remove();
  document.removeEventListener('pointerdown', open.onOutside, true);
  document.removeEventListener('keydown', open.onKey, true);
  window.removeEventListener('resize', open.place);
  window.removeEventListener('scroll', open.place, true);
  const anchor = open.anchor;
  open = null;
  if (anchor && anchor.isConnected) anchor.focus();
}

// anchor: the dot that was clicked. guild: the guild being recolored. others: the other guilds.
// onPick(color): save the color. onPreview(color): show it on the dot while choosing.
export function openColorPicker({ anchor, guild, others, onPick, onPreview }) {
  closePicker();
  const current = (guild.color || '').toLowerCase();
  const takenBy = new Map(others.map(g => [(g.color || '').toLowerCase(), g.name]));
  let tab = 'palette';
  try {
    tab = localStorage.getItem(TAB_KEY) === 'custom' ? 'custom' : 'palette';
  } catch (_) {
    /* ignore */
  }

  const el = document.createElement('div');
  el.className = 'color-pop';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `Color for ${guild.name}`);
  el.innerHTML = `
    <div class="cp-head">
      <span class="cp-title"><span class="cp-swatch-now" style="background:${esc(gcolor(current))}"></span>${esc(guild.name)}</span>
      <div class="cp-tabs" role="tablist">
        <button type="button" role="tab" class="cp-tab" data-tab="palette">Palette</button>
        <button type="button" role="tab" class="cp-tab" data-tab="custom">Custom</button>
      </div>
    </div>
    <div class="cp-panel" data-panel="palette">
      <div class="cp-grid">
        ${PALETTE.map(c => {
          const who = takenBy.get(c);
          const label = who ? `${c}, used by ${who}` : c;
          return `<button type="button" class="cp-swatch${c === current ? ' current' : ''}${who ? ' taken' : ''}"
            style="--sw:${gcolor(c)}" data-color="${c}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
        }).join('')}
      </div>
      <p class="cp-hint"><span class="cp-taken-key"></span> Used by another guild</p>
    </div>
    <div class="cp-panel" data-panel="custom">
      <div class="cp-custom">
        <label class="cp-native" style="--sw:${esc(current)}" title="Open the color chooser">
          <input type="color" value="${esc(current || '#a08cff')}" aria-label="Choose any color">
        </label>
        <div class="cp-hexwrap">
          <label class="cp-hexlabel" for="cp-hex">Hex</label>
          <input id="cp-hex" class="cp-hex" type="text" maxlength="7" spellcheck="false" autocomplete="off" value="${esc(current)}">
        </div>
      </div>
      <p class="cp-hint cp-warn" aria-live="polite"></p>
      <div class="cp-actions">
        <button type="button" class="btn-tool" data-cp="cancel">Cancel</button>
        <button type="button" class="btn-tool btn-primary" data-cp="apply">Use color</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const $ = s => el.querySelector(s);
  const native = $('.cp-native input'),
    hex = $('.cp-hex'),
    nativeBox = $('.cp-native'),
    warn = $('.cp-warn');
  const preview = c => {
    onPreview(c);
    $('.cp-swatch-now').style.background = gcolor(c);
  };

  const showTab = t => {
    tab = t;
    el.querySelectorAll('.cp-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === t);
      b.setAttribute('aria-selected', b.dataset.tab === t);
    });
    el.querySelectorAll('.cp-panel').forEach(p => {
      p.hidden = p.dataset.panel !== t;
    });
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch (_) {
      /* ignore */
    }
    place();
  };

  // Custom tab: the native chooser and the hex box stay in step, and the dot previews the color.
  const customValue = () => {
    const m = HEX_RE.exec(hex.value.trim());
    return m ? '#' + m[1].toLowerCase() : null;
  };
  const syncCustom = c => {
    nativeBox.style.setProperty('--sw', c);
    preview(c);
    const who = takenBy.get(c);
    warn.textContent = who ? `${who} already uses this color.` : '';
  };
  native.addEventListener('input', () => {
    hex.value = native.value;
    syncCustom(native.value);
  });
  hex.addEventListener('input', () => {
    const c = customValue();
    hex.classList.toggle('invalid', !c);
    if (c) {
      native.value = c;
      syncCustom(c);
    }
  });
  hex.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply(customValue());
    }
  });

  const apply = c => {
    if (!c) {
      hex.classList.add('invalid');
      hex.focus();
      return;
    }
    closePicker(false);
    onPick(c);
  };
  el.addEventListener('click', e => {
    const sw = e.target.closest('.cp-swatch');
    if (sw) return apply(sw.dataset.color);
    const t = e.target.closest('.cp-tab');
    if (t) return showTab(t.dataset.tab);
    const act = e.target.closest('[data-cp]');
    if (act && act.dataset.cp === 'apply') return apply(customValue());
    if (act && act.dataset.cp === 'cancel') return closePicker();
  });
  // Hovering a palette color previews it on the dot.
  el.addEventListener('pointerover', e => {
    const sw = e.target.closest('.cp-swatch');
    if (sw) preview(sw.dataset.color);
  });
  $('.cp-grid').addEventListener('pointerleave', () => preview(current));

  // Sit next to the dot, kept inside the window.
  const place = () => {
    if (!anchor.isConnected) return closePicker(false);
    const r = anchor.getBoundingClientRect(),
      w = el.offsetWidth,
      h = el.offsetHeight,
      m = 8;
    let left = Math.min(Math.max(m, r.left - 12), window.innerWidth - w - m);
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - m && r.top - h - 8 > m) top = r.top - h - 8;
    el.style.left = left + 'px';
    el.style.top = Math.max(m, top) + 'px';
  };
  const onOutside = e => {
    if (!el.contains(e.target) && !anchor.contains(e.target)) closePicker();
  };
  const onKey = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePicker();
    }
  };
  open = { el, anchor, original: current, preview, onOutside, onKey, place };
  document.addEventListener('pointerdown', onOutside, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);

  showTab(tab);
  (tab === 'palette' ? el.querySelector('.cp-swatch.current') || el.querySelector('.cp-swatch') : hex).focus();
}

export function isColorPickerOpen() {
  return !!open;
}
