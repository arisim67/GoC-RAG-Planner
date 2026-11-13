// js/whats-new.js
// A one-time "What's new" card for people who used the planner before this update. New visitors get
// the tutorial instead. Returning visitors also get the (updated) tutorial once; the card shows if
// they skip it, and not if they go all the way through, since the tour already covered it.
// Change WHATS_NEW_ID (and the list) to show a card for a later update.

import { icon } from './icons.js';

const KEY = 'goc_whats_new';
const WHATS_NEW_ID = '2026-11-15';
const CHANGELOG_URL = 'https://github.com/arisim67/goc-rag-planner/blob/main/CHANGELOG.md';

// [icon, title, text, extra]. extra: 'desktop' for things that only apply with a mouse and keyboard
// (left out on phones and tablets), or { touch: text } for different wording there.
const ITEMS = [
  [
    'undo-2',
    'Undo and Redo',
    'Step back through changes to the grid, Auto-Optimize included: buttons above the grid, or Ctrl+Z / Ctrl+Y.',
    { touch: 'Step back through changes to the grid, Auto-Optimize included, with the buttons above the grid.' },
  ],
  ['history', 'History', 'Saved copies of each server. Restore one in a click, even a server you deleted.'],
  [
    'keyboard',
    'Keyboard editing',
    'Arrow keys move around the grid, typing picks a guild, and Ctrl+C / Ctrl+V copy blocks of cells.',
    'desktop',
  ],
  ['map', 'Map view', 'See who holds each town on the in-game map, one day at a time.'],
  [
    'copy',
    'In-game guild messages',
    "Daily Messages can write each guild its own message, short enough for Tokyo Debunker's guild chat, in your own format.",
  ],
  ['eye', 'Guild spotlight', 'Click a guild above the grid to see only its towns, on view-only links too.'],
  [
    'calendar',
    'Today at a glance',
    "Today's column is highlighted, and Copy Today's Message is one click in the toolbar.",
  ],
  [
    'crosshair',
    'Status jumps to problems',
    'Click a red chip under Status to go straight to the cell that needs fixing.',
  ],
  [
    'maximize-2',
    'All 13 days on screen',
    'On a desktop the whole grid fits without scrolling, with full guild names.',
    'desktop',
  ],
  ['chevron-down', 'Fold away sections', "Click a section's title to hide it until you need it."],
  ['palette', 'Guild colors', 'Click the dot next to a guild to choose any color.'],
  ['share-2', 'Share your message template', 'Share in the template editor copies a link for other planners.'],
];

// A phone or tablet: no mouse to hover with, and a finger to point.
const touchOnly = () => window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

let pending = false;
let startTour = () => {};

function seen() {
  try {
    return localStorage.getItem(KEY) === WHATS_NEW_ID;
  } catch (_) {
    return true; // no storage: don't show it on every visit
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, WHATS_NEW_ID);
  } catch (_) {
    /* ignore */
  }
}

// Called once on load. returning: they had used the planner before. tourStarting: the tutorial is
// about to open by itself, so wait to see whether they skip it.
export function initWhatsNew({ returning, tourStarting, openTour }) {
  if (openTour) startTour = openTour;
  if (seen()) return;
  if (!returning) return markSeen(); // new here: the tutorial covers everything
  if (tourStarting) pending = true;
  else setTimeout(showWhatsNew, 700);
}

// The tutorial closed: show the card if it was skipped, or forget it if they finished the tour.
export function whatsNewAfterTour({ finished }) {
  if (!pending) return;
  pending = false;
  if (finished) markSeen();
  else showWhatsNew();
}

export function showWhatsNew() {
  markSeen();
  if (document.querySelector('.modal-whatsnew')) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal modal-whatsnew" role="dialog" aria-modal="true" aria-labelledby="wn-title">
      <h3 id="wn-title">${icon('sparkles')} What's new</h3>
      <p class="wn-intro">The planner has a new home and a lot of new features. Here are the highlights:</p>
      <ul class="wn-list">
        ${ITEMS.filter(([, , , extra]) => !(extra === 'desktop' && touchOnly()))
          .map(
            ([ic, title, text, extra]) => `<li class="wn-item">
            <span class="wn-icon">${icon(ic)}</span>
            <span><b>${title}.</b> ${(touchOnly() && extra && extra.touch) || text}</span>
          </li>`,
          )
          .join('')}
      </ul>
      <p class="wn-more"><a href="${CHANGELOG_URL}" target="_blank" rel="noopener">See everything that changed</a></p>
      <div class="modal-row">
        <button type="button" class="btn" data-wn="tour">Take the tour</button>
        <button type="button" class="btn-accent" data-wn="close">Got it</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', e => {
    if (e.target === bg || e.target.closest('[data-wn="close"]')) return close();
    if (e.target.closest('[data-wn="tour"]')) {
      close();
      startTour();
    }
  });
  bg.querySelector('[data-wn="close"]').focus();
}
