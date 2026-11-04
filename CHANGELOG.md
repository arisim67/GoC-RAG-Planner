# Changelog

Notable changes to the GoC / Ragnarok Planner, newest first.
The app is updated continuously rather than in numbered releases, so entries are grouped by date.

## 2026-11-04

### Changed
- Game of Claws optimizer refined for better point balancing

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