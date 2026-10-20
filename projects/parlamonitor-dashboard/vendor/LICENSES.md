# Vendored third-party libraries

Pinned copies, fetched from jsdelivr so the dashboard runs without a CDN. The
`+esm` bundles' own absolute `/npm/...` imports were rewritten to relative
paths, and their transitive dependencies vendored alongside them — an
unrewritten `+esm` bundle silently falls back to the network.

| File | Package | Version | Licence |
|---|---|---|---|
| `d3.v7.min.js` | d3 | 7.9.0 | ISC — © Mike Bostock |
| `graphology.esm.js` | graphology | 0.25.4 | MIT — © Guillaume Plique |
| `forceatlas2.esm.js` | graphology-layout-forceatlas2 | 0.10.1 | MIT — © Guillaume Plique |
| `graphology-utils@2.5.2__*.js` | graphology-utils | 2.5.2 | MIT — © Guillaume Plique |
| `obliterator@2.0.4__*.js` | obliterator | 2.0.4 | MIT — © Guillaume Plique |
| `tone.min.js` | tone | 15.1.22 | MIT — © Yotam Mann (`tone.LICENSE.md`) |

All six are permissive and require only that the copyright notice travel with
the code. The first five carry it in their minified headers. Tone.js's header
only points to a separate licence file, so that file travels alongside as
`tone.LICENSE.md`.

`tone.min.js` is the UMD build (`build/Tone.js`, sha256
`e290952fa43d9a7a780182a83c6fccf44d79cb7ae2cba102ef1f2b9d98124e22`). It defines
a global `Tone`, and `sound.js` loads it only when the sonification is first
played, so the page itself does not pay for its 345 KB.
