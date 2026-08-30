Title: Commissioned Analysis
Slug: commissioned-analysis
URL: services/commissioned-analysis.html
Save_as: services/commissioned-analysis.html
Status: published
Summary: Commissioned data analysis, visualisation, and visual storytelling — built on Crow Intelligence's own open-source tools.
Og_image: /images/social-preview/commissioned-analysis.png

We take on analysis, visualisation, and visual-storytelling commissions for
organisations with a dataset, a finding, or an argument that deserves to be
seen rather than summarised.

The [Aporia](/aporia/) visual essays and the interactive [projects](/projects.html)
on this site are made with our own open-source tools. The same craft is
available to you.

## What a commission looks like

A commission might be a single interactive chart, a scrollable data essay,
or a standalone microsite. We handle the work end to end:

- **The analysis.** Cleaning, modelling, and interrogating the data —
  computational text analysis, semantic networks, temporal change,
  personality and rhetoric, geographic and network structure.
- **The narrative.** Finding the argument the data can actually support,
  and the honest shape of the uncertainty around it.
- **The build.** Designing and engineering the final artefact, from a
  publication-ready figure to a fully interactive web piece.

## How we work

We are candid early about what the data can and cannot show — before the
design work begins, not after. We scope each commission to a clear
deliverable and a clear question, and we build on tooling we maintain
ourselves, so the methods behind a piece are transparent and reproducible.

Our open-source libraries — [chronowords](https://github.com/crow-intelligence/chronowords)
for semantic shift over time and [kenon](https://github.com/crow-intelligence/kenon)
for co-occurrence networks — often do the analytical heavy lifting, which
means the work is auditable and the results are yours.

## What the tooling actually does

The libraries are not a portfolio flourish; they are what the work runs on,
and each one exists because an analysis needed it.

- **[chronowords](https://github.com/crow-intelligence/chronowords)** measures
  how a word's meaning shifts over time — memory-efficient embeddings aligned
  across periods, so *freedom* in 1800 and *freedom* in 2020 can be compared
  rather than merely counted.
- **[kenon](https://github.com/crow-intelligence/kenon)** builds co-occurrence
  networks from corpus-internal statistics alone: no neural models, no external
  training data, and therefore no borrowed assumptions about what words mean.
- **[keyflux](https://github.com/crow-intelligence/keyflux)** does keyness
  properly — significance and effect size kept apart, rank-turbulence
  divergence between two corpora, and allotaxonograph plots.
- **[saphes](https://github.com/crow-intelligence/saphes)** measures readability
  and lexical diversity while exposing the parameters most implementations
  hardcode, and returns the counts behind every score.
- **[lexograph](https://github.com/crow-intelligence/lexograph)** turns linear
  text into something you can look at: spirals, sentence walks, recurrence
  plots.

All are MIT-licensed and on the [packages page](/packages.html). Nothing in a
commission depends on a tool you cannot inspect.

## What it looks like finished

The published work is the specification. [The Nagel Index](/aporia/nagel-essay/)
scores public speeches against private letters across seven American leaders and
ships seven interactive dashboards alongside the essay. [The Wrath and the
Journey](/aporia/homer/) reads the *Iliad* and the *Odyssey* as corpora, maps
both, and finds that 21.3% of the *Odyssey* is open water. [Corruption Press
Networks](/kmdb/) works through roughly 64,800 Hungarian news articles to build
the co-occurrence network of the actors named in them.

Each states its method, shows its data, and can be checked. A commission is the
same standard applied to your material.

## Who it is for

Newsrooms, research institutions, foundations, and companies sitting on a
dataset or a result that matters and is not yet legible to the people who
need to act on it.

If you are diagnosing an AI tool your own team has already built, that is the
[AI Adoption Audit](/services/ai-adoption-audit.html); if you are assessing
someone else's system as an investor, that is
[AI & NLP Due Diligence](/services/ai-due-diligence.html).

## Begin with a conversation

Tell us what you have in mind — or send us a dataset and a question. A short
call is the quickest way to tell whether we can help.

<p><a href="https://cal.com/zoltan-varju-h4s0aq/15min" target="_blank" rel="noopener" class="btn btn-accent">Book a 15-min call</a> <a href="/contact.html" class="btn btn-secondary">Send a message</a></p>

Or write to [hello@crowintelligence.org](mailto:hello@crowintelligence.org).

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Commissioned Analysis",
  "serviceType": "Data analysis, visualisation, and visual storytelling",
  "description": "Commissioned data analysis, visualisation, and visual storytelling — from a single interactive chart to a scrollable data essay or standalone microsite, built on Crow Intelligence's own open-source tools.",
  "url": "https://crowintelligence.org/services/commissioned-analysis.html",
  "provider": { "@id": "https://crowintelligence.org/#organization" },
  "areaServed": [{ "@type": "Place", "name": "European Union" }],
  "audience": {
    "@type": "BusinessAudience",
    "audienceType": "Newsrooms, research institutions, foundations, and companies"
  }
}
</script>
