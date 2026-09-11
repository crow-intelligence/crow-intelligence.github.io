# Parlamonitor dashboard

A static page. No server, no build step: `index.html`, `app.js`, and one JSON
bundle it fetches.

```bash
uv run python scripts/build_dashboard_data.py   # writes data/dashboard.json
python3 -m http.server 8765 --directory dashboard
# then open http://127.0.0.1:8765/
```

It must be served over HTTP rather than opened as `file://`, because it fetches
the bundle.

`data/dashboard.json` (~2.2 MB) is derived and therefore gitignored, like
everything else under `data/derived/`. Rebuild it with the command above; it
takes a second and needs no models.

## Why these forms

**Not a radar chart.** A radar encodes magnitude as radius, so area grows as the
square and a 2x score reads as 4x; its axis order is arbitrary and rotating it
changes the silhouette a reader interprets; and the metrics here are
incommensurable (LIX ~20-85, MATTR 0-1, valence -1...+1, laughs 0-176), so a
radar could only show them normalised, which hides the values.

The profile view uses **percentile strips** instead: every eligible MP as a
faint dot, the selected one filled, the party median as a tick. The question is
"is this MP unusual, and which way", and that is a comparison against a
population -- so the population is drawn.

Elsewhere: a **diverging stacked bar** centred on neutral for the ordered
sentiment scale; a **heatmap on per-column z-scores** for topic x metric, so one
diverging ramp serves every column and 0 always means the cycle average; a
**force layout** for the interruption network.

The MP/topic association is a **table, not a chart**, and reports three numbers
rather than one: raw speeches, the share of *that MP's* output, and the share of
*that topic's*. They rank people differently on purpose -- a backbencher who
spoke twelve times, 92% of it on one subject, is a specialist; a frontbencher
with nine speeches at 27% of their output is passing through. One number would
have hidden whichever kind of association the reader wanted.

### The two network sizings

The network offers node size by **in-degree** (how often a member was
interrupted) or **out-degree** (how often they interrupted others). Two
decisions make the pair comparable rather than two unrelated pictures:

- **One shared radius scale**, over the larger of the two maxima (289 received,
  247 given). Independent scales would make everyone look equally central in
  both views and hide the asymmetry, which is the whole point.
- **The layout is not re-run when you switch.** Nodes resize in place, so what
  you see is the change itself. Only the collide force is updated and the
  simulation gently reheated to relax overlaps.

The labelled six follow the active metric, so the names change with the view.
Edge thickness is the edge weight -- how many times that ordered pair happened
-- on a sqrt scale over 1-64, because the median edge is 1 and a linear scale
would render almost everything hairline.

The two views are deep-linkable: `?size=in` and `?size=out`.

## Colour

Four categorical slots, validated with the dataviz skill's checker:

```
validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100" --mode light   # all pass
validate_palette.js "#3987e5,#d95926,#199e70,#c98500" --mode dark    # all pass
```

Light mode returns a contrast warning, which the method says is relieved by
visible labels *or* a table view. The speeches table used to be the second; it
has been removed (there is a separate search site for that), so the relief now
rests entirely on the first: every percentile strip carries a direct value and
percentile, the topic/MP view is a table, and every mark has a tooltip.

**These are not party brand colours.** The brand hex values for TISZA, KDNP and
Mi Hazank are not reliably known here, and a wrong party colour in a political
dashboard is a factual error, not a styling choice. The slots are assigned in
fixed order so a filter never repaints the survivors. Swap them for real brand
values and re-run the validator if you have them.

Dark mode is a selected set of steps against the dark surface, not an automatic
flip, and it is validated separately.

## Robustness the strips needed

A percentile strip shows the whole population, so a single outlier squashes
everyone else onto one edge. Two records did exactly that and both were the
same artefact — the notary's roll-call, a list of names with no sentence
punctuation. It scores LIX 594 and MHD 26.3 against corpus medians of 40 and
2.4.

The fix is upstream of the chart, not in it: `readability_reliable` flags the
record for LIX, and the syntax metrics cap sentence length at 120 tokens. Both
thresholds come from the measured distribution rather than taste — sentence
length here is 15 tokens at the median, 102 at the 99.9th percentile, and that
"sentence" is 517.

## Gotchas found while building this

- **`d3.scaleLinear` cannot interpolate CSS `var()` strings** -- a scale given one
  silently produces black, which is what the whole heatmap did until it was
  rendered and looked at. It now resolves variables to computed values first
  (`cssVar()`), which is also why it re-renders on a theme change.
- **Hardcoding `data-theme="light"` on `<html>` defeats `prefers-color-scheme`
  entirely.** The attribute is set only by the toggle.
- **Force-layout labels collide** in the centre of a hairball. Only the six
  heaviest nodes are labelled, with a surface-coloured halo under the text.

## Deploying it elsewhere

The directory is self-contained: copy `dashboard/` wherever it needs to live and
it runs. There is no build step, no framework, and nothing is fetched from a CDN
at runtime — d3, graphology and graphology-layout-forceatlas2 are vendored under
`vendor/` with their licences in `vendor/LICENSES.md`.

Two constraints survive:

* **It must be served over HTTP**, not opened as a `file://` URL. `app.js` is an
  ES module and the data arrives via `d3.json("data/dashboard.json")`; both are
  blocked by the `file://` origin rules. Any static host works — GitHub Pages,
  Netlify, an `nginx` alias. Locally, `python3 -m http.server` is enough.
* **Copy the whole directory together.** Every path inside is relative
  (`vendor/…`, `data/dashboard.json`), so the dashboard works at any URL prefix
  — `/parlamonitor/`, `/aporia/parlament/`, the domain root — as long as the
  four parts stay in the same folder.

`data/dashboard.json` is 2.8 MB uncompressed and around 600 kB over gzip, which
every static host applies by default. It is the only data file; nothing else is
read at runtime.

### Vendoring, if the libraries are ever re-pinned

jsdelivr's `+esm` bundles carry absolute `/npm/...` imports for their peer
dependencies, so downloading one file is not enough — an unrewritten bundle
silently falls back to the network and the page works right up until the CDN
doesn't. `vendor/LICENSES.md` records which transitive modules were resolved and
rewritten to relative paths. Verify a re-pin by loading the page with the
network blocked, not by reading the HTML.
