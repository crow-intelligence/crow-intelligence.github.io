# crow-intelligence.github.io

Source for [crowintelligence.org](https://crowintelligence.org) — the website
of Crow Intelligence, an independent research lab studying how language shapes
thought.

The repo is a hybrid static site:

- **Main site** — a [Pelican](https://getpelican.com/)-built site under
  `pelican/` with a custom dark theme (`pelican/themes/crow-dark/`) and the
  lab's home, about, projects, and packages pages.
- **Aporia** — long-form visual essays under `aporia/`. The first is
  [_The Nagel Index_](https://crowintelligence.org/aporia/nagel-essay/), a
  scrollytelling essay measuring the gap between the public and private voices
  of seven American figures, with companion dashboards.
- **Microsites** — roughly thirty standalone data-viz pieces under `projects/`,
  mostly older exploratory work.

## Building locally

```bash
cd pelican
uv sync
./build.sh                                # writes to ../output, root-relative URLs
python3 -m http.server -d ../output 8000
```

Production builds run on every push to `master` via GitHub Actions
(`.github/workflows/deploy.yml`) and deploy to GitHub Pages.

## Blog

Long-form posts live on the separate WordPress blog at
[blog.crowintelligence.org](https://blog.crowintelligence.org).
