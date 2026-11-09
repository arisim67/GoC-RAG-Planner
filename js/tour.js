// js/tour.js
// Interactive walkthrough of the planner. It highlights the real UI one part at a time.
//
// Two ways through it, offered on the opening card:
//   "Set up my first event" - a guided setup. The steps wait while the person does the real thing in
//     the real app (create the server, name the guilds, fill in Day 0), and move on by themselves once
//     it is done. They finish with a server of their own, not a throwaway.
//   "Just show me around"   - the original walkthrough: nothing is changed, every step is read-only,
//     and a temporary "Tutorial Server" is created to point at if there is nothing else.
//
// - Starts by itself the first time someone opens the site after this version is deployed.
//   It is marked as seen as soon as it starts, so it never shows on its own again.
//   To show it to everyone once more after a big update, bump TOUR_VERSION.
// - Can be skipped at any step (Skip button or Esc) and replayed from the 🎓 Tutorial button.
//
// A step that waits for the person is written with `wait`:
//   wait.snap()      optional, read once when the step opens: what "before" looked like
//   wait.done(snap)  true once they have done it; polled, and also re-measures the highlight because
//                    the page re-renders underneath us
//   wait.hint        shown in the card until then
//   wait.ready       shown once it is done (default: a nudge towards Next)
//   wait.auto        move on by itself once done, instead of unlocking Next
// Doing the thing unlocks Next; it does not move the tour on unless the step asked for that. Renaming
// one guild is not a sign that you have finished renaming guilds, and a tour that jumps the moment you
// type a character is worse than one that waits. The page stays live after the step is satisfied, so
// they can carry on. `wait.auto` is for the one-off actions where there is nothing left to repeat and
// a still-highlighted button would only be confusing - creating the server, and nothing else so far.
// While such a step is open, clicks go through, keyboard shortcuts are off so typing works, and the
// card does not take focus. "Skip this step" is there from the start for anyone who gets stuck.
// If what the step asks for is already true when it opens (replaying the tour on a finished plan), it
// is shown as an ordinary step instead of waiting for something that has already happened.

import { applyCollapse, expandSection } from './collapse.js';

// 2 for the move to the new site (November 2026), so everyone sees the updated tutorial once. Anyone
// who skips it gets the What's new card instead (whats-new.js). Bump this only to deliberately show
// it to everyone again.
const TOUR_VERSION = 2;
const SEEN_KEY = 'goc_tour_seen';
const WATCH_MS = 250;

let hooks = null; // functions from app.js (see initTour)
let steps = [];
let index = 0;
let els = null; // overlay DOM nodes while a tour is running
let demoState = null;
let lastFocus = null;
let flow = null; // 'setup' | 'features', chosen on the opening card
let watch = null; // interval while a step waits for the person
let waiting = false; // step asked for something they have not done yet
let live = false; // page is clickable for this step
let tracked = null; // element the highlight is currently following
let sizeWatch = null; // ResizeObserver on it, for controls that change shape in place

// ── Steps ────────────────────────────────────────────────────────
// target: a [data-tour="..."] name, a CSS selector starting with '#' or '.', or a function returning
//   either (so a step can follow the person - from a button to the dialog it opens, say).
//   null puts the card in the middle of the screen.
// Steps whose target is not on the page are skipped automatically.

// The opening card: which of the two ways through the tour they want.
function chooserStep() {
  const has = !!hooks.getActiveServer();
  return {
    target: null,
    title: 'Welcome to the GoC / Ragnarok Planner',
    body: `This app plans a whole Game of Claws or Ragnarok event: who holds which town on which day,
           kept legal and with the points shared out evenly.<br><br>Where would you like to start?`,
    choices: [
      {
        label: has ? 'Walk me through a new event' : 'Set up my first event',
        flow: 'setup',
        hint: 'Build a real server together, one step at a time. It stays when the tour ends.',
      },
      { label: 'Just show me around', flow: 'features', hint: 'A one-minute look at what everything does.' },
    ],
  };
}

// Guided setup. Each of these waits for the real thing to happen in the real app.
function setupSteps() {
  const srv = () => hooks.getActiveServer();
  // Older app.js builds do not pass getServerCount; fall back to watching the active server change.
  const count = () => (hooks.getServerCount ? hooks.getServerCount() : srv() ? 1 : 0);
  // What the guild list looks like now, so we can tell when they have touched it.
  const guildSig = () => {
    const s = srv();
    return s ? s.guilds.map(g => g.name).join('\u0000') : '';
  };
  // How many towns have someone on them on Day 0.
  const day0 = () => {
    const s = srv();
    return s && s.plan && s.plan[0] ? Object.values(s.plan[0]).filter(Boolean).length : 0;
  };

  return [
    {
      // Follows them from the button into the dialog it opens.
      target: () =>
        (document.getElementById('modal-add') || {}).classList?.contains('open') ? '#modal-add .modal' : '.add-tab-btn',
      title: 'Create the server',
      body: `Click <b>+ Add Server</b> and fill in the event: its name, whether it is <b>Ragnarok</b> or
             <b>Game of Claws</b>, the map, and the first and last day.
             <br><br>The mode matters most — it sets how many towns a guild may declare each day and
             which maps you can pick from, and it cannot be changed afterwards.`,
      wait: {
        // Someone replaying this already has servers, so "is there one?" would be true before they
        // started and the step would sit there telling them to click a button it had already passed.
        // Wait for one that was not there a moment ago instead.
        snap: () => ({ n: count(), id: srv() ? srv().id : null }),
        done: s0 => (hooks.getServerCount ? count() > s0.n : !!srv() && srv().id !== s0.id),
        hint: 'Waiting for you to create it…',
        auto: true, // nothing left to do here once it exists, so do not leave + Add Server lit up
      },
    },
    {
      target: 'guilds',
      title: 'Name the guilds',
      body: `Type each guild's real name over <b>Guild 1</b>, <b>Guild 2</b> and so on. Use
             <b>+ Add Guild</b> or the <b>×</b> to match however many are taking part — up to 15.
             <br><br>Drag the <b>⋮⋮</b> handle to reorder them. When something cannot be split evenly,
             the guilds nearer the top get the extra point, dorm day or castle day.`,
      wait: {
        snap: guildSig,
        done: s0 => guildSig() !== s0,
        hint: 'Rename a guild, or add or remove one…',
      },
    },
    {
      target: 'grid',
      title: 'Set up Day 0',
      body: `<b>Day 0</b> is where everyone starts, before any declares — put each guild on the towns
             they already hold. Click a cell under Day 0 and pick the guild.
             <br><br>The rest of the plan is built outwards from this, so it is worth getting right.
             The <b>Adjacent Towns</b> column on the left shows what connects to what.`,
      wait: {
        snap: day0,
        done: s0 => day0() > s0,
        hint: 'Place a guild on a Day 0 town…',
      },
      place: 'top',
    },
    {
      target: 'status',
      title: 'The app checks as you go',
      body: `Green means the plan is legal. Red names the day and town at fault — a guild declaring a
             town it is not next to, too many declares in a day, or a guild losing every town it has.
             <br><br>Nothing stops you entering it; you just get told.`,
    },
  ];
}

function buildSteps(srv) {
  const goc = srv && srv.mode === 'goc';
  return [
    {
      target: null,
      title: 'Welcome to the GoC / Ragnarok Planner',
      body: `This quick tour shows how to plan an event from start to finish. It takes about a minute.
             <br><br>You can skip it now and replay it any time from the <b>Tutorial</b> button at the top.`,
      next: 'Start tour',
    },
    {
      target: 'tabs',
      title: 'Servers',
      body: `Each event server gets its own tab. Click <b>+ Add Server</b> to create one and pick its
             <b>mode</b>, <b>map</b> and <b>dates</b>.<br><br>Right-click a tab (or long-press on a phone)
             to rename, duplicate or delete it.`,
    },
    {
      target: 'settings',
      title: 'Server settings',
      body: `Change the name, mode, map and dates here. The <b>mode</b> matters: it sets the maps and the
             declare limits (2 a day for Game of Claws, 3 for Ragnarok).`,
    },
    {
      target: 'guilds',
      title: 'Guilds',
      body: `Type each guild's real name. Drag the <b>⋮⋮</b> handle to reorder them; the order decides who gets
             extra points, dorm time or castle time when things can't be split evenly. Click a guild's coloured dot
             to change its colour.
             <br><br>${
               goc
                 ? '<b>Small Guild</b> limits a guild to 1 declare a day.'
                 : "<b>Exclude Guild</b> keeps a guild's Day 0 towns but leaves it out of declares and point balancing."
             }
             Planning mid-event? Enter current points and town counts in the boxes on the right.`,
    },
    {
      target: 'import',
      title: 'Import',
      body: `Paste a list of guild names to set up the roster in one go, paste a day's town owners in grid
             order, or drop in a server backup (<code>.json</code>) made with <b>Export Server</b>.`,
    },
    {
      target: 'grid',
      title: 'Planning grid',
      body: `One row per town, one column per day. Pick the guild that holds each town on each day, starting
             with their footholds on <b>Day 0</b>. The left column lists each town's neighbours.
             <br><br>To copy, select cells — long-press one, drag across a block, or shift-click a second cell —
             then drag the handle on the block's bottom-right corner sideways across days, or down the towns.
             The block repeats, so a two-day pattern dragged across six days lands three times.
             <br><br>Prefer the keyboard? Arrow keys move between cells, typing a guild's first letters picks it,
             and Ctrl+C / Ctrl+V copy and paste a block.
             <br><br>Made a mistake? <b>Undo</b> and <b>Redo</b> above the grid (or Ctrl+Z / Ctrl+Y) step through your changes.
             Click a guild under <b>Spotlight</b> to see just its towns.`,
      place: 'top',
    },
    {
      target: 'status',
      title: 'Validation',
      body: `The app checks your plan as you go. <b>Green</b> pills mean that day is legal; <b>red</b> ones point
             to the problem: a town taken without a neighbouring town, too many declares, or a guild losing
             every town.`,
    },
    {
      target: 'optimize',
      title: 'Auto-Optimize',
      body: `Let the solver propose a full plan that follows the rules and evens out points${goc ? ', Darkwick and dorms' : ' and dorms'}.
             ${
               goc
                 ? 'Game of Claws takes around <b>1–3 minutes</b> for 10 guilds and up to about <b>10</b> for 13: keep the tab open and visible until it finishes.'
                 : 'Ragnarok takes up to about a minute.'
             }
             <br><br>Not happy with the result? <b>Undo</b> above the grid brings back your previous plan, even after a reload.`,
    },
    {
      target: 'stats',
      title: 'Check the balance',
      body: `Final scores, total occupation and the daily declares (▲) and giveaways (↓) for every guild.
             Use these to fine-tune the plan by hand.`,
      place: 'top',
    },
    {
      target: 'share',
      title: 'Share with leadership',
      body: `<b>Save to Cloud</b> uploads the plan and copies a link. People who open it see a view-only copy
             and can <b>Duplicate to Edit</b> to work on their own version; after you save again they click
             <b>Pull Latest Updates</b> for your changes.
             <br><br>Posted in Discord, the link unfolds into a card showing every guild's final score and
             how long each held towns, dorms and the castle — the grid itself stays private. The
             <b>User Guide</b> has a picture of one.
             <br><br><b>Sync from Cloud</b> pulls the saved version back to this browser if you have been
             editing from another device — it replaces what is here, so save first if in doubt.
             <br><br><b>Screenshots</b> saves the grid and tables as images for Discord.`,
    },
    {
      target: 'messages',
      title: 'Daily messages',
      body: `Ready-made instructions for each day. Click a card to copy it, then paste it into Discord.
             During an event, today's card is highlighted, and <b>Copy Today's Message</b> in the toolbar copies it in one click.
             <br><br>Want them in your own style? <b>Template</b> changes the format, and lets you give guilds
             emoji names just for messages. <b>Share</b> in there copies a link to your template for other planners.`,
      place: 'top',
    },
    {
      target: null,
      title: "You're all set!",
      body: () => `${
        demoState && demoState.created
          ? 'The Tutorial Server will be removed when you close this. Click <b>+ Add Server</b> to start your own plan.<br><br>'
          : ''
      }Your work saves to this browser automatically. Replay this tour with <b>Tutorial</b>, or open
             <b>User Guide</b> for the full details.`,
      next: 'Done',
    },
  ];
}

// ── Public API ───────────────────────────────────────────────────

// Called once from app.js after the page has rendered.
//   hooks.getActiveServer()     → current server or null
//   hooks.createDemoServer()    → creates + shows a temporary server, returns the previously active id
//   hooks.removeDemoServer(id)  → removes the temporary server and re-selects `id`
//   hooks.isSharedLink()        → true when the page was opened from a shared plan link
//   hooks.onEnd({ finished })   → (optional) the tour closed; finished = true if it reached the end
// Returns true if the tour is about to start by itself.
export function initTour(appHooks) {
  hooks = appHooks;
  window.startTour = () => startTour();
  if (!hasSeenTour() && !hooks.isSharedLink()) {
    // Small delay so the page (and fonts) settle before measuring positions.
    setTimeout(() => startTour(), 600);
    return true;
  }
  return false;
}

export function startTour() {
  if (els) return; // already running
  markSeen();
  lastFocus = document.activeElement;
  demoState = null;
  flow = null;
  steps = [chooserStep()];
  buildOverlay();
  index = 0;
  show(0, 1);
}

// Chosen on the opening card. The walkthrough needs something to point at and borrows a temporary
// server for it; the guided setup must not, because creating the real one is the first step.
function pickFlow(which) {
  flow = which;
  if (which === 'features') {
    const srv = hooks.getActiveServer();
    if (!srv || srv.isViewOnly) demoState = { created: true, prevId: hooks.createDemoServer() };
    steps = buildSteps(hooks.getActiveServer()).slice(1); // the opening card replaced step 1
  } else {
    // Setup first, then the parts of the walkthrough that only make sense once a plan exists.
    const after = ['optimize', 'stats', 'share', 'messages'];
    const tail = buildSteps(hooks.getActiveServer()).filter(s => after.includes(s.target));
    steps = [
      ...setupSteps(),
      ...tail,
      {
        target: null,
        title: 'That is your server set up',
        body: `It is saved in this browser and will be here when you come back — no account, nothing to
             press. Carry on filling in the days, or let <b>Auto-Optimize</b> propose the rest.
             <br><br>Replay this any time with <b>Tutorial</b>, or open <b>User Guide</b> for the
             full details.`,
        next: 'Done',
      },
    ];
  }
  index = 0;
  show(0, 1);
}

// ── Seen flag ────────────────────────────────────────────────────
function hasSeenTour() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) >= TOUR_VERSION;
  } catch (_) {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(TOUR_VERSION));
  } catch (_) {
    /* storage blocked: tour just won't remember */
  }
}

// ── Overlay ──────────────────────────────────────────────────────
function buildOverlay() {
  const root = document.createElement('div');
  root.className = 'tour-root';
  root.innerHTML = `
    <div class="tour-blocker"></div>
    <div class="tour-spot" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabindex="-1">
      <div class="tour-progress"><div class="tour-progress-fill"></div></div>
      <div class="tour-count"></div>
      <h3 class="tour-title" id="tour-title"></h3>
      <div class="tour-body"></div>
      <div class="tour-actions">
        <button type="button" class="tour-skip">Skip tour</button>
        <div class="tour-nav">
          <button type="button" class="tour-stepskip">Skip this step</button>
          <button type="button" class="tour-back">Back</button>
          <button type="button" class="tour-next">Next</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);
  els = {
    root,
    spot: root.querySelector('.tour-spot'),
    card: root.querySelector('.tour-card'),
    count: root.querySelector('.tour-count'),
    fill: root.querySelector('.tour-progress-fill'),
    title: root.querySelector('.tour-title'),
    body: root.querySelector('.tour-body'),
    back: root.querySelector('.tour-back'),
    next: root.querySelector('.tour-next'),
    skip: root.querySelector('.tour-skip'),
    nav: root.querySelector('.tour-nav'),
    stepSkip: root.querySelector('.tour-stepskip'),
  };
  els.back.onclick = () => show(index - 1, -1);
  els.next.onclick = () => (index >= steps.length - 1 ? endTour(true) : show(index + 1, 1));
  els.skip.onclick = () => endTour();
  els.stepSkip.onclick = () => show(index + 1, 1);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  document.body.classList.add('tour-active');
}

function onKey(e) {
  if (!els) return;
  // While a step waits, the page belongs to the person: they are typing a server name, tabbing between
  // fields, pressing Enter in a dialog. The tour's own shortcuts would eat all of that, so it takes no
  // keys at all except Escape, and only when they are not in the middle of typing something.
  if (live) {
    if (e.key !== 'Escape') return;
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    const inModal = t && t.closest && t.closest('.modal-bg.open');
    if (typing || inModal) return; // let it close the dialog or leave the field instead
    e.preventDefault();
    e.stopPropagation();
    endTour();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    endTour();
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'BUTTON') return; // let the focused button act
    e.preventDefault();
    els.next.click();
  } else if (e.key === 'ArrowLeft' && index > 0) {
    e.preventDefault();
    show(index - 1, -1);
  } else if (e.key === 'Tab') {
    // Keep keyboard focus inside the tour card.
    const f = [...els.card.querySelectorAll('button')].filter(b => b.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && i === f.length - 1) {
      e.preventDefault();
      f[0].focus();
    }
  }
}

function targetEl(step) {
  const t = typeof step.target === 'function' ? step.target() : step.target;
  if (!t) return null;
  // A plain name is one of the [data-tour] anchors; anything starting with '#' or '.' is a selector,
  // which is how a step points at a dialog that has no anchor of its own.
  let el = null;
  try {
    el = /^[#.]/.test(t) ? document.querySelector(t) : document.querySelector(`[data-tour="${t}"]`);
  } catch (_) {
    return null;
  }
  if (!el) return null;
  expandSection(el, { all: true, remember: false }); // a folded section opens while the tutorial shows it
  const r = el.getBoundingClientRect();
  return r.width || r.height ? el : null;
}

// dir: +1 forward, -1 back. Steps whose target is missing are skipped in that direction.
function show(i, dir) {
  while (i > 0 && i < steps.length - 1 && steps[i].target && !targetEl(steps[i])) i += dir;
  i = Math.max(0, Math.min(steps.length - 1, i));
  index = i;
  const step = steps[i];

  // The walkthrough hides steps whose part of the page is not there. The guided setup must not do
  // that: almost none of the app exists on step one, and counting only what is on screen would
  // promise a two-step tour that is really nine.
  const visible = flow === 'setup' ? steps : steps.filter(s => !s.target || targetEl(s));
  const pos = visible.indexOf(step) + 1;
  els.count.textContent = flow ? `${pos} of ${visible.length}` : '';
  els.fill.style.width = flow ? `${(pos / visible.length) * 100}%` : '0';
  els.title.innerHTML = step.title;
  els.body.innerHTML = typeof step.body === 'function' ? step.body() : step.body;
  els.back.style.visibility = i === 0 ? 'hidden' : 'visible';
  els.next.textContent = step.next || (i === steps.length - 1 ? 'Done' : 'Next');
  // Until a way through is picked, the opening card is the only step, so it would count as the last.
  els.skip.style.visibility = i === steps.length - 1 && !step.choices ? 'hidden' : 'visible';

  // The opening card offers the two ways through instead of a Next button.
  stopWatch();
  waiting = false;
  live = false;
  if (step.choices) {
    els.nav.style.display = 'none';
    const list = document.createElement('div');
    list.className = 'tour-choices';
    for (const c of step.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tour-choice';
      b.innerHTML = `<span class="tour-choice-label">${c.label}</span><span class="tour-choice-hint">${c.hint}</span>`;
      b.onclick = () => pickFlow(c.flow);
      list.appendChild(b);
    }
    els.body.appendChild(list);
  } else {
    els.nav.style.display = '';
  }

  // A step that waits for the person: let the page through, and watch for them doing it. Next stays
  // out of reach until they have, and then it is theirs to press when they are ready.
  els.next.disabled = false;
  els.stepSkip.style.display = 'none';
  let snapshot = null;
  if (step.wait) {
    live = true;
    snapshot = step.wait.snap ? step.wait.snap() : null;
    const snap = snapshot;
    let already = false;
    try {
      already = !!step.wait.done(snap);
    } catch (_) {}
    if (!already) {
      waiting = true;
      els.next.disabled = true;
      els.stepSkip.style.display = '';
      const hint = document.createElement('div');
      hint.className = 'tour-wait';
      hint.innerHTML = `<span class="tour-wait-dot"></span>${step.wait.hint || 'Waiting…'}`;
      els.body.appendChild(hint);
    }
  }
  // The highlight has to follow its target on every step, not only the ones that wait: a control can
  // change shape on its own while they watch.
  startLive(step, step.wait && step.wait.snap ? snapshot : null);
  // The guided setup asks them to use the app, so it never swallows clicks - not only on the steps
  // that wait. A step whose goal is already met still says "click + Add Server", and locking the
  // page behind that instruction is how the button ends up dead.
  if (flow === 'setup') live = true;
  els.root.classList.toggle('tour-pass', live);
  els.card.classList.toggle('tour-card-waiting', waiting);

  const el = targetEl(step);
  if (el) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Tall sections (grid, stats) are scrolled to their top; short ones are centred.
    const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
    el.scrollIntoView({ block: tall ? 'start' : 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  // Brief slide of the highlight to the new target, then instant tracking while the page scrolls.
  els.root.classList.add('tour-anim');
  clearTimeout(show._t);
  show._t = setTimeout(() => els && els.root.classList.remove('tour-anim'), 260);
  reposition();
  // Smooth scrolling moves the target after this call; follow it until it settles.
  let frames = 0;
  const follow = () => {
    if (!els || frames++ > 90) return;
    reposition();
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
  // While waiting, the person is typing into the page: taking focus would pull them out of it.
  if (!live) (step.choices ? els.card : els.next).focus({ preventScroll: true });
}

// ── Tracking the page ────────────────────────────────────────────
// Runs for every step, for as long as it is open. Two jobs.
//
// Keeping the highlight on its target. The page does not hold still: the app re-renders whole sections
// (so the element the step points at is replaced by a new one), and controls change shape under their
// own steam - Auto-Optimize relabels itself to "Finding Optimal Plan... (7s)" and grows, which used to
// leave the highlight sitting around where the button had been. The target is looked up again every
// tick rather than held onto, because a re-render would make any reference stale, and a ResizeObserver
// on whatever is there now catches a control changing shape between ticks.
//
// And, on a step that waits, watching for them to do the thing. Doing it only unlocks Next - moving on
// is their decision, so this never calls show(), and never re-locks Next if they carry on editing.
function startLive(step, snap) {
  stopWatch();
  watch = setInterval(() => {
    if (!els) return stopWatch();
    const el = targetEl(step);
    if (el !== tracked) {
      // re-rendered, or the step follows something that just appeared
      tracked = el;
      if (sizeWatch) {
        sizeWatch.disconnect();
        sizeWatch = null;
      }
      if (el && typeof ResizeObserver === 'function') {
        sizeWatch = new ResizeObserver(() => reposition());
        sizeWatch.observe(el);
      }
    }
    reposition();
    if (!waiting || !step.wait) return;
    let done = false;
    try {
      done = !!step.wait.done(snap);
    } catch (_) {
      done = false;
    }
    if (!done) return;
    unlock(step);
  }, WATCH_MS);
}

// They have done what the step asked: hand them the Next button and say so.
//
// `wait.auto` steps move on by themselves instead. That is for a one-off action with nothing left to
// repeat - once the server exists there is no second server to make, and leaving + Add Server lit up
// only makes people wonder what they have missed. Steps you might well do several times over, like
// naming guilds or filling in Day 0, never move on by themselves; they wait for Next.
function unlock(step) {
  waiting = false;
  els.next.disabled = false;
  els.stepSkip.style.display = 'none';
  els.card.classList.remove('tour-card-waiting');
  const auto = !!step.wait.auto;
  const hint = els.body.querySelector('.tour-wait');
  if (hint) {
    hint.classList.add('tour-wait-done');
    hint.innerHTML = `<span class="tour-wait-tick">✓</span>${
      step.wait.ready || (auto ? 'Created — on we go.' : 'Done — take as long as you like, then press Next.')
    }`;
  }
  if (auto) {
    stopWatch();
    // Long enough to see the tick, short enough not to feel stuck.
    setTimeout(() => {
      if (els && steps[index] === step) show(index + 1, 1);
    }, 650);
  }
}

function stopWatch() {
  if (watch) {
    clearInterval(watch);
    watch = null;
  }
  if (sizeWatch) {
    sizeWatch.disconnect();
    sizeWatch = null;
  }
  tracked = null;
}

function reposition() {
  if (!els) return;
  const step = steps[index];
  const el = targetEl(step);
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const card = els.card;
  const mobile = vw < 640;

  // A dialog dims the page itself and is what the person is looking at, so the spotlight would only
  // fight with it. Drop the highlight and put the card out of the dialog's way instead.
  const modal = document.querySelector('.modal-bg.open');
  // On a phone the card is a bottom sheet and the dialog fills the screen, so the card would sit right
  // on top of the fields and the Create button - the very thing the step is asking them to use. There
  // is nowhere to put it, so it stands aside until the dialog is done with. The step keeps watching.
  card.style.display = modal && mobile ? 'none' : '';
  if (modal) {
    els.spot.style.display = 'none';
    els.root.classList.remove('tour-dim');
    card.classList.toggle('tour-card-sheet', mobile);
    card.classList.remove('tour-card-center');
    if (mobile) {
      card.style.left = card.style.top = '';
      return;
    }
    const m = modal.querySelector('.modal');
    const mr = m ? m.getBoundingClientRect() : { left: vw / 2, right: vw / 2, top: 0, bottom: vh };
    // Beside the dialog if it fits, otherwise under it, otherwise the bottom-right corner.
    const cw = card.offsetWidth,
      ch = card.offsetHeight,
      gap = 16;
    let x = mr.right + gap,
      y = Math.min(Math.max(mr.top, 16), vh - ch - 16);
    if (x + cw > vw - 16) {
      x = mr.left - gap - cw;
      if (x < 16) {
        x = vw - cw - 24;
        y = Math.min(mr.bottom + gap, vh - ch - 16);
      }
    }
    card.style.left = Math.max(16, x) + 'px';
    card.style.top = Math.max(16, y) + 'px';
    return;
  }
  card.classList.toggle('tour-card-sheet', mobile && !!el);
  card.classList.toggle('tour-card-center', !el);

  if (!el) {
    els.spot.style.display = 'none';
    els.root.classList.add('tour-dim');
    card.style.left = card.style.top = '';
    return;
  }
  els.root.classList.remove('tour-dim');

  // Spotlight: the target's box, padded, clipped to the screen.
  const pad = 8,
    r = el.getBoundingClientRect();
  const top = Math.max(r.top - pad, 4),
    left = Math.max(r.left - pad, 4);
  const bottom = Math.min(r.bottom + pad, vh - 4),
    right = Math.min(r.right + pad, vw - 4);
  Object.assign(els.spot.style, {
    display: 'block',
    top: top + 'px',
    left: left + 'px',
    width: Math.max(right - left, 0) + 'px',
    height: Math.max(bottom - top, 0) + 'px',
  });

  if (mobile) {
    card.style.left = card.style.top = '';
    return;
  } // bottom sheet (CSS)

  // Desktop: put the card below the target, else above, else pinned to the bottom of the screen.
  const cw = card.offsetWidth,
    ch = card.offsetHeight,
    gap = 14;
  let y;
  const below = bottom + gap,
    above = top - gap - ch;
  if (step.place !== 'top' && below + ch <= vh - 8) y = below;
  else if (above >= 8) y = above;
  else if (below + ch <= vh - 8) y = below;
  else y = vh - ch - 16;
  let x = Math.min(Math.max(left, 16), vw - cw - 16);
  // Target too tall to avoid (grid, stats…): park the card in the bottom-right corner,
  // which hides less than covering the town names on the left.
  const overlaps = y < bottom && y + ch > top;
  if (overlaps) {
    x = vw - cw - 24;
    y = vh - ch - 16;
  }
  card.style.left = x + 'px';
  card.style.top = y + 'px';
}

function endTour(finished = false) {
  if (!els) return;
  stopWatch();
  waiting = false;
  live = false;
  flow = null;
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
  els.root.remove();
  els = null;
  document.body.classList.remove('tour-active');
  if (demoState && demoState.created) hooks.removeDemoServer(demoState.prevId);
  demoState = null;
  applyCollapse(); // sections opened for the tour fold back the way they were
  window.scrollTo({ top: 0 });
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  if (hooks.onEnd) hooks.onEnd({ finished });
}
