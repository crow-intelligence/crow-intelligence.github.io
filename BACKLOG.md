# Backlog

Open work on the Crow Intelligence site. Oldest at the bottom of each section. See `CLAUDE.md` for project orientation.

## Next up

- [ ] Decide fate of `pelican/content/articles/inaugural-post.md`. It still generates an orphan page at `/blog/inaugural-post.html` with nothing linking to it. Options: (a) republish on `blog.crowintelligence.org` and delete from this repo, (b) delete from the repo outright, (c) keep and relink from the main site somehow.
- [ ] Clean up the legacy copy loop in `.github/workflows/deploy.yml:36-47`. Dirs like `altair_maps`, `charts`, `countries`, etc. all live under `projects/` now and are already covered by the second loop. Harmless, but dead weight.
- [ ] `projects/verne/data/provenance.json` publishes local absolute paths. Two `inputs` entries read `/home/zoli/projects/verne80/src/verne80/{people,tracks}.json`, and the file is fetched publicly (`app.js:24`) and offered as a `DataDownload` (`index.html:142`). Fix upstream — make `scripts/08_dashboard.py` in the **verne80** repo emit repo-relative paths, regenerate, and re-copy. Don't hand-edit the committed record; it's a generated provenance file.
- [ ] `pelicanconf.py:168` lists a project at `/web/` with image `/web/preview.svg`, but no `web/` directory exists in the repo. The `if [ -d ]` guard in `deploy.yml` means the build stays green, but that card and its sitemap entry point at a 404.
- [ ] Verify in GitHub repo Settings → Pages that "Enforce HTTPS" is ticked and the TLS cert for `crowintelligence.org` has issued cleanly.

## Nice to have

- [ ] Add main-site nav to the featured project microsites (`/site/`, `/dashboard/`, `/web/`, `/analysis/`, `/semantic_explorer/`). Each has its own styling, so this needs per-page integration work, not a single edit.
- [ ] Decide whether the Nagel essay (`/aporia/nagel-essay/`) should carry the main site nav on top of its section-dots nav, or whether the immersive scrolly format is intentional.
- [ ] Tidy `projects/verne/chapters/index.html`: it omits the two skip links and the two font preloads that its sibling `projects/verne/index.html:185-188,199-200` carries, and it holds 16 `data-i18n*` plus 37 `data-chapter` attributes that no script reads (the language ladder was removed — see `i18n.js:9-11`). Inert, but they read as live hooks.
- [ ] Stale comment at `projects/verne/app.js:3-9` — it claims `#ch-N` names a real element on the index page. True before the chapter prose moved to `chapters/`; the `<noscript>` itinerary at `index.html:278-285` still covers the no-JS case, so this is comment-only.
- [ ] Teach `pelican/build.sh` to symlink/copy `CNAME`, `robots.txt`, and `404.html` into `output/` so local dev mirrors the deploy workflow.

## Recently shipped

- [x] **2026-08-27** — *Around the World in 80 Days* microsite live at `/verne/`, with the chapter summaries at `/verne/chapters/` and a card on the projects grid.
- [x] **2026-07-01** — Published `keyflux` and `lexograph` packages on the site (portfolio cards + packages page, with logos). `lexograph` promoted from "coming soon".
- [x] **2026-04-20** — Aporia hub nav now includes Blog + Contact to match `MENUITEMS`.
- [x] **2026-04-20** — Custom-domain migration to `crowintelligence.org`: `SITEURL` repoint, root-relative asset paths in theme, Blog nav points at `blog.crowintelligence.org`, custom 404 with WordPress-path redirects, Pelican `/blog/` becomes a redirect stub.
- [x] Earlier — Corvus cookiecutter added to open-source packages; mobile radar chart race-condition fix on Nagel essay; SEO pass (canonical URLs, per-page meta, OG tags, article schema).
