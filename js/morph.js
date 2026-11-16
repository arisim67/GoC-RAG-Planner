// js/morph.js
// Update a container to match new HTML by changing only what differs, instead of throwing its content away
// and building it again. renderAll (render.js) redraws the whole page after every edit; doing that by
// replacing everything made a phone stall for a moment, restart the map picture and lose its place. With this,
// the cells that did not change are left as they are, so their scroll position, focus and pictures stay put.
//
// The result is the same HTML a fresh render would give, so nothing else has to know the difference. It is a
// small, plain version of what libraries such as morphdom do: nodes are matched by position, and a node
// whose kind (tag or id) differs is replaced.

function sameKind(a, b) {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.id || '') === (b.id || '');
}

function syncAttrs(oldEl, newEl) {
  for (const a of [...oldEl.attributes]) {
    const present = a.namespaceURI ? newEl.hasAttributeNS(a.namespaceURI, a.localName) : newEl.hasAttribute(a.name);
    if (!present) {
      if (a.namespaceURI) oldEl.removeAttributeNS(a.namespaceURI, a.localName);
      else oldEl.removeAttribute(a.name);
    }
  }
  for (const a of newEl.attributes) {
    if (a.namespaceURI) {
      if (oldEl.getAttributeNS(a.namespaceURI, a.localName) !== a.value)
        oldEl.setAttributeNS(a.namespaceURI, a.name, a.value);
    } else if (oldEl.getAttribute(a.name) !== a.value) {
      oldEl.setAttribute(a.name, a.value);
    }
  }
}

// What a person has typed or picked lives in a property, not in the attribute the HTML sets
function syncState(oldEl, newEl) {
  const tag = oldEl.nodeName;
  if (tag === 'INPUT') {
    if (oldEl.type === 'checkbox' || oldEl.type === 'radio') {
      if (oldEl.checked !== newEl.checked) oldEl.checked = newEl.checked;
    } else if (oldEl.value !== newEl.value) {
      oldEl.value = newEl.value;
    }
  } else if (tag === 'TEXTAREA') {
    if (oldEl.value !== newEl.value) oldEl.value = newEl.value;
  } else if (tag === 'SELECT') {
    if (oldEl.selectedIndex !== newEl.selectedIndex) oldEl.selectedIndex = newEl.selectedIndex;
  }
}

function patchNode(oldN, newN) {
  // Unchanged all the way down (the browser compares this natively, far faster than walking it here)
  if (oldN.isEqualNode(newN)) return;
  if (oldN.nodeType !== 1) {
    if (oldN.nodeValue !== newN.nodeValue) oldN.nodeValue = newN.nodeValue;
    return;
  }
  syncAttrs(oldN, newN);
  if (oldN.nodeName !== 'TEXTAREA') patchChildren(oldN, newN);
  syncState(oldN, newN);
}

function patchChildren(oldParent, newParent) {
  let o = oldParent.firstChild;
  let n = newParent.firstChild;
  while (n) {
    const nNext = n.nextSibling;
    if (!o) {
      oldParent.appendChild(n);
    } else if (sameKind(o, n)) {
      const oNext = o.nextSibling;
      patchNode(o, n);
      o = oNext;
    } else {
      const oNext = o.nextSibling;
      oldParent.replaceChild(n, o);
      o = oNext;
    }
    n = nNext;
  }
  while (o) {
    const oNext = o.nextSibling;
    oldParent.removeChild(o);
    o = oNext;
  }
}

export function morph(container, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(container, tpl.content);
}
