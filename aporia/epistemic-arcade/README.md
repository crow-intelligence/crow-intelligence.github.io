# The Epistemic Arcade — frontend

A vanilla HTML / CSS / JS scrollytelling visualization of the Alpha (Internalist) vs Beta (Extended Mind) Tetris agents.

This folder is **self-contained** — it carries its own copy of the telemetry under `data/`, so it can be copied as-is into any site repo and served standalone.

## Run it locally

Serve this `web/` folder as the document root:

```bash
# From inside web/:
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

That's it — no build step, no npm. Chart.js and the fonts are loaded from CDNs (the only external dependencies; everything else lives in this folder).

## Files

- `index.html` — six-step scrollytelling layout (prose column + sticky visual column). Triggers: intro → Otto/demo → 10k → 250k → 1M → chart.
- `styles.css` — "Refined Monochrome CRT" design system (per `essay_spec.md` §2).
- `app.js` — data loading, JSON decoder, canvas renderer, IntersectionObserver step controller, Chart.js setup.

## Data dependencies

- `data/telemetry_alpha.json` — produced by `uv run python -m epistemic_arcade.agents.evaluate --agent alpha`.
- `data/telemetry_beta.json` — same, for Beta.

These are **copies** of the backend's output in the project-root `data/` folder, kept here so `web/` stays self-contained. After re-running `evaluate`, refresh them by copying the new files into `web/data/`.

If either file is missing, the loading screen will replace itself with a hint pointing back here.

## Hotkeys

None — the experience is driven entirely by scroll position.

## Browser support

Tested on current Chrome and Firefox. Uses `fetch`, ES2020+ syntax, `IntersectionObserver`, and `requestAnimationFrame`. No polyfills. Mobile Safari should work; the layout collapses to a single column under 960 px.
