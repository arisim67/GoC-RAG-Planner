# GoC / Ragnarok Planner

A browser-based planning tool for **Tokyo Debunker** guild events: **Game of Claws (GoC)** and **Ragnarok**.
Server leads use it to lay out who takes which town on which day, check that the plan is legal,
and auto-balance points, Darkwick and dorm time across guilds with a built-in MILP optimizer.

**[Open the app](https://arisim67.github.io/GoC-RAG-Planner/)** · **[User guide](docs/user-guide.md)**

![Planner screenshot](docs/screenshot.png)

## Features
 
- **Planning grid** for every town and day, with adjacency shown inline and drag-to-copy across days
- **Live validation** of adjacency, daily declare limits (2 for GoC, 3 for Ragnarok) and map wipes
- **⚡ Auto-Optimize**: proposes a full, legal plan that balances final points, Darkwick and dorm counts
- **Import / export**: paste guild lists or daily placements; back up a whole server as JSON
- **Save to Cloud**: share a live link with server leadership
- **Screenshots and daily messages** ready to paste into Discord
- **Interactive tutorial** on first visit, replayable from the 🎓 Tutorial button
- Runs entirely in the browser and saves automatically to local storage
## Running locally
 
There is no build step. The app uses ES modules and a Web Worker, so it must be served over HTTP;
opening `index.html` directly from disk will not work.
 
```bash
git clone https://github.com/arisim67/GoC-RAG-Planner.git
cd GoC-RAG-Planner
python3 -m http.server 8000
# then open http://localhost:8000
```
 
Any static file server works (`npx serve`, the VS Code Live Server extension, etc.).
 
## Project structure
 
```
├── index.html              App page
├── css/                    Styles (style.css, tour.css)
├── js/
│   ├── app.js              Entry point: startup, and the functions the HTML buttons call
│   ├── state.js            Servers, active server, guild colours, saving/loading
│   ├── calc.js             Scores, occupation, declares, plan validation
│   ├── render.js           Builds the page (tabs, settings, guilds, grid, stats, messages)
│   ├── handlers.js         Edits made in the page (settings, guilds, grid cells)
│   ├── servers.js          Server tabs: add, switch, rename, duplicate, delete
│   ├── import-export.js    Import modal and Export Server
│   ├── optimize.js         ⚡ Auto-Optimize (runs the solver in a Web Worker)
│   ├── grid-fill.js        Select cells and drag to copy across days
│   ├── screenshots.js      📸 Screenshots
│   ├── cloud.js            Save to Cloud / Sync and shared plan links
│   ├── ui.js               Small helpers (toasts, escaping, date labels)
│   ├── config.js           Deployment settings (cloud sync URL)
│   ├── tour.js             Interactive first-visit tutorial
│   ├── maps/               Town layouts and adjacency for each map
│   └── solver/
│       ├── worker.js       Runs HiGHS in a Web Worker so the page stays responsive
│       ├── milp.js         Small helper for building MILP models
│       ├── model_ragnarok.js   Ragnarok model (single solve)
│       ├── model_goc.js    Game of Claws model
│       ├── twophase.js     GoC two-phase strategy (Darkwick/dorms, then points)
│       ├── paths.js        Works out the Lv1 towns needed to reach Darkwick/dorms
│       └── check.js        Plain-JS legality check for solver output
├── vendor/highs/           Vendored HiGHS solver (WebAssembly)
├── images/                 Favicons
└── docs/                   User guide and screenshots
```

## How the optimizer works

Plans are written as mixed-integer linear programs and solved in the browser with
[HiGHS](https://highs.dev) compiled to WebAssembly.

- **Ragnarok** is solved in a single pass (up to about a minute).
- **Game of Claws** is larger, so it is split in two, the way it is done by hand. Phase 1 shares out
  Darkwick and the dorms a few days at a time with lookahead, and fixes the Lv1 "path" towns each
  guild needs to reach them. Phase 2 hands out the remaining Lv1 towns in one solve to even out total
  points. Every result is re-checked by `check.js` before it replaces a legal plan. A full run takes
  around 10–15 minutes.

The optimizer gives a strong starting point, not a guaranteed-perfect plan. Check the Stats table and
adjust by hand where needed.

## Credits

Made by **ari** (EA-4, 43, 45)/**gharial** (EA-44), with help from Claude and Gemini.
Questions or suggestions: `arianes.` on Discord.

Solver: [HiGHS](https://highs.dev) via [highs-js](https://github.com/lovasoa/highs-js) (MIT).
Libraries: [JSZip](https://stuk.github.io/jszip/), [html2canvas](https://html2canvas.hertzen.com/),
[SortableJS](https://sortablejs.github.io/Sortable/).

## License

Code is released under the [MIT License](LICENSE).

This is a fan-made tool and is not affiliated with or endorsed by the developers or publishers of
Tokyo Debunker. Game names and terms belong to their respective owners.