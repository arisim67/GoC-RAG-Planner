// js/stickers.js
// The in-game cat and bunny stickers (images/stickers/<name>.webp), and a small dialog that shows one
// with a message: for things going wrong (a shared link that won't open, the cloud not answering) and
// for asking before Clear Plan.

import { esc } from './ui.js';

// One sticker picture. Decorative, so screen readers skip it; a missing file just leaves nothing behind.
export function stickerHTML(name, cls = '') {
  return `<img class="sticker ${cls}" src="images/stickers/${name}.webp" alt="" aria-hidden="true" decoding="async" draggable="false" onerror="this.remove()">`;
}

// A dialog with a sticker, a title and a line or two of text. Resolves true for the main button, false
// for Cancel, Escape or a click outside. Without cancel it is a notice with just the one button.
// body is HTML: escape anything that came from the person.
export function showNotice({ sticker, title, body = '', ok = 'OK', cancel = '', danger = false }) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    bg.innerHTML = `
      <div class="modal modal-confirm modal-notice" role="${cancel ? 'alertdialog' : 'dialog'}" aria-modal="true"
        aria-labelledby="notice-title" aria-describedby="notice-body">
        ${sticker ? stickerHTML(sticker, 'notice-sticker') : ''}
        <h3 id="notice-title">${esc(title)}</h3>
        <p class="confirm-msg" id="notice-body">${body}</p>
        <div class="modal-row modal-row-center">
          ${cancel ? `<button type="button" class="btn" data-a="no">${esc(cancel)}</button>` : ''}
          <button type="button" class="${danger ? 'btn btn-danger' : 'btn-accent'}" data-a="yes">${esc(ok)}</button>
        </div>
      </div>`;
    const back = document.activeElement;
    const done = answer => {
      document.removeEventListener('keydown', onKey, true);
      bg.remove();
      if (back && back.isConnected) back.focus({ preventScroll: true });
      resolve(answer);
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        done(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    bg.addEventListener('click', e => {
      if (e.target === bg) done(false);
    });
    bg.querySelector('[data-a="yes"]').addEventListener('click', () => done(true));
    bg.querySelector('[data-a="no"]')?.addEventListener('click', () => done(false));
    document.body.appendChild(bg);
    // With a question, Cancel has the keyboard, so Enter doesn't clear anything by accident.
    bg.querySelector(cancel ? '[data-a="no"]' : '[data-a="yes"]').focus();
  });
}
