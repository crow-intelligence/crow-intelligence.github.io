# Crow Intelligence — site repo

Hybrid static site for Crow Intelligence (https://crowintelligence.org). A Pelican-generated main site plus ~30 pre-existing standalone dataviz microsites plus the Aporia long-form essays, all deployed to GitHub Pages.

Open items and follow-ups live in `BACKLOG.md`.

## Layout

- `pelican/` — main site (Pelican + custom `crow-dark` theme)
  - `content/pages/` — About, Contact, Home, Packages, Projects
  - `content/articles/` — blog posts (see caveat under "Blog")
  - `content/images/` — static assets referenced from content
  - `themes/crow-dark/templates/` — Jinja templates; `base.html` holds the nav + head boilerplate
  - `themes/crow-dark/static/css/style.css` — site styles
  - `pelicanconf.py` — site data (`TEAM`, `PROJECTS`, `PACKAGES`, `PARTNERS`, `MENUITEMS`) + Markdown/URL config
  - `publishconf.py` — overrides for prod (`SITEURL`, feed)
  - `build.sh` — local-dev build (writes to `../output/`, symlinks microsites)
- `projects/*/` — self-contained microsites (each its own HTML/JS/CSS). Featured ones: `site/`, `dashboard/`, `web/`, `analysis/`, `semantic_explorer/`, `embedding_graph/`.
- `aporia/` — visual essays
  - `index.html` — aporia hub (hand-authored HTML, **not** Pelican-generated; has its own nav — keep in sync with `MENUITEMS`)
  - `nagel-essay/` — scrolly long-form essay
- `logos/` — partner logos
- `404.html` — custom 404 at repo root, with a redirect script for legacy WordPress paths
- `CNAME`, `robots.txt` — top-level GitHub Pages config
- `.github/workflows/deploy.yml` — builds Pelican, copies standalone files + microsites into `output/`, deploys to GitHub Pages on push to `master`

## URLs

- Production: https://crowintelligence.org/
- Blog subdomain (WordPress, separate repo/host): https://blog.crowintelligence.org/
- GitHub repo: git@github.com:crow-intelligence/crow-intelligence.github.io

## Commands

```bash
# Local dev build (uses SITEURL='' → root-relative)
cd pelican
source .venv/bin/activate   # venv set up with: uv sync (reads pyproject.toml + uv.lock)
./build.sh
python3 -m http.server -d ../output 8000

# Production build (applies publishconf.py → absolute crowintelligence.org URLs)
cd pelican && pelican content -s publishconf.py -o ../output
```

Every push to `master` triggers the GitHub Actions deploy. Wait ~60-90s for cache + deploy.

## Conventions

- **Asset URLs (CSS, images, logos)**: root-relative (`/foo.css`, `/portraits/zoli.jpeg`). Do **not** prefix with `{{ SITEURL }}`.
- **Canonical / OG / sitemap / feed URLs**: absolute — use `{{ SITEURL }}` in templates.
- **Featured projects, packages, partners, team**: declared as Python data in `pelicanconf.py`. Templates consume them. To add one, edit the list — don't touch the template.
- **Nav**: `MENUITEMS` in `pelicanconf.py` is the source of truth; `base.html:76-88` renders it. Items whose `link` starts with `http` are emitted as-is (external URLs); otherwise prefixed with `{{ SITEURL }}`. The Aporia hub has a **hand-copied** version of this nav — update both when adding/removing menu items.
- **Voice**: measured essayistic prose; Greek/Latin epigraphs are a recurring motif; "independent research lab" positioning. Not promotional or salesy. The founders care about how things are phrased — lean restrained.

## Blog

The WordPress blog was moved to `blog.crowintelligence.org`. On the main site:

- `MENUITEMS` Blog entry points at the subdomain.
- Pelican still has an article pipeline. The `index.html` theme template is a meta-refresh redirect stub, so the generated `/blog/index.html` forwards to the subdomain.
- `pelican/content/articles/inaugural-post.md` still exists and generates an orphan page at `/blog/inaugural-post.html`. See `BACKLOG.md`.

## Pitfalls

- The Aporia hub and each project microsite are hand-authored HTML outside the Pelican pipeline — theme changes don't propagate to them automatically.
- Each microsite has its own `og:image` / `twitter:image` meta tags. If the domain ever moves again, they need manual updates (or convert them to root-relative, but OG tags need absolute URLs to work in previews).
- `build.sh` does not copy `CNAME`, `robots.txt`, or `404.html` into `output/` — those only land via the deploy workflow. For local testing of those files, copy them by hand.
- The deploy workflow's first copy loop (`.github/workflows/deploy.yml:36-47`) lists legacy root-level dirs that now all live under `projects/`. Harmless (guarded by `[ -d ]`), but dead weight.

## Getting oriented fast

- Site-wide text or copy? `pelican/content/pages/*.md`.
- Featured project / package / partner list? `pelican/pelicanconf.py`.
- Nav / header / footer / SEO meta? `pelican/themes/crow-dark/templates/base.html`.
- Homepage sections? `pelican/themes/crow-dark/templates/homepage.html`.
- Styling? `pelican/themes/crow-dark/static/css/style.css`.
- Aporia landing or essays? `aporia/index.html` (hub) or `aporia/<slug>/index.html` (essays).
- New dataviz microsite? Drop it under `projects/<slug>/` — `build.sh` and the deploy workflow auto-pick it up.
