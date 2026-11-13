import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUILD_COLORS } from '../js/state.js';
import { LIGHT_SHADES, lightShade, darkenForLight, contrast } from '../js/colors.js';

const PAGE = '#e6e1d3'; // darkest surface text sits on, Light theme
const WHITE = '#ffffff';

test('every default guild color has a Light shade', () => {
  for (const c of GUILD_COLORS) assert.ok(LIGHT_SHADES[c], `${c} has no Light shade`);
});

test('default Light shades are readable on the Light theme surfaces', () => {
  for (const c of GUILD_COLORS) {
    const s = lightShade(c);
    assert.ok(contrast(s, PAGE) >= 4.5, `${c} → ${s} is too pale on the page (${contrast(s, PAGE).toFixed(2)})`);
    assert.ok(contrast(s, WHITE) >= 4.5, `${c} → ${s} is too pale on white`);
  }
});

test('default Light colors are all different', () => {
  const shades = GUILD_COLORS.map(lightShade);
  assert.equal(new Set(shades).size, shades.length);
});

test('custom colors are darkened automatically until they are readable', () => {
  for (const c of ['#ffff00', '#00ffff', '#ffffff', '#88aacc', '#123456', '#ff00ff']) {
    const s = darkenForLight(c);
    assert.match(s, /^#[0-9a-f]{6}$/);
    assert.ok(contrast(s, PAGE) >= 4.5, `${c} → ${s} (${contrast(s, PAGE).toFixed(2)})`);
  }
});

test('lightShade leaves anything that is not a #rrggbb color alone', () => {
  assert.equal(lightShade(''), '');
  assert.equal(lightShade(undefined), undefined);
  assert.equal(lightShade('red'), 'red');
});
