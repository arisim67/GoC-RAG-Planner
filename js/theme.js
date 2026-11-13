// ══════════════════════════════════════════════════════════════
// 🎨 Themes: Dark (default), Light and the eight Tokyo Debunker houses.
// The colors live in css/themes.css; this file only switches data-theme on <html>,
// remembers the choice, and drives the picker in the header.
// (An inline snippet in index.html's <head> applies the saved theme before first paint.)
// ══════════════════════════════════════════════════════════════

const THEME_KEY = 'goc_theme';
export const THEMES = [
  'dark',
  'light',
  'dionysia',
  'frostheim',
  'hotarubi',
  'jabberwock',
  'mortkranken',
  'obscuary',
  'sinostra',
  'vagastrom',
];

function savedTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.includes(t) ? t : 'dark';
  } catch (_) {
    return 'dark';
  }
}

export function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'dark';
  if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme })); // guild colors are drawn per theme
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (_) {
    /* storage blocked: theme just won't be remembered */
  }
}

export function initThemePicker() {
  const picker = document.getElementById('theme-picker');
  if (!picker) return;
  const trigger = document.getElementById('theme-trigger');
  const current = document.getElementById('theme-current');
  const menu = document.getElementById('theme-menu');
  const items = [...menu.querySelectorAll('.theme-item')];

  const setOpen = open => {
    picker.classList.toggle('open', open);
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  };
  const show = theme => {
    items.forEach(li => li.setAttribute('aria-selected', String(li.dataset.value === theme)));
    const li = items.find(x => x.dataset.value === theme);
    if (li) current.innerHTML = li.innerHTML.replace(/<span>/, '<span class="theme-name">');
  };
  const choose = theme => {
    applyTheme(theme);
    show(theme);
    setOpen(false);
    trigger.focus();
  };

  show(savedTheme());

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(menu.hidden);
    if (!menu.hidden) (menu.querySelector('[aria-selected="true"]') || items[0]).focus();
  });
  items.forEach(li => {
    li.addEventListener('click', () => choose(li.dataset.value));
    li.addEventListener('keydown', e => {
      const i = items.indexOf(li);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(li.dataset.value);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      }
    });
  });
  document.addEventListener('click', e => {
    if (!picker.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });
}
