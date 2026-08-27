# Vendored, not fetched

The page opens with no network. A missing tile layer degrades to a map with no tiles; a
missing `d3-geo` is a blank screen, and this is meant to outlive whichever CDN it would
otherwise have depended on.

Each file is a jsDelivr ESM bundle with its own import paths rewritten to point at the file
next door, so the whole chain resolves relatively:

| file | version | licence | sha256 |
|---|---|---|---|
| `d3-geo-3.1.1.js` | d3-geo 3.1.1 | ISC | `ce6b3352dfe993691659b9f44be04f5ff3a0b79418df1aa3f79ad8ee3c537790` (before rewrite) |
| `d3-array-3.2.4.js` | d3-array 3.2.4 | ISC | `b9fec3812749682a65b96d946092bdf827683305e18366a9e56e93addfb02559` (before rewrite) |
| `internmap-2.0.3.js` | internmap 2.0.3 | ISC | `2809979e4bda50bae77cbe33a926556ff4459e60a9f91f7a62de1392881e7679` |

Fetched from `https://cdn.jsdelivr.net/npm/<name>@<version>/+esm`, then:

```
sed -i 's#"/npm/d3-array@3.2.4/+esm"#"./d3-array-3.2.4.js"#g'  d3-geo-3.1.1.js
sed -i 's#"/npm/internmap@2.0.3/+esm"#"./internmap-2.0.3.js"#g' d3-array-3.2.4.js
```

`tests/test_web_page.py` checks that no import in here still points at a CDN.

## What is deliberately absent

**The full d3 bundle.** 278 KB of force layouts, scales, axes and CSV parsing that this page
never calls, against 57 KB for the three files above.

**`d3-selection`, `d3-drag`, `d3-transition`.** Replaced by `querySelector`, a pointer-event
handler and one `requestAnimationFrame` loop — about forty lines between them.

**`versor`.** It gives you "the point you grabbed stays under the cursor", which is lovely on
a free-tumbling globe and wrong here: its minimal rotation spins the third angle and rolls
the horizon. This is an atlas and it reads north-up, so the drag moves two angles and pins
the roll at zero — the same decision, for the same reason, as `globe.shortest_rotation`.

**`topojson-client`.** The coastline is plain GeoJSON, converted in Python where it is
doctested. `historical-basemaps` ships GeoJSON too, so the borders layer will not need it
either.
