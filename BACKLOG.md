# Backlog

Open work on the Crow Intelligence site. Oldest at the bottom of each section. See `CLAUDE.md` for project orientation.

## Next up

- [ ] Decide fate of `pelican/content/articles/inaugural-post.md`. It still generates an orphan page at `/blog/inaugural-post.html` with nothing linking to it. Options: (a) republish on `blog.crowintelligence.org` and delete from this repo, (b) delete from the repo outright, (c) keep and relink from the main site somehow.
- [ ] Clean up the legacy copy loop in `.github/workflows/deploy.yml:36-47`. Dirs like `altair_maps`, `charts`, `countries`, etc. all live under `projects/` now and are already covered by the second loop. Harmless, but dead weight.
- [ ] Verify in GitHub repo Settings → Pages that "Enforce HTTPS" is ticked and the TLS cert for `crowintelligence.org` has issued cleanly.

## Nice to have

- [ ] Add main-site nav to the featured project microsites (`/site/`, `/dashboard/`, `/web/`, `/analysis/`, `/semantic_explorer/`). Each has its own styling, so this needs per-page integration work, not a single edit.
- [ ] Decide whether the Nagel essay (`/aporia/nagel-essay/`) should carry the main site nav on top of its section-dots nav, or whether the immersive scrolly format is intentional.
- [ ] Teach `pelican/build.sh` to symlink/copy `CNAME`, `robots.txt`, and `404.html` into `output/` so local dev mirrors the deploy workflow.
- [ ] Publish the `lexograph` package. It's advertised as "coming soon" on `pelican/content/pages/packages.md`.

## Recently shipped

- [x] **2026-04-20** — Aporia hub nav now includes Blog + Contact to match `MENUITEMS`.
- [x] **2026-04-20** — Custom-domain migration to `crowintelligence.org`: `SITEURL` repoint, root-relative asset paths in theme, Blog nav points at `blog.crowintelligence.org`, custom 404 with WordPress-path redirects, Pelican `/blog/` becomes a redirect stub.
- [x] Earlier — Corvus cookiecutter added to open-source packages; mobile radar chart race-condition fix on Nagel essay; SEO pass (canonical URLs, per-page meta, OG tags, article schema).
