// js/actions.js
// Page events are handled here instead of with onclick="..." in the HTML. An element says what it
// does with a data attribute, and one listener per event type looks up the matching function:
//
//   <button data-action="add-guild">          click
//   <select data-change="server-mode">         change
//   <input  data-input="guild-name" data-id=…> input (every keystroke)
//
// Each function receives the element and the event: (el, event) => { ... }.

const handlers = { click: {}, change: {}, input: {} };
const ATTR = { click: 'action', change: 'change', input: 'input' };

export function registerActions(type, map) {
  Object.assign(handlers[type], map);
}

export function initActions(root = document) {
  for (const type of Object.keys(handlers)) {
    root.addEventListener(type, event => {
      const attr = ATTR[type];
      const el = event.target.closest && event.target.closest(`[data-${attr}]`);
      if (!el) return;
      const fn = handlers[type][el.dataset[attr]];
      if (fn) fn(el, event);
      else console.warn(`No ${type} handler for "${el.dataset[attr]}"`);
    });
  }
}
