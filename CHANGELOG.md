# Changelog

Notable changes to the GoC / Ragnarok Planner, newest first.
The app is updated continuously rather than in numbered releases, so entries are grouped by date.

## 2026-11-17

### Changed
- **The planner has moved to [goc-rag-planner.pages.dev](https://goc-rag-planner.pages.dev/).** The old address (arisim67.github.io) will be turned off on January 1, 2027. Until then it shows a banner with **Move my servers**, which brings your saved servers (and whether you've seen the tutorial) to the new site without uploading them. Shared plan links made on the old address, including Save to Cloud links, open on the new site automatically.
- **A cleaner, roomier layout.** The server toolbar groups its buttons as Plan (Auto-Optimize, History), Files (Import, Export Server) and Share (Screenshots, Save to Cloud, Sync from Cloud, Copy Today's Message), with Auto-Optimize as the main action and a quieter red Clear Plan beside the plan summary, and buttons use line icons instead of emoji. A bar of section links stays at the top and jumps to each part of the page. On a full-screen desktop all 13 days of the Planning Grid and the Declares & Giveaways table fit without scrolling sideways, and guild names are never cut short: a long name wraps onto a second line instead (on a narrow screen, the Declares & Giveaways table also keeps the guild names in view as you scroll across the days). Guilds are numbered, the Points, Castle, Dorms and Towns boxes stay hidden until you turn on **Planning mid-event** (if any of them already has a number, they stay visible), and checkboxes are on/off switches in the site's colors. Day 0 in the Planning Grid no longer shows a date, and the Declares & Giveaways table leaves days with no declares blank. With no servers yet, the page shows a welcome panel with three steps to get started.
- **Auto-Optimize tidies the last day in Ragnarok.** It avoids a declare on the final day unless the plan needs it, and a guild that holds the castle for two days gets those days at the end of the event, so its run finishes on it. These only break ties between plans that are equally fair: a fairer spread of points and occupation is never given up for them.
- **A shorter Status row.** Days with no problems now share one green pill ("All 13 days OK"), instead of a pill for every day, so the Status row fits on one line even with 13 days. Days with problems still get their own red pill, which jumps to them.
- **Better on phones.** User Guide and Tutorial sit together under the title, the server settings fit without cutting off the dates, Small guild and Exclude guild sit under each guild's name so nothing scrolls sideways, the Total Occupation table shows guild names in full, and the day buttons on the Map and in Daily Messages are one row you can swipe through.
- **The user guide and README pictures show the new layout.** Every screenshot and animation was retaken, and the guide's Servers section now matches the settings panel.
- **Quicker, steadier updates.** After you change a cell, the page now updates only what changed instead of rebuilding everything, so a phone no longer stalls for a moment, the map no longer flickers and your place on the page stays put.
- **New Game of Claws servers start with the right number of guilds.** It follows the map's starting towns: 9 guilds on Forest, Snowfield and Badlands, 7 on Wetland and 6 on Woodlands (it was always 8). Changing the map on a server whose guild list is still at the old default size resizes it to match.
- **Tables stay still on phones.** An up-and-down swipe no longer nudges a table sideways; swipe sideways on purpose to scroll it.
- The project now has automated tests that run on every update, and issue forms for bug reports and suggestions.

### Added
- **A summary, a settings panel and tabs.** On screens at least 1360 pixels wide, a flat panel beside the page stays in view as you scroll; on phones and tablets the same summary sits at the top of the page. It shows the server's name and details (on a shared plan, the View-Only notice with **Duplicate to Edit**), a **Server & Guild Setup** button, **Auto-Optimize** (with how long the last solve took) and **Save to Cloud** side by side, and every guild as a tile with its final points, castle and dorm counts and how far it is from its target: in two columns in Game of Claws, so even 15 guilds fit without scrolling, and one line per guild in Ragnarok. Click a guild to Spotlight it. On a wide screen, drag the thin handle on the sidebar's right edge to make it wider or narrower (it never gets narrower than what still fits the buttons and tiles; double-click it to reset, or use the arrow keys); the width is remembered in this browser. **Server & Guild Setup** opens the Server Settings (name, mode, map, dates and the Plan, Files and Share buttons) and the guild list together as a panel from the right, closed with the × button, Esc or a click outside, and wider when you turn on Planning mid-event. On a wide screen the page's sections are tabs: **Grid**, **Map**, **Scores** (Final Scores and Total Occupation), **Declares** and **Messages**, with Status above the Grid. The tab bar stays at the top as you scroll and the open tab is remembered, and the map is sized to your window's height, so the whole map shows when you scroll to it. On a phone or tablet it stays one long page in the same order, and the bar of links stays at the top as you scroll, highlights the section you are in and jumps to the others. Everywhere, the sections, Status and summary sit on the page without boxes around them, and Screenshots show every section in its card and leave the summary out.
- **Themes.** Pick a look from the theme menu in the header: Dark (as before), a Light theme, or one of the eight house themes (Dionysia, Frostheim, Hotarubi, Jabberwock, Mortkranken, Obscuary, Sinostra, Vagastrom), each with its house crest and an accent color checked against the crest (Jabberwock's orange and Mortkranken's steel teal, for example). Dark's accent is a soft periwinkle and Light's a deep indigo, so neither matches the green "OK" pills; Dionysia and Vagastrom use pale cream section titles so gold stays for the active tab and buttons; Obscuary and Sinostra show problems in coral; and the Today column follows the theme's accent. The choice is saved in this browser, and Screenshots use the theme's background. On the Light theme guilds use their own bright set of 15 colors (custom colors are darkened automatically), so guild names, dots and bars stay readable and distinct; the color a guild is saved with does not change, so plans look the same on every theme for other people. The muted hint text is a little brighter on the dark themes. The tutorial has a Themes step.
- **Choose each guild's color.** Click the colored dot next to a guild's name: pick from a palette that suits the planner, or use any color on the Custom tab. The 15 default colors are clearly different from each other and clear of the status red and coral, the green "OK" pills, the title gold and each theme's accent; guilds saved with older default colors keep them. The planner warns you if a color is very close to another guild's or too dark to read.
- **Undo, Redo and History.** Buttons above the Planning Grid, plus Ctrl+Z / Ctrl+Y (⌘Z / ⌘⇧Z on a Mac), step back and forward through changes to the plan: cells, copying across cells, Clear Day, Clear Plan, importing a day, removing a guild and Auto-Optimize. This replaces the separate Undo Optimize button, and an optimize can still be undone after reloading the page as long as the plan hasn't changed since. **History** in the toolbar keeps the last 10 saved copies of each server in your browser, taken every 15 minutes while you edit and just before anything big (Clear Plan, Auto-Optimize, imports, Sync from Cloud, changing mode or map, deleting a server). Restore any copy in one click, including servers you deleted.
- **Edit the grid from the keyboard.** Arrow keys move between cells (Shift+Arrow selects a block), typing the start of a guild's name picks it, Delete empties cells, and Ctrl+C / Ctrl+X / Ctrl+V copy, cut and paste a block of cells.
- **A Map view.** A new Map section (a tab on wide screens) shows the event map the way it looks in the game, for any day: each town's building on a base in its holder's color (with a random cat or ghoul on each one, like in the game), roads that follow the in-game paths, a dashed ring marking towns taken that day, and a glowing road in the taker's color showing where each was taken from. Day 0 can be filled in right on the map: tap a town to select it, then tap its guild's button above the map to place it there (so you can fill it in as you scroll through the in-game map). Pinch to zoom and drag to move around (or use the + / − buttons, and Fit to see the whole map again); on a computer, Ctrl or ⌘ plus the scroll wheel zooms. A new server's map opens on Day 0. Works with Spotlight and on every Game of Claws and Ragnarok map.
- **Starting towns are checked.** Status shows a Starting Towns pill: in Ragnarok every guild starts with 4 towns, and in Game of Claws the map decides (Forest, Snowfield and Badlands: the top 8 guilds get 2 and the 9th gets 1; Wetland: top 6 get 2, 7th gets 1; Woodlands: top 5 get 2, 6th gets 1). Day 0 only takes Lv1 towns, unless you're planning mid-event.
- **Guild spotlight.** Click a guild above the grid (or its Final Scores card) to outline its towns across every day and fade the rest, with a summary of its points and castle, dorm and town days. Works on view-only shared plans too.
- **Status jumps to problems.** Click a red pill under Status, or a problem listed under it, to go straight to it: the cell in the grid, the guilds declaring too many towns, or the day a guild is wiped. It flashes so it's easy to spot.
- **Today at a glance.** While an event is running, today's column is highlighted in the grid and the Declares table, the grid opens scrolled to it, Daily Messages opens on today, and **Copy Today's Message** in the toolbar copies it in one click. "Today" moves on to the next day when that day's battle ends: 10:45 pm Eastern Standard Time in Game of Claws and 11:45 pm in Ragnarok. Everyone sees the same day, wherever they are.
- **A panel while Auto-Optimize runs.** It shows how long the run has taken, what the solver is working on, and a tip that changes every few seconds, over a little grid filling in with your guilds' colors. **Stop** ends the run and leaves your plan as it was. The Auto-Optimize button no longer changes its label while it runs, and clicking it again while a run is going just points you to the panel. The panel's note gives a rough time up front: under a minute in Ragnarok, around 1 to 5 minutes in Game of Claws (up to around 10 with more than 11 guilds).
- **Daily Messages, reworked.** One day shows at a time, with day buttons like the Map's; the whole server's message is laid out in columns, one per guild, and still copies as one message. The whole server's message is shown the way Discord displays it, and copies as Markdown. **Each guild** writes every guild its own message for Tokyo Debunker's guild chat, side by side with your guild first, with its own template and a count against the 150-character limit. It spells out the backup ("Smallest team on J if not available for battle phase") for guild member who won't be available for battle phase, and buildings switch to short names (Castle, Mort, Dio…) when a message would be too long, or always if you choose. Templates now say "Day 1" instead of "D1", can show the weekday as Mon or Monday, and can use a separate message for days nobody declares or gives anything away. **Share** in the template editor copies a link to your templates; whoever opens it sees them previewed with their own plan and can save them (or paste the link under **Use a shared template**).
- **Shared plan links show the plan itself** in Discord and other apps: each guild's final score and total occupation (the user guide and tutorial explain these previews). The preview refreshes each time you save, so Discord shows the newest one.
- **A new user guide.** It starts with a five-step Quick start and a table of contents, and every part of the planner has a screenshot with numbered markers explaining each button. Short animations show copying across the grid, keyboard editing and Spotlight, and an example shows the card a shared plan link produces. Fine detail (how Auto-Optimize works, every message placeholder) is tucked behind "More details".
- **An updated tutorial and a What's new card.** The tutorial has been updated and shows once more for everyone, and its welcome card now has **Skip tour**. The guided setup is hands-on: you fill in Day 0 on the grid or the Map, click a red Status pill to see where a problem is (a practice one is added if your plan has none), and try Auto-Optimize once every guild has its starting towns. It follows the tabs on wide screens, its Map steps keep the card beside the map instead of on top of it (on a phone, the step scrolls to the top so the card sits below what it points at), and the Daily messages part has a step for each message: the whole server's for Discord and each guild's for the in-game guild chat. If you used the planner before and skip the tutorial, a What's new card lists the highlights of this update instead.

### Fixed
- **Screenshots work on a computer again** while an event is running. The highlighted Today column used a color the image maker couldn't read, so it failed without saving anything.
- If a screenshot fails, the page no longer stays stretched wide until a reload.
- On iPhones, the start and end date fields no longer run past the edge of the server settings and the Add Server window.
- On phones, the tutorial's Next and Back buttons always stay in view; long steps scroll their text instead.

## 2026-11-09

### Added
- **Daily message templates.** Click **✏️ Template** on Daily Messages to write the messages your own way, with placeholders for the date, guild, declares, giveaways and where to place def, and a live preview that shows the message the way Discord displays it (or as the text you copy). The template is saved in your browser and used for every server.
- **Guild names in messages:** give a guild a decorated name (emoji and all) that is used only in daily messages.
- The tutorial's Daily Messages step mentions the template.

### Changed
- **Daily messages name one backup town.** When a guild that must place def on a town it is still declaring is giving away several towns, the "or place smallest team on…" advice now names just one: the town being declared on by the guild highest in the guild list.

### Fixed
- **Export Server now keeps Exclude Guild**, so it survives Export and Import.
- **Castle days already held now save.** Typing in a guild's Castle (Lv3) box did nothing (the page hit an error), so plans started mid-event ignored castle days already held.

## 2026-11-08

### Added
- **Exclude Guild now works in Game of Claws, including partway through an event.** If a guild drops
  out, tick Exclude Guild next to them and optimize: the days you have already played stay exactly as
  they are, that guild keeps the towns it was holding, nobody else can take them, and what is left to
  win is shared out between the guilds that remain.

### Fixed
- **Darkwick and the dorms are now shared out around the days you have already played.** A guild that
  had already held the castle twice was still being given a target of once, so the sums could not add
  up and another guild was left with no castle day at all. Days already played are now taken as given,
  and the dorms and points adjust around them.
- **Targets no longer count towns an excluded guild is sitting on**, which nobody can win.

## 2026-11-06

### Changed
- **Run time estimates now match reality.** The app said 10-15 minutes for every Game of Claws plan.
  It is closer to 1-3 minutes for 10 guilds and about 10 minutes for 13, and the message shown when
  you start a plan now follows the guild count.
- **Tutorial and user guide now cover the whole app.** View-only mode and what the people you share
  a link with can do (📋 Duplicate to Edit, 🔄 Pull Latest Updates, 📤 Export Data), 🔄 Sync from
  Cloud — including the warning that it replaces this browser's copy of that plan — ↩ Undo Optimize,
  Exclude Guild, the Final Scores and Total Occupation tables, 🗑 Delete Server and 📤 Share to Apps
  were all missing. Drag-to-copy is described properly too: shift-click or drag to select as well as
  long-press, copying down towns as well as across days, and the block repeating rather than
  stretching.
- **The tutorial can now set your first event up with you.** It opens by asking whether you want to be walked through creating an event or just shown around. The guided version waits while you do each step for real — create the server, name the guilds, fill in Day 0 — and moves on by itself once you have, so you finish with a server of your own rather than a demo. Any step can be skipped.

### Fixed
- **A guild with two castle days now holds them back to back.** The optimizer was already told to
  prefer one unbroken stint, but it plans Game of Claws a few days at a time, and a guild given
  Darkwick in an earlier batch looked free to be given it again in a later one — the stint already
  open was invisible to the batch that split it. Castle days are now checked across the whole run,
  and a split is closed whenever that can be done without costing anyone points or dorm time.
- **Clean-up no longer skips the first week of a plan you filled in partly by hand.** Every clean-up
  pass (dorms, Darkwick and points) cleared the days it was about to re-solve, including your own
  placements, which left it an impossible problem and made it abandon those days silently. Your
  placements are now kept, and a pass covering day 1 no longer gives up when a guild joins the
  event later.

## 2026-11-05

### Fixed
- **Daily messages for guilds joining the map.** A guild with no towns yet that declares one is now told to place def on that town, instead of getting the "or place smallest team if not available" fallback meant for guilds giving away their last town. Guilds not on the map yet and not declaring are left out of that day's message instead of showing "Place def on none".
- **Daily messages for guilds being wiped from the map.** A guild losing all its towns that day is now told to place def on the town it's losing (the highest level one if it loses several), instead of "Place def on none".
- Guild names in the **Declares & Giveaways** table now line up with their rows.

## 2026-11-04

### Added
- 🔗 Save to Cloud now also stores a preview image of the plan, ready for link previews on the upcoming new site address.

### Changed
- Game of Claws optimizer refined for better point balancing
- **Castle time now comes in one block.** A guild with two days of Darkwick gets them back-to-back instead of scattered across the event, so there's less moving around for the same points. On a 10-guild Wetland plan this cut castle hand-overs from 12 to the minimum 10.
- Guilds that start with no towns now enter the map at the first opportunity. The optimizer used to be free to leave a guild idle for days and pay it back later with higher-value towns, which balanced the totals but wasted that guild's early days.

### Fixed
- Replace Obscuary with Dionysia on Wetland Game of Claws map
- Total Occupation table now matches the width of Final Scores and Declares & Giveaways in Screenshots
- **Target points were too high in Game of Claws.** Darkwick can only be taken with a dorm or two level 1 towns held the day before, but the targets assumed any guild standing next to it could take it on day 1. On maps where the castle has a single level 1 neighbor (Forest, Wetland) that counted 3 points nobody could win, so a perfect plan read as 3 points short and the optimizer spread the phantom shortfall across real guilds. Targets in the grid and in the optimizer are now correct, and affected plans can solve faster.
- Game of Claws targets were being calculated with the Ragnarok rules, which have no castle requirement. Each mode now uses its own.
- **Auto-Optimize no longer fails when there are more guilds than towns on the map.** "Every guild on the map from day 1" was treated as a hard rule; on a small map with many guilds it cannot be satisfied, and the whole solve failed with an error instead of returning a plan.
- The optimizer's clean-up passes were building a starting plan for the solver and then discarding it, making them slower than intended.
- **🔄 Sync from Cloud** and **🔄 Pull Latest Updates** now show "✓ Synced!" (or "❌ Error") after syncing; the message used to disappear immediately.

## 2026-11-03

### Added
- **Interactive tutorial** that runs on your first visit. Skip it at any time, and replay it from the 🎓 Tutorial button.
- **Drag-to-copy** in the planning grid: select cells and drag the handle to copy guilds across days.
- **Reorder guilds** by dragging the ☰ handle. Guild order decides who gets extra points, dorm time or castle time.
- **View-only shared links.** People who open a shared plan see a read-only copy and can duplicate it to edit.
- Privacy policy ([PRIVACY.md](PRIVACY.md)), linked from the page footer.
- **Link previews**: sharing the site link in Discord and other apps now shows a title, description and preview image.

### Changed
- Guild colors: a new palette of 15 clearly distinct colors (some of the old ones were near-identical). A new guild always gets a color that isn't already in use, and a server can have up to 15 guilds.
- Game of Claws optimizer refined for better point balancing.
- Project reorganized: source split into `css/`, `js/`, `js/solver/` and `vendor/`; the main script split into focused modules; new README, user guide moved to `docs/`, MIT license added.
- Page styling moved out of the HTML and JavaScript into `css/style.css`. The app looks exactly the same.
- Removed a font (Cinzel) that was loaded but never used, so the page loads slightly faster.

### Fixed
- **Import Guild List** and **Import Daily Map Data** were failing with an error; both work again.
- Guild List import now uses the same colors as the rest of the app (it had its own list of 10, so colors repeated).
- **Exclude Guild** in Ragnarok now behaves correctly.
- The 📸 Screenshots button no longer loses its text color after taking screenshots.
- Removed a stray copy of `index.html` inside `js/`, which loaded as a broken page.

## 2026-11-02

### Added
- Game of Claws support in ⚡ Auto-Optimize (two-phase: Darkwick and dorms first, then points), with a disclaimer about run time.

### Fixed
- Export Server.

## 2026-10-30

### Added
- New optimizer for Ragnarok using the HiGHS solver, running in the browser.

## 2026-10-28

### Changed
- Better layout and touch handling on phones; clearer indicator when viewing a shared plan.
- Maps moved into their own files, groundwork for the HiGHS solver.

### Fixed
- Screenshots on phones (wrapping and cut-off issues).

## 2026-10-21

### Changed
- Screenshots are easier to take and share on phones.

## 2026-10-07

### Fixed
- Snowfield map data.
- Planning grid getting cut off in screenshots.

## 2026-10-05

### Changed
- Game of Claws events are now 13 days long.

## 2026-09-28

### Added
- **Sync from Cloud** to pull the latest version of a shared plan.
- Color-coded action buttons.

### Changed
- User Guide link moved to the header.

### Removed
- Unused "repair" feature.

## 2026-09-25

### Added
- **Save to Cloud** and shareable plan links.

## 2026-09-24

### Fixed
- Screenshots.

## 2026-09-16

### Added
- First version: servers, guilds, planning grid with validation, Ragnarok optimizer, 📸 screenshots, import/export, and the README user guide.
