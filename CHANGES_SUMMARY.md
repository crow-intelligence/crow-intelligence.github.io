# SEO / structured-data / crawlability pass — summary

Five stacked pull requests, opened and **not merged**. Each is based on the one
before it, so review and merge in order: **#9 → #10 → #11 → #12 → #13**.

Nothing here invents a fact. No DOI, ORCID, founding date or publication date
was fabricated; where a value was unknown the field is absent and listed below.

---

## The PRs

| # | Branch | Covers | Needs a human read? |
|---|---|---|---|
| [#9](https://github.com/crow-intelligence/crow-intelligence.github.io/pull/9) | `seo/pr2-metadata-hygiene` | CI-08 language, `/hu/` retirement, CI-05 sitemaps, CI-06 canonicals | Normal review |
| [#10](https://github.com/crow-intelligence/crow-intelligence.github.io/pull/10) | `seo/pr3-structured-data` | CI-07 structured data | Normal review |
| [#11](https://github.com/crow-intelligence/crow-intelligence.github.io/pull/11) | `seo/pr4-machine-surfaces` | CI-10 `llms.txt`, `llms-full.txt`, CI-19 `robots.txt` + IndexNow, redirect map | Normal review |
| [#12](https://github.com/crow-intelligence/crow-intelligence.github.io/pull/12) | `seo/pr5-crawlable-content` | CI-11, CI-12, and the CI linter | **Yes** — prose slots left for you |
| [#13](https://github.com/crow-intelligence/crow-intelligence.github.io/pull/13) | `seo/pr6-services-copy` | CI-14, cross-cutting metadata | **Yes** — copy written for your service pages |

---

## Six audit premises that were wrong

The audit read a markdown conversion rather than raw HTML. Verified against
source:

1. **`<html lang>` was not missing.** `base.html:2` has always emitted it, and
   every essay, dashboard and featured microsite carries it. Only the ~3,000
   auto-generated Vega files, which are in no sitemap, lack it.
2. **Structured data existed in 16 files**, including a full
   `ResearchOrganization` with both founders. CI-07 was correct-and-extend, not
   inject-from-scratch.
3. **The three "zombie WordPress pages" are not in this repository.**
   `grep -ri "wp-content\|wp-includes\|jetpack\|society6\|wp-json"` returns
   nothing, and no `20xx/`, `category/`, `tag/`, `author/`, `portfolio-*`,
   `privacy-policy/`, `research/` or `au/` directory exists. **CI-02 had nothing
   to delete.** If those URLs really return 200, they are served from somewhere
   other than this repo — see "Needs a human decision" below.
4. **Sitemaps and `llms.txt` were already generated at build time**, not
   hand-written.
5. **No alt text was missing**, and `/packages.html` was not missing the Terms
   footer link.
6. **`/aporia/epistemic-arcade/` had 1,038 words and one H1**, not "~0 words, no
   H1". They were inside a `hidden` container revealed by JavaScript — which is
   the real bug, and a worse one.

## Findings the audit missed

- **The seven Nagel dashboards ship twice** — bare under
  `/aporia/nagel-essay/dashboards/` and chromed under `/dashboard/`. Both
  published, neither canonical: duplicate content on the third most-visible page
  on the site.
- **The Epistemic Arcade was invisible without JavaScript**, and stayed
  permanently hidden behind a full-screen error if its telemetry fetch failed.
- **`/services/ai-adoption-audit.html` had no `Og_image`**, inheriting an essay
  illustration as its social preview.
- **`projects/embedding_graph/viz.html` had no `<!DOCTYPE>` and no `<html>`
  element** — the file began at `<head>`.
- **`BACKLOG.md` was stale** about `/web/` not existing.

---

## Decisions that change the numbers

Each was a choice, not a default. Reverse any of them in one place.

| Decision | Where | Why |
|---|---|---|
| `og:locale` = **`en_GB`** sitewide, `hu_HU` on Hungarian pages | `OG_LOCALE` in `pelicanconf.py` | The copy is British throughout ("visualisation", "analyse") |
| **`<priority>` dropped** from both sitemaps | sitemap templates | Uniform priority carries the same information as none; Google ignores it either way |
| `<lastmod>` = **last commit date**, not file mtime | `_git_lastmod` in `pelicanconf.py`; `fetch-depth: 0` in `deploy.yml` | A CI checkout rewrites every mtime to the build time, stamping the whole sitemap with one meaningless date |
| Sitemap exclusions **derived, not listed** | `content/sitemap.xml` | A page marked `noindex` or carrying `Redirect:` drops out by itself |
| `/aporia/nagel-essay/dashboards/` wins the canonical | dashboards + `/dashboard/` copies | It earns the impressions and sits under the essay that explains it |
| Essay `datePublished` **is** emitted, from `APORIA` | `pelicanconf.py` | Your own authored dates, already published as `pubDate` in `feed.xml`. Not derived from git or mtimes |
| Essay `author` stays the **Organization** | essay JSON-LD | Which founder wrote which essay is not established |
| **Minimum 250 words** of no-JS prose for any sitemap page | `MIN_WORDS` in `scripts/lint_html.py` | Threshold, exposed and adjustable; 23 exemptions each carry a printed reason |
| Meta descriptions capped at **160 characters** | `scripts/lint_html.py` | SERP truncation point |
| `/felsozsolca/` **held out of `llms-full.txt`** | `llms_full: False` in `PROJECTS` | See below |
| PyPI versions **not fetched at build time** | — | A network call on the deploy path means a PyPI outage fails a build. `PACKAGES` stays the source; drift belongs in the linter |

---

## Needs a human decision

1. **Read the service copy in #13.** It is your sales surface, written in your
   voice as best I can read it.
2. **The prose slots in #12.** Seven Nagel dashboards, `/chokepoints/`,
   `/semantic_explorer/app/` and `/analysis/` each carry an empty section with a
   written brief. Several ask for facts that **exist nowhere in this repo** —
   notably the corpus source for `/analysis/`, which is why its `Dataset` schema
   has no `isBasedOn`, and the GDELT date range and findings for
   `/chokepoints/`.
3. **Essay bylines.** No Aporia essay has one, including four of 3,000–6,500
   words. Adding one means naming an author; that is yours to say.
4. **Are the three WordPress URLs actually live?** They are not in this repo and
   cannot be served by this deploy. If they return 200, another origin is
   answering for the apex — and a Cloudflare redirect rule cannot override that.
5. **`/felsozsolca/`.** Still in the sitemap, per your deferral. It is held out
   of `llms-full.txt` and exempted in the linter, because publishing the full
   prose of a page that calls itself internal working material would settle the
   question by default.
6. **Social images** for `/portfolio.html`, `/privacy.html`, `/terms.html` — no
   dedicated artwork exists and making some is a design decision.

## Deliberately left alone

- **`projects/magyar-dalszovegek/` and `aporia/magyar-dalszovegek-essze/`** are
  generated from `~/projects/music_networks`. Their over-long meta descriptions
  and the `og:description` divergence are **upstream fixes**; a hand edit here
  is lost on the next regen. Both are exempted in the linter with that reason.
- **The apex `/blog/` tree and the arkhe post** — deferred pending the new
  WordPress URL. `blog.crowintelligence.org` untouched.
- **`/felsozsolca/`**, beyond the two exemptions above.
- **Every `TODO-DOI`** — 23 markers across `llms.txt` and `llms-full.txt`, plus
  the essay, package and dataset schema. `grep -rn "TODO-DOI"`.
- **`foundingDate`**, Orsolya Putz's ORCID, the Wikidata URI, `isBasedOn` and
  `isAccessibleForFree` on `/analysis/` — omitted, not guessed.
- **Essay prose.** Not one word changed in any Aporia essay. The Epistemic
  Arcade fix is markup and script only.
- **CI-13, CI-15, CI-16, `CITATION.cff`** — deferred per the brief.

## One mistake worth recording

A first attempt at shortening `projects/kmdb/index.html`'s meta description used
a `DOTALL` regex that ran past a self-closing tag and swallowed part of the
head, including a `<script>` opening tag. The linter caught it in the same run.
Reverted and redone as a literal string replacement; the committed diff is one
line.

---

## Verification, on every PR

- Dev **and** production builds clean; production-shaped build linted too.
- `scripts/lint_html.py`: **39 pages, 0 errors, 0 stale exemptions.**
- All JSON-LD parses (57 blocks in the build, 89 including the source tree);
  **zero dangling `@id` references** in production.
- `npm test` 20/20; `pelican/prose.py` doctests pass.
- Target pages confirmed to render prose, H1 and nav **with JavaScript
  disabled**.
