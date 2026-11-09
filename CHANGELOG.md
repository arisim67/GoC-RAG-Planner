# Changelog

Notable changes to the GoC / Ragnarok Planner, newest first.
The app is updated continuously rather than in numbered releases, so entries are grouped by date.

## 2026-11-15

### Changed
- **The planner has moved to [goc-rag-planner.pages.dev](https://goc-rag-planner.pages.dev/).** The old address (arisim67.github.io) will be turned off on January 1, 2027. Until then it shows a banner with **Move my servers**, which brings your saved servers (and whether you've seen the tutorial) to the new site without uploading them. Shared plan links made on the old address open on the new site automatically.
- **Shared plan links now show the plan itself** in Discord and other apps: each guild's final score and total occupation.
- Save to Cloud links made from the old address point to the new site.
- **A cleaner look.** The server toolbar groups its buttons, with Auto-Optimize as the main action and Clear Plan set apart; buttons use line icons instead of emoji; the guild list has labelled columns (Points, Castle, Dorms, Towns); and a bar at the top jumps to each part of the page.
- The project now has automated tests that run on every update, and issue forms for bug reports and suggestions.
- **Guild spotlight.** Click a guild above the grid (or its Final Scores card) to outline its towns across every day and fade the rest, with a summary of its points and castle, dorm and town days. Works on view-only shared plans too.
- **Today at a glance.** While an event is running, today's column is highlighted in the grid and the Declares table, the grid opens scrolled to it, today's message card is highlighted, and **Copy Today's Message** in the toolbar copies it in one click.
- **Undo and Redo for the grid.** Buttons above the Planning Grid, plus Ctrl+Z / Ctrl+Y (⌘Z / ⌘⇧Z on a Mac), step back and forward through changes to the plan: cells, copying across cells, Clear Day, Clear Plan, importing a day, removing a guild and Auto-Optimize. This replaces the separate Undo Optimize button; an optimize can still be undone after reloading the page, as long as the plan hasn't been changed since.
- **Choose each guild's colour.** Click the coloured dot next to a guild's name: pick from a palette that suits the planner, or use any colour on the Custom tab. The planner warns you if a colour is very close to another guild's or too dark to read.
- **What's new.** If you used the planner before, a card lists the highlights of this update the first time you visit (shown if you skip the updated tutorial).
- **The tutorial has been updated** and shows once more for everyone.
- **Status jumps to problems.** Click a red pill under Status, or a problem listed under it, to go straight to it: the cell in the grid, the guilds declaring too many towns, or the day a guild is wiped. It flashes so it's easy to spot.
- **"Today" follows the game's day,** which changes at 1 am Eastern Standard Time, instead of your device's midnight. Everyone sees the same day, wherever they are.
- **All 13 days fit on a desktop screen.** On a full-screen desktop the page uses more of the width, and the Planning Grid and Declares & Giveaways table are more compact, so a whole event fits without scrolling sideways. Guild names are never cut short in the grid or the running points: a long name wraps onto a second line on narrower screens instead.
- **Fold away sections you don't need.** Click a section's title (or the arrow beside it) to fold it down to just the title, and again to open it. Folded sections are remembered in your browser for every server, open when you jump to them from the bar of section links, and are still included in Screenshots.
- **Share your message template.** **Share** in the template editor copies a link to your template. Whoever opens it sees it previewed with their own plan and can save it, or paste the link under **Use a shared template**.
- **Edit the grid from the keyboard.** Arrow keys move between cells (Shift+Arrow selects a block), typing the start of a guild's name picks it, Delete empties cells, and Ctrl+C / Ctrl+X / Ctrl+V copy, cut and paste a block of cells.
- **Version history.** **History** in the toolbar keeps the last 10 saved copies of each server in your browser, taken every 15 minutes while you edit and just before anything big (Clear Plan, Auto-Optimize, imports, Sync from Cloud, changing mode or map, deleting a server). Restore any copy in one click, including servers you deleted.
- The user guide and tutorial now explain link previews, with an example of the card a shared plan produces.

### Fixed
- On narrow screens, the bar of section links (Setup, Guilds, Grid…) no longer loses its bottom border at the top of the page.
- **The tutorial's welcome card has a Skip tour button**, so you can close it without picking one of the two ways through.

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
- **Target points were too high in Game of Claws.** Darkwick can only be taken with a dorm or two level 1 towns held the day before, but the targets assumed any guild standing next to it could take it on day 1. On maps where the castle has a single level 1 neighbour (Forest, Wetland) that counted 3 points nobody could win, so a perfect plan read as 3 points short and the optimizer spread the phantom shortfall across real guilds. Targets in the grid and in the optimizer are now correct, and affected plans can solve faster.
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
- Guild colours: a new palette of 15 clearly distinct colours (some of the old ones were near-identical). A new guild always gets a colour that isn't already in use, and a server can have up to 15 guilds.
- Game of Claws optimizer refined for better point balancing.
- Project reorganised: source split into `css/`, `js/`, `js/solver/` and `vendor/`; the main script split into focused modules; new README, user guide moved to `docs/`, MIT licence added.
- Page styling moved out of the HTML and JavaScript into `css/style.css`. The app looks exactly the same.
- Removed a font (Cinzel) that was loaded but never used, so the page loads slightly faster.

### Fixed
- **Import Guild List** and **Import Daily Map Data** were failing with an error; both work again.
- Guild List import now uses the same colours as the rest of the app (it had its own list of 10, so colours repeated).
- **Exclude Guild** in Ragnarok now behaves correctly.
- The 📸 Screenshots button no longer loses its text colour after taking screenshots.
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
- Colour-coded action buttons.

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
