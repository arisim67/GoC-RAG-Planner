// js/guide.js
// The site's document pages: the User Guide (user-guide/index.html, from docs/user-guide.md) and the
// Privacy Policy (privacy/index.html, from PRIVACY.md). Each page names its Markdown file in
// <main data-source>, the same file GitHub shows, so it is written in one place. Headings get the same
// ids GitHub gives them, so links like user-guide/#map work; pictures and links to other files are
// pointed at where they live on this site or on GitHub.

import { marked } from '../vendor/marked/marked.esm.js';

const REPO = 'https://github.com/arisim67/GoC-RAG-Planner/blob/main/';
// Other pages of this site that have a Markdown source: links to the file go to the page instead
const PAGES = { 'docs/user-guide.md': '../user-guide/', 'PRIVACY.md': '../privacy/' };

const main = document.getElementById('guide');
const SOURCE = main.dataset.source; // e.g. ../docs/user-guide.md
const DIR = SOURCE.slice(0, SOURCE.lastIndexOf('/') + 1); // pictures and links are relative to it
const REPO_PATH = SOURCE.replace(/^(\.\.\/)+/, ''); // the file's path in the repo

// GitHub's heading ids: lowercase, punctuation dropped, spaces to hyphens, -1, -2… for repeats.
function slugger() {
  const seen = new Map();
  return text => {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

const isRelative = url => url && !/^([a-z]+:|\/|#|\.\.\/)/i.test(url);

function fixUp(root) {
  const slug = slugger();
  for (const h of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) h.id = slug(h.textContent);

  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (isRelative(src)) img.setAttribute('src', DIR + src);
    img.loading = 'lazy';
    img.decoding = 'async';
  }

  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href.startsWith('#')) continue;
    if (isRelative(href)) {
      const [file, hash = ''] = href.split('#');
      const path = new URL(file, 'https://x/' + REPO_PATH).pathname.slice(1);
      if (PAGES[path]) {
        a.href = PAGES[path] + (hash ? '#' + hash : ''); // another page of this site: same tab
        continue;
      }
      a.href = REPO + path + (hash ? '#' + hash : ''); // anything else in the repo opens on GitHub
    }
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  // A picture on its own line shows as a figure, with its description underneath it
  for (const p of root.querySelectorAll('p')) {
    const only = p.children.length === 1 && p.textContent.trim() === '' && p.firstElementChild.tagName === 'IMG';
    if (only) p.classList.add('guide-figure');
  }
}

async function load() {
  try {
    const res = await fetch(SOURCE, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    const article = document.createElement('article');
    article.className = 'guide-body';
    article.innerHTML = marked.parse(md, { gfm: true });
    fixUp(article);
    main.replaceChildren(article);
    main.removeAttribute('aria-busy');
    // Opened with #section: go there now that it exists
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  } catch (err) {
    console.error('Could not load the guide', err);
    main.innerHTML = `<p class="guide-status">This page didn't load.
      <a href="${REPO}${REPO_PATH}">Read it on GitHub</a> instead.</p>`;
    main.removeAttribute('aria-busy');
  }
}

load();
