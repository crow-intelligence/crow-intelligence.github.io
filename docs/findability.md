# Findability — what is left, and who does it

Written 2026-10-28, after the SEO pass (#9, #11, #12, #16, #17; see `CHANGES_SUMMARY.md`).

**The on-site technical SEO is done.** Canonicals, sitemaps with real `lastmod`, structured
data, `robots.txt` that names every AI crawler, `llms.txt` + `llms-full.txt`, IndexNow on every
deploy, no-JS-readable essays, and a linter that gates deploys. More on-site tweaking will move
little. **What's missing is off-site: identifiers, citations, and links from places that search
engines and AI models already trust** (Zenodo, GitHub, PyPI, Wikidata, Hugging Face, LinkedIn).

---

## Part 1 — Your todo list

These need your accounts, your judgement, or your name. Ordered by impact for the effort.

### A. Measure first (≈30 min)

- [x] **Bing Webmaster Tools** and **Google Search Console** are both set up (confirmed
      2026-10-28). Bing's index feeds ChatGPT search and Copilot. IndexNow pings Bing on every
      deploy.
- [ ] Check that both `sitemap.xml` and `sitemap-projects.xml` are submitted in **both**
      tools. The second holds the essays and projects, which is most of the site.
- [ ] Send me the **"why pages aren't indexed"** list from each tool (Search Console:
      *Pages*; Bing: *Search Console → Pages* or *Site Explorer*). The "Crawled – currently
      not indexed" and "Discovered – currently not indexed" entries are the useful ones.
- [ ] Send me the **top queries** from each tool's performance report for the last 3
      months, ideally as a CSV export. It shows what people actually search for when they
      find the site.
- [ ] **Look at AI referrals in Google Analytics** (`G-3S8BY8VY3G`, loaded by `consent.js`
      only after opt-in). In *Reports → Acquisition → Traffic acquisition*, filter the session
      source for `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`
      and `claude.ai`. Because GA only counts visitors who accept the banner, these numbers are
      a floor, not a total. Search Console and Bing Webmaster count everyone.

### B. DOIs — the `TODO-DOI` markers (≈2–3 h, mostly clicking)

There are 19 `TODO-DOI` markers in this repo, waiting for these steps.

- [ ] **Create a Zenodo account** and log in with ORCID (Zoltán: `0009-0009-6123-1703`).
- [ ] **Packages:** in Zenodo → *GitHub*, switch on `chronowords`, `kenon`, `keyflux`,
      `lexograph` and `saphes`. Each already publishes on a GitHub release, so the **next
      release of each mints a DOI** with no workflow changes. Do this *after* step C adds
      `CITATION.cff`, or Zenodo fills the record from bare GitHub metadata. Use the
      **concept DOI** (the version-independent one), not the per-release DOI.
- [ ] **Essays:** upload each of the five Aporia essays to Zenodo as a *Publication*: a PDF
      snapshot plus the canonical URL as a related identifier. This gives each essay a DOI
      and a record that Google Scholar, OpenAIRE and DataCite all index. The essays live in
      their visualisations, so the PDF is a citable stub that points home, not a replacement.
      *Claude Cowork could do the uploads in a browser once you're logged in. You'd still
      review each record before pressing Publish, because publishing is permanent.*
- [ ] **Send me the DOIs.** I'll replace the markers in `llms.txt`, `llms-full.txt` and the
      JSON-LD, and add the citation tags from Part 2.

### C. Work in the package repos (each needs a session *in that repo*; I don't write outside this one)

- [ ] Add `CITATION.cff` to all five libraries and to the `corvus` template, so new projects
      get one by default. Include both authors with ORCIDs once you have Orsolya's (below).
- [ ] `chronowords`: set the PyPI `Homepage` to `https://crowintelligence.org/`. It's the
      only library that points it at GitHub.
- [ ] `music_networks`: its README links the old blog URL. Point it at
      `/aporia/magyar-dalszovegek-essze/` and add a `Homepage`.
- [ ] `corvus` README: add a link to the site. It has none.
- [ ] After the DOIs exist: add a DOI badge and a "How to cite" section to each README.
- [ ] Author names are inconsistent: "Zoltán Varjú" in `music_networks`, "Zoltan Varju"
      elsewhere. Pick one for citation metadata. Scholar and ORCID matching work better with
      one form.

### D. Identity (≈1 h)

- [ ] **Orsolya's ORCID**: ask her whether she has one. It's currently left out of the schema
      on purpose rather than guessed.
- [ ] **GitHub org profile**: create the repo `crow-intelligence/.github` with
      `profile/README.md`: one paragraph, links to the site, the essays and the packages.
      The org page is the most-visited landing spot for people who come via a package.
- [ ] **Wikidata**: create items for Crow Intelligence, both founders, and the packages,
      linking ORCID, GitHub, PyPI and the website. Knowledge-graph entries are how search
      engines and LLMs disambiguate an entity. Wikidata's notability bar is far lower than
      Wikipedia's, but it isn't zero: each item needs a serious public source. Your call
      whether that's ready yet.

### E. Bigger bets (weeks, optional)

- [ ] **JOSS** (Journal of Open Source Software): a peer-reviewed short paper per package (or
      one for the stack). It gives a citable DOI that Google Scholar indexes, and it's the
      standard route for research software. I can draft `paper.md` in the package repo.
      *pyOpenSci* review first is an option; it can fast-track to JOSS.
- [ ] **Hugging Face datasets** for the published corpora (e.g. the Wittgenstein dataset
      already has `Dataset` schema), each linking back to the essay. **Check each source's
      licence first.** The Miller Center speeches especially have their own terms.
- [ ] **Directories and lists** where people look for this kind of tool: TAPoR (DH tools),
      awesome-nlp / awesome-digital-humanities style lists, Hungarian NLP resource lists.
      One PR each, done by hand.
- [ ] **LinkedIn / Substack**: when you write about a piece of work, link to its essay page.
      Your LinkedIn articles reach more people than the site does, and those links are the
      kind of off-site mention AI search engines weigh.

---

## Part 2 — What I can do in this repo (on a branch, via PR, with your OK)

| # | Change | Why | Needs you? |
|---|---|---|---|
| 1 | ✅ *Done in this PR.* **Highwire `citation_*` meta tags** on the five essays (`citation_title`, `citation_author`, `citation_publication_date`, `citation_doi` later) | The format Google Scholar reads. Today the essays have `ScholarlyArticle` JSON-LD but zero `citation_*` tags. Whether Scholar accepts essays (vs papers) isn't guaranteed; the Zenodo records are the safer route into Scholar. | No. Metadata only, no prose. `citation_doi` gets added with the DOIs. |
| 2 | **A visible "How to cite" line** at the end of each essay (author, title, year, URL, DOI when available) | Makes the essays citable by people *and* gives AI models a clean attribution string. | **Yes.** It's visible on essay pages. Not a CTA and not prose, but you decide. |
| 3 | **Sharper homepage meta description.** Currently: "Independent research at the intersection of cognitive linguistics, NLP, and data analysis." | It names no subject a person would search for. Something that names the essays and what they study would match real queries. | **Yes.** It's copy; I'll propose wording. |
| 4 | ✅ *Done in this PR.* **Organization `sameAs` tidy**: it lists Zoltán's personal Bluesky and the Substack as the *lab's* profiles | Mixing person and organisation confuses entity matching. Both were already on Zoltán's `Person` node, so they're simply removed from the organisation. | Done. |
| 5 | ✅ *Done in this PR.* `knowsAbout: "AI technical due diligence"` on Zoltán's `Person` node | Leftover from the withdrawn service. Also removed from the organisation's `knowsAbout`, which is on every page. | Done. |
| 6 | `knowsAbout: "EU AI Act compliance"` on the organisation | Nothing on the site mentions the AI Act, so no page backs up this claim. Probably another leftover. | **Yes.** It's a claim about the lab's expertise. |
| 7 | **Wikidata / DOI `sameAs`** links in the JSON-LD | Ties the site to the identifiers from B and D. | After you've created them. |

**Deliberately not recommended:**

- **`dateModified` in the essays' JSON-LD.** The essays are static HTML, so the date would be
  hand-maintained and go stale. A wrong date is worse than none. Both sitemaps already give
  every essay and page its last-commit date, which is what crawlers read for freshness.
- **More `llms.txt` work.** Ours is good and costs nothing to keep, but 2026 evidence says AI
  crawlers rarely request it, and Google states it isn't needed. Further effort goes to Part 1.
- **Rewriting essay prose for "AI-friendliness"** (answer-first passages, more quoted
  statistics). Research suggests concrete statistics and quotations do raise citation rates,
  and the essays already have them. The essays are off-limits, and the `llm_summary` fields
  already do the job in `llms.txt`.
- **Keyword chasing on the service page.** Tried in #13. "Language insight" is plain and
  searchable enough.

---

## Sources

- Google Scholar inclusion guidelines — https://scholar.google.com/intl/en/scholar/inclusion.html
- Zenodo ↔ GitHub ↔ CITATION.cff — https://www.casrai.org/news/datacite-github-zenodo-software-citation-stack ; https://inbo.r-universe.dev/checklist/doc/zenodo.html
- llms.txt usage evidence — https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/ ; https://commoncrawl.org/blog/a-content-analysis-of-llms-txt-files-from-the-july-2026-crawl-archive
- Generative engine optimisation (vendor syntheses of the Princeton GEO paper; treat figures as indicative) — https://aisearch.similarweb.com/blog/what-is-geo/ ; https://www.frase.io/blog/how-to-get-cited-by-ai-search-engines-the-complete-geo-playbook
