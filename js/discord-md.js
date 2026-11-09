// js/discord-md.js
// Turns message text into HTML that looks roughly like Discord shows it, for previews.
// Covers what Discord supports in messages: # ## ### headings, -# subtext, - and 1. lists (nested by
// indenting), > and >>> quotes, ``` code blocks, `code`, ***bold italic***, **bold**, *italic* / _italic_,
// __underline__, ~~strikethrough~~, ||spoilers||, [masked](https://links) and \escapes.
// Everything is HTML-escaped first, so whatever is typed can't add tags to the page.

const escHtml = s =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inline(text) {
  const keep = [];
  const stash = html => `\u0000${keep.push(html) - 1}\u0000`;
  let s = text
    // \* \_ etc. show the character itself
    .replace(/\\([\\*_~`|#>\-[\]()])/g, (m, c) => stash(escHtml(c)))
    // `code` is shown as typed
    .replace(/`([^`\n]+)`/g, (m, c) => stash(`<code class="dmd-code">${escHtml(c)}</code>`));
  s = escHtml(s)
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<span class="dmd-link" title="$2">$1</span>')
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<u>$1</u>')
    .replace(/\*(?=\S)([^*]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<s>$1</s>')
    .replace(/\|\|(?=\S)([\s\S]*?\S)\|\|/g, '<span class="dmd-spoiler">$1</span>');
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}

// Lines of plain text (no code blocks) → HTML.
function blocks(lines) {
  let html = '';
  const stack = []; // open lists, innermost last
  const closeLists = (toDepth = 0) => {
    while (stack.length > toDepth) html += `</${stack.pop()}>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // >>> quotes the rest of the message
    if (/^>>> ?/.test(line)) {
      closeLists();
      html += `<div class="dmd-quote">${blocks([line.replace(/^>>> ?/, ''), ...lines.slice(i + 1)])}</div>`;
      return html;
    }
    const item = line.match(/^(\s*)([-*]|\d+\.) (.*)$/);
    if (item) {
      const depth = Math.min(Math.floor(item[1].replace(/\t/g, '  ').length / 2), 4) + 1;
      const tag = /\d/.test(item[2]) ? 'ol' : 'ul';
      if (depth > stack.length) {
        while (stack.length < depth) {
          html += `<${tag} class="dmd-list">`;
          stack.push(tag);
        }
      } else closeLists(depth);
      html += `<li>${inline(item[3])}</li>`;
      continue;
    }
    closeLists();
    let m;
    if ((m = line.match(/^(#{1,3}) (.*)$/))) html += `<div class="dmd-h${m[1].length}">${inline(m[2])}</div>`;
    else if ((m = line.match(/^-# (.*)$/))) html += `<div class="dmd-sub">${inline(m[1])}</div>`;
    else if ((m = line.match(/^> ?(.*)$/))) html += `<div class="dmd-quote">${inline(m[1]) || '&nbsp;'}</div>`;
    else if (line.trim() === '') html += '<div class="dmd-blank"></div>';
    else html += `<div>${inline(line)}</div>`;
  }
  closeLists();
  return html;
}

export function renderDiscord(text) {
  const out = [];
  const parts = String(text).split(/```/);
  parts.forEach((part, i) => {
    if (i % 2 === 1 && i < parts.length - 1) {
      // Code block; an optional language name on the first line is not shown.
      const body = part.replace(/^[a-z0-9+#-]*\n/i, '').replace(/\n$/, '');
      out.push(`<pre class="dmd-pre">${escHtml(body)}</pre>`);
    } else {
      const t = i % 2 === 1 ? '```' + part : part; // unclosed ``` stays as text
      const lines = t.replace(/^\n|\n$/g, '').split('\n');
      if (t.length) out.push(blocks(lines));
    }
  });
  return out.join('');
}
