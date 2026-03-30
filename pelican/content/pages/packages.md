Title: Open Source Packages
Slug: packages
Status: published

<div class="about-intro">

We build and maintain a suite of open source Python libraries for
computational text analysis. The packages are designed as a coherent
ecosystem — each layer building on the one below.

</div>

## chronowords

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

## lexograph *(coming soon)*

Computational text art and visualisation. Turtle graphics sentence
walks, punctuation spirals, rhythm punch cards, and concordance plots.
Depends on both chronowords and kenon.

Named after the Greek *graphein* (γράφειν) — to write, to draw.

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
  }
]
</script>
