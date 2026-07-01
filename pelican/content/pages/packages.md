Title: Open Source Packages
Slug: packages
Status: published
Summary: Open source Python tools for computational text analysis: chronowords for semantic shift detection, kenon for co-occurrence networks, keyflux for corpus keyness and allotaxonographs, lexograph for text visualisation, and the corvus cookiecutter template.
Og_image: /images/social-preview/packages.png

<div class="about-intro">

We build and maintain a suite of open source Python libraries and tools for
computational text analysis. The packages are designed as a coherent
ecosystem — each layer building on the one below.

</div>

## chronowords

<img src="/logos/brand/chronowords.svg" alt="chronowords logo" style="max-width: 300px; margin-bottom: 1rem;">

Temporal word embedding analysis. Detect how word meanings shift across
time in large text corpora using memory-efficient PPMI-based embeddings,
NMF topic modeling, and Procrustes alignment.

Originally developed to study gender bias in Hungarian online media —
the first version powered our 2019 analysis of how 102,240 news articles
represent women, men, and minorities in the semantic space
([read the analysis](https://www.nyest.hu/hirek/apanak-munkaja-van-anyanak-teste)).

- [PyPI](https://pypi.org/project/chronowords/)
- [GitHub](https://github.com/crow-intelligence/chronowords)
- [Docs](https://chronowords.readthedocs.io/en/latest/)

`pip install chronowords`

---

## kenon

<img src="/logos/brand/kenon.svg" alt="kenon logo" style="max-width: 300px; margin-bottom: 1rem;">

Semantic network construction from text corpora. Build and analyse
word association graphs, find paths between concepts, and compare
text-derived networks to human association norms (Nelson norms,
Small World of Words).

Named after the Greek *kenon* (κενόν) — the void that enables connection.

- [PyPI](https://pypi.org/project/kenon/)
- [GitHub](https://github.com/crow-intelligence/kenon)
- [Docs](https://kenon.readthedocs.io/en/latest/)

`pip install kenon`

---

## keyflux

<img src="/logos/brand/keyflux.svg" alt="keyflux logo" style="max-width: 300px; margin-bottom: 1rem;">

Corpus keyness, rank-turbulence divergence, and allotaxonographs — in pure
Python. Derive keywords and lockwords from a focus-versus-reference comparison
using proper corpus-linguistic measures (log-likelihood for significance, log
ratio for effect size), compare the ranked lists with rank-turbulence divergence,
and render the allotaxonograph — the rank-rank map plus the ranked list of which
exact words drove the shift.

It replaces the usual "Jaccard overlap on the top-N keywords" summary with a
transparent, pip-installable pipeline. Figures are matplotlib — no JavaScript
runtime.

- [PyPI](https://pypi.org/project/keyflux/)
- [GitHub](https://github.com/crow-intelligence/keyflux)
- [Docs](https://keyflux.readthedocs.io/)

`pip install keyflux`

---

## lexograph

<img src="/logos/brand/lexograph.svg" alt="lexograph logo" style="max-width: 300px; margin-bottom: 1rem;">

Spatialize linear text into pictures you can read. Through one
segment → layout → encode → render pipeline, lexograph turns a text into a
figure: punctuation spirals, 2-D and 3-D sentence walks, recurrence dotplots
that plot a text against itself, and concordance plots for a term's dispersion.

Every preset returns a matplotlib figure and never calls `show()`, so it renders
inline in Jupyter and saves cleanly. The visualisation member of the corpus-lx
family, alongside chronowords, kenon, and keyflux.

Named after the Greek *graphein* (γράφειν) — to write, to draw.

- [PyPI](https://pypi.org/project/lexograph/)
- [GitHub](https://github.com/crow-intelligence/lexograph)
- [Docs](https://lexograph.readthedocs.io/)

`pip install lexograph`

---

## corvus

<img src="/logos/brand/corvus.svg" alt="corvus logo" style="max-width: 300px; margin-bottom: 1rem;">

A cookiecutter template for data science and text analysis projects.
Pre-configured scaffold with uv, ruff, DVC, MLflow, Sphinx docs, and
structured directories for raw/processed data, models, notebooks, and
a Python package — eliminate manual setup and start analysing.

Originally developed as our internal project template for computational
linguistics and NLP research, now publicly available.

- [GitHub](https://github.com/crow-intelligence/corvus)

`uvx cookiecutter https://github.com/crow-intelligence/corvus.git`

---

*All packages are MIT licensed and open source.*

<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "chronowords",
    "description": "Detect semantic shifts over time in text corpora using PPMI-based word embeddings, NMF topic modeling, and Procrustes alignment.",
    "url": "https://pypi.org/project/chronowords/",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Python 3.10+",
    "license": "https://opensource.org/licenses/MIT",
    "author": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "kenon",
    "description": "Construct semantic and co-occurrence networks from text using corpus-internal statistics, spaCy tokenization, and network backbone extraction.",
    "url": "https://pypi.org/project/kenon/",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Python 3.11+",
    "license": "https://opensource.org/licenses/MIT",
    "author": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "keyflux",
    "description": "Corpus keyness, rank-turbulence divergence, and allotaxonographs — keywords and lockwords via log-likelihood and log ratio, in pure Python.",
    "url": "https://pypi.org/project/keyflux/",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Python 3.11+",
    "license": "https://opensource.org/licenses/MIT",
    "author": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "lexograph",
    "description": "Spatialize linear text into pictures you can read: punctuation spirals, sentence walks, recurrence dotplots, and concordances, rendered with matplotlib.",
    "url": "https://pypi.org/project/lexograph/",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Python 3.11+",
    "license": "https://opensource.org/licenses/MIT",
    "author": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org"
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "corvus",
    "description": "A cookiecutter template for data science and text analysis projects with uv, ruff, DVC, MLflow, and Sphinx docs.",
    "url": "https://github.com/crow-intelligence/corvus",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Python 3.10+",
    "license": "https://opensource.org/licenses/MIT",
    "author": {
      "@type": "Organization",
      "name": "Crow Intelligence",
      "url": "https://crowintelligence.org"
    }
  }
]
</script>
