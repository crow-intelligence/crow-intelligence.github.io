# SEO, structured data and repositioning — what shipped

Everything below is **live on crowintelligence.org**. This file records the decisions that
changed numbers, what was deliberately left alone, and what still needs a human call.

Nothing here invented a fact. No DOI, ORCID, founding date or publication date was
fabricated; every unknown was omitted and is listed below.

---

## What landed

| PR | What |
|---|---|
| [#9](../../pull/9) | Language attributes, `/hu/` retirement, sitemap rebuild, canonical fixes |
| [#17](../../pull/17) *(was #10)* | Structured data: identity, datasets, breadcrumbs |
| [#11](../../pull/11) | `llms.txt` corrections, `llms-full.txt`, `robots.txt`, IndexNow, redirect map |
| [#12](../../pull/12) | Crawlable content, the Nagel dashboards, and the CI linter |
| [#15](../../pull/15) | The Parlamonitor dashboard at `/parlamonitor-dashboard/` |
| [#16](../../pull/16) | Services repositioned around language data → decisions |

Closed without merging: **#13**, superseded by #16 — its whole diff optimised a page #16
deleted. Its surviving work was carried across. **#10** was auto-closed by GitHub when its
base branch was deleted on merge, and continued as #17.

---

## Six audit premises that were wrong

The audit read a markdown conversion of the site rather than raw HTML.

1. **`<html lang>` was not missing.** `base.html` had always emitted it. Only the ~3,000
   auto-generated Vega files, in no sitemap, lacked it.
2. **Structured data existed in 16 files**, including a full `ResearchOrganization` with
   both founders. CI-07 was correct-and-extend, not inject-from-scratch.
3. **The three "zombie WordPress pages" are not in this repository.** No `wp-content`,
   no `20xx/`, no `category/`, `tag/`, `author/`, `portfolio-*`. **CI-02 had nothing to
   delete** — see "still needs a decision".
4. **Sitemaps and `llms.txt` were already generated at build time.**
5. **No alt text was missing**, and `/packages.html` was not missing the Terms footer link.
6. **`/aporia/epistemic-arcade/` had 1,038 words and one H1**, not "~0 words, no H1" —
   they were inside a `hidden` container revealed by JavaScript, which is a worse bug.

## Findings the audit missed

- **The Epistemic Arcade was invisible without JavaScript**, and stayed permanently hidden
  behind a full-screen error if its telemetry fetch failed. Now renders 1,046 words with JS
  off.
- **The seven Nagel dashboards shipped twice**, at `/aporia/nagel-essay/dashboards/` and
  `/dashboard/`, neither canonical — duplicate content on the third most-visible page.
  Nothing on the site linked to them.
- **Parlamonitor's payload leaked a home directory** into every visitor's browser. Fixed in
  the generator, not by hand.
- **`/services/ai-adoption-audit.html` had no `Og_image`**, inheriting an essay illustration.
- **`projects/embedding_graph/viz.html` had no `<!DOCTYPE>` and no `<html>` element.**
- **`homepage_hu.html` was still advertising both withdrawn services in Hungarian.**

---

## Decisions that changed the numbers

Each was a choice. Reverse any of them in one place.

| Decision | Where | Why |
|---|---|---|
| `og:locale` **`en_GB`**, `hu_HU` on Hungarian pages | `OG_LOCALE` in `pelicanconf.py` | The copy is British throughout |
| **`<priority>` dropped** from both sitemaps | sitemap templates | Uniform priority carries the same information as none |
| `<lastmod>` = **last commit date**, not mtime | `_git_lastmod`; `fetch-depth: 0` | A CI checkout rewrites every mtime to build time |
| Sitemap exclusions **derived, not listed** | `content/sitemap.xml` | A page marked `noindex` or carrying `Redirect:` drops out by itself — which is why the withdrawn services needed no explicit rule |
| `/aporia/nagel-essay/dashboards/` wins the canonical | dashboards + `/dashboard/` | It earns the impressions and sits under the essay |
| Essay `datePublished` **is** emitted, from `APORIA` | `pelicanconf.py` | Your own authored dates, already in `feed.xml`. Not from git or mtimes |
| Essay `author` stays the **Organization** | essay JSON-LD | Which founder wrote which essay is not established |
| **250 words** of no-JS prose minimum | `MIN_WORDS` in `scripts/lint_html.py` | 23 exemptions, each with a printed reason |
| Meta descriptions capped at **160 characters** | `scripts/lint_html.py` | SERP truncation point |
| PyPI versions **not fetched at build time** | — | A network call on the deploy path means a PyPI outage fails a build |
| Service naming stays **plain and searchable** | `language-insight.md` | "AI adoption audit" was a coined category with zero commercial-intent queries in three months |
| The Hungarian blog sits on **Zoltán's `sameAs`**, not the lab's | `about.md` | It is his reading diary, not a Crow property |

**The linter now gates every deploy.** It runs after the asset copies and before the
artifact uploads, so a page that fails stops a release rather than shipping quietly.
Currently: 39 pages, 0 errors, 23 accepted exemptions, 0 stale.

---

## Still needs a human decision

1. **A social card for `/services/language-insight.html`.** It falls back to the generic
   brand image, so a LinkedIn share of the main sales page shows nothing about the page.
   The old cards were typeset text reading "AI DUE DILIGENCE" and could not be reused;
   matching the template needs IM Fell English as a `.ttf`/`.otf`, since the only copy in
   the repo is `woff2`, which the image library cannot read. Cosmetic, not blocking.

2. **The seven Nagel dashboards** each carry an empty, briefed prose section awaiting
   per-figure sources and findings. `/aporia/nagel-essay/dashboards/washington_dashboard.html`
   is the third most-visited page on the site, so this is the highest-value of the open items.

3. **The Parlamonitor generator still leaks a home directory.** Three scripts in
   `parlamonitor-experiments` write `"source": str(path)` into provenance, which is how
   `/home/zoli/...` reached the published payload. The live site is clean because a
   regenerated payload shipped, but **the leak returns on the next rebuild.** The fix is one
   line in each — `heckle_network.py`, `speech_metrics.py`, `speech_syntax.py` — using the
   `relative_to(ROOT)` idiom those files already have. That is a separate repository, so it
   is yours to make.

4. **A byline for `aporia/magyar-dalszovegek-essze/`.** The other four essays are signed;
   this one is generated from `music_networks`, so its byline belongs in that generator's
   template rather than here.

5. **`/felsozsolca/` and `/chokepoints/`** are both work in progress and deliberately
   untouched. For the record: both are in `sitemap-projects.xml`, `/felsozsolca/` is held out
   of `llms-full.txt`, and both carry linter exemptions.

**Closed since this list was written.** The three "zombie WordPress pages" were checked
against the live site: `/2020/02/21/getting-started-with-sql/`, `/author/crowintelligenceteam/`,
`/portfolio-3/`, `/privacy-policy/`, `/research/` and `/au/` **all return 404**. Nothing else
is serving the apex, so there was no duplicate content and no second origin.

The Cloudflare migration was **dropped**: no external links point at the withdrawn services
and search traffic is minimal, so real 301s would recover almost nothing. The redirect map
that documented it is deleted. The Pelican meta-refresh stubs stay — they cost nothing, work
today without any third party, and keep `/hu/` and the two withdrawn service URLs from
404ing.

## Deliberately left alone

- **`projects/magyar-dalszovegek/` and `aporia/magyar-dalszovegek-essze/`** are generated
  from `~/projects/music_networks`. Their over-long meta descriptions are **upstream fixes**;
  a hand edit here is lost on the next regen. Both are exempted in the linter with that reason.
- **The apex `/blog/` tree and the arkhe post** — deferred pending the new WordPress URL.
  `blog.crowintelligence.org` untouched.
- **Every `TODO-DOI`** — 23 markers across `llms.txt` and `llms-full.txt`, plus the essay,
  package and dataset schema. `grep -rn "TODO-DOI"`.
- **`foundingDate`**, Orsolya Putz's ORCID, the Wikidata URI, `isBasedOn` on `/analysis/` —
  omitted, not guessed.
- **Essay prose.** Not one word changed in any Aporia essay. The Epistemic Arcade fix is
  markup and script only.
- **CI-13, CI-15, CI-16, `CITATION.cff`** — deferred per the original brief.

## Two mistakes worth recording

**A `DOTALL` regex** meant for `projects/kmdb/index.html`'s meta description ran past a
self-closing tag and swallowed part of the head, including a `<script>` opening tag. The
linter caught it in the same run. Reverted, redone as a literal replacement; the committed
diff is one line.

**Merging a stacked PR deletes its base branch**, and GitHub then auto-closes the PR built on
it — permanently, since a closed PR cannot be retargeted. That is how #10 became #17.
Retarget downstream PRs to `master` *before* merging their base.

---

## Verification, on every PR

Dev and production builds clean · `scripts/lint_html.py` 0 errors, 0 stale exemptions ·
all JSON-LD parses with zero dangling `@id` references · `npm test` 20/20 ·
`pelican/prose.py` doctests pass · target pages confirmed to render prose, H1 and nav
**with JavaScript disabled**.
