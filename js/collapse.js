// js/collapse.js
// Collapsible sections: click a section's title (or the arrow beside it) to fold it down to just the
// title, and again to open it. Which sections are folded is remembered in this browser, for every
// server. Screenshots always include folded sections, and jumping to a section (the bar of section
// links, or the tutorial) opens it.

import { icon } from './icons.js';

const KEY = 'goc_collapsed';

function readFolded() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(list) ? list : []);
  } catch (_) {
    return new Set();
  }
}
function writeFolded(set) {
  try {
    if (set.size) localStorage.setItem(KEY, JSON.stringify([...set]));
    else localStorage.removeItem(KEY);
  } catch (_) {
    /* not saved: the section still folds for now */
  }
}

// The section's name, without notes like "— click to copy".
function nameOf(title) {
  const el = title.querySelector(':scope > div') || title;
  const text = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
  return (text ? text.textContent : el.textContent).trim();
}

function setFolded(sec, folded, remember = true) {
  sec.classList.toggle('collapsed', folded);
  const btn = sec.querySelector(':scope > .sec-title .sec-toggle');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!folded));
    btn.setAttribute('aria-label', `${folded ? 'Show' : 'Hide'} ${sec.dataset.secName || 'section'}`);
    btn.title = folded ? 'Show this section' : 'Hide this section';
  }
  if (!remember) return;
  const set = readFolded();
  if (folded) set.add(sec.dataset.sec);
  else set.delete(sec.dataset.sec);
  writeFolded(set);
}

// After each render: give every section an arrow, and fold the ones that were folded.
export function applyCollapse(root = document) {
  const folded = readFolded();
  root.querySelectorAll('.section[data-sec]').forEach(sec => {
    const title = sec.querySelector(':scope > .sec-title');
    if (!title) return;
    if (!title.querySelector('.sec-toggle')) {
      sec.dataset.secName = nameOf(title);
      title.insertAdjacentHTML(
        'afterbegin',
        `<button type="button" class="sec-toggle" aria-expanded="true">${icon('chevron-down')}</button>`,
      );
    }
    title.classList.add('sec-title-fold');
    setFolded(sec, folded.has(sec.dataset.sec), false);
  });
}

// Open the section el is (or the first one inside it, or all of them with all = true).
// remember = false opens it for now only, e.g. while the tutorial points at it.
export function expandSection(el, { all = false, remember = true } = {}) {
  if (!el) return;
  const secs = el.matches('.section[data-sec]') ? [el] : [...el.querySelectorAll('.section[data-sec]')];
  (all ? secs : secs.slice(0, 1)).forEach(sec => {
    if (sec.classList.contains('collapsed')) setFolded(sec, false, remember);
  });
}

// Clicking a title folds or opens its section, except clicks on the buttons inside it (Undo, Template…).
document.addEventListener('click', e => {
  const title = e.target.closest && e.target.closest('.section[data-sec] > .sec-title');
  if (!title) return;
  const inner = e.target.closest('button, a, input, select, textarea, label');
  if (inner && !inner.classList.contains('sec-toggle')) return;
  const sec = title.parentElement;
  setFolded(sec, !sec.classList.contains('collapsed'));
});
