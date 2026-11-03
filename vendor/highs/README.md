# HiGHS (vendored)

Browser build of the [HiGHS](https://highs.dev) linear/MIP solver, from the
[`highs`](https://www.npmjs.com/package/highs) npm package, **version 1.15.4**
([highs-js](https://github.com/lovasoa/highs-js), MIT License, see `LICENSE`).

Only the two files the app loads at runtime are kept:

- `highs.mjs`: ES module loader, imported by `js/solver/worker.js`
- `highs.wasm`: the solver itself

To update: `npm pack highs@<version>`, extract it, and copy `build/highs.mjs` and
`build/highs.wasm` here. Update the version number above.
