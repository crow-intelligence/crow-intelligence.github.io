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

All five are permissive and require only that the copyright notice travel with
the code, which the minified headers carry.
