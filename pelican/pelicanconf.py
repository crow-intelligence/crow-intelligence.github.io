import os
import subprocess
import sys
from datetime import date, datetime, timezone
from email.utils import format_datetime

# Pelican loads this file by path, so its directory is not necessarily on
# sys.path; publishconf.py only adds the current directory. Add it explicitly so
# `prose` imports whether the build runs from pelican/ or from the repo root.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from prose import collect  # noqa: E402

AUTHOR = 'Crow Intelligence'
SITENAME = 'Crow Intelligence'
SITEURL = ''
SITESUBTITLE = 'AI Consultancy & Strategy'


def _rfc822(d):
    """Format a date as RFC-822, which RSS 2.0 requires for <pubDate>.

    Done here rather than with strftime('%a, %d %b …') in the template because
    strftime's day and month names follow the locale; email.utils always emits
    the English forms the spec requires.
    """
    return format_datetime(datetime(d.year, d.month, d.day, tzinfo=timezone.utc))


def _git_lastmod(source_path):
    """Return the ISO date of the last commit touching `source_path`, or ''.

    Used for <lastmod> in the sitemaps. A file's mtime is useless here: a CI
    checkout rewrites every mtime to the moment of the build, which would stamp
    the whole sitemap with one date and tell search engines nothing. The commit
    date survives the checkout.

    Returns the empty string — so the template omits <lastmod> entirely — when
    the file is untracked, or when the checkout is shallow enough that git has
    no commit for it. An absent lastmod is honest; a wrong one gets cached.
    """
    if not source_path:
        return ''
    try:
        out = subprocess.run(
            ['git', 'log', '-1', '--format=%cs', '--', str(source_path)],
            capture_output=True, text=True, timeout=10, check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return ''
    return out.stdout.strip() if out.returncode == 0 else ''


JINJA_FILTERS = {'rfc822': _rfc822, 'git_lastmod': _git_lastmod}

PATH = 'content'
OUTPUT_PATH = '../output'

TIMEZONE = 'Europe/Budapest'
DEFAULT_LANG = 'en'

# Open Graph locale. British spellings throughout the copy ('visualisation',
# 'analyse'), so en_GB rather than en_US. Hungarian pages override in base.html.
OG_LOCALE = 'en_GB'

# Theme
THEME = 'themes/crow-dark'

# Markdown extensions
MARKDOWN = {
    'extension_configs': {
        'markdown.extensions.meta': {},
        'markdown.extensions.extra': {},
        'markdown.extensions.md_in_html': {},
    },
    'output_format': 'html5',
}

# URLs
ARTICLE_URL = 'blog/{slug}.html'
ARTICLE_SAVE_AS = 'blog/{slug}.html'
PAGE_URL = '{slug}.html'
PAGE_SAVE_AS = '{slug}.html'
# Blog listing goes to /blog/
INDEX_SAVE_AS = 'blog/index.html'

# Only use index (for blog listing) and archives
DIRECT_TEMPLATES = ['index']

# llms.txt (llmstxt.org): a curated Markdown map of the site for LLMs. Rendered
# from content/llms.txt with the full settings context, so it is generated from
# the same APORIA / PROJECTS / PACKAGES / SERVICES lists the site renders and
# cannot drift out of date.
#
# sitemap-projects.xml covers what the sitemap plugin cannot see: the Aporia
# essays and the dataviz microsites are hand-authored HTML outside the Pelican
# pipeline, so they never appear in the plugin's sitemap.xml. Both files are
# listed in robots.txt.
# feed.xml is an RSS 2.0 feed of the essays and projects. Pelican's own feed
# generator only carries *articles*, and this site has one; the essays and
# dashboards are pages and hand-authored HTML it cannot see.
TEMPLATE_PAGES = {
    'llms.txt': 'llms.txt',
    'llms-full.txt': 'llms-full.txt',
    'sitemap.xml': 'sitemap.xml',
    'sitemap-projects.xml': 'sitemap-projects.xml',
    'feed.xml': 'feed.xml',
}

# Static paths - serve existing project folders through
STATIC_PATHS = ['images']

# Navigation
DISPLAY_PAGES_ON_MENU = False
DISPLAY_CATEGORIES_ON_MENU = False
MENUITEMS = [
    ('Portfolio', '/portfolio.html'),
    ('Services', '/services.html'),
    ('About', '/about.html'),
    ('Blog', 'https://blog.crowintelligence.org/'),
    ('Contact', '/contact.html'),
]

# Feed
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Pagination
DEFAULT_PAGINATION = 10

# Custom variables
EMAIL = 'hello@crowintelligence.org'
LOGO_PATH = 'logos/brand/crow-intelligence.svg'

# Team data
TEAM = [
    {
        'name': 'Zoltán Varjú',
        'role': 'Founder & AI Advisor',
        'bio': 'Two decades at the intersection of language, AI, and data. Technical due diligence and AI advisory for funds and startups; co-founded and exited Complytron (acquired by SEON, 2023).',
        'photo': 'portraits/zoli.jpeg',
        'linkedin': 'https://www.linkedin.com/in/zoltanvarju/',
    },
    {
        'name': 'Orsolya Putz, PhD',
        'role': 'Partner & Cognitive Scientist',
        'bio': 'PhD in Cognitive Linguistics. Assistant Professor at the Budapest University of Technology and Economics (BME).',
        'photo': 'portraits/orsi.jpeg',
        'linkedin': 'https://www.linkedin.com/in/orsolya-putz-phd-5242a5157/',
    },
]

# Featured projects
PROJECTS = [
    {
        'title': 'The Wealth of Nations — 250th Anniversary Digital Edition',
        'description': "An interactive exploration of Adam Smith's 1776 masterwork. Topic modeling, named entity recognition, rhetorical metaphor analysis, and full-text search across all five books.",
        'url': '/site/',
        'date': date(2026, 3, 27),
        'image': '/site/img/punctuation_spiral.png',
        'label': 'NLP & Digital Humanities',
        'featured': True,
    },
    {
        'title': 'The Nagel Index — Public vs. Private Personality',
        'description': "Big Five personality analysis of political leaders, measuring the gap between their public speeches and private correspondence. Inspired by Thomas Nagel's essay on ruthlessness in public life.",
        'url': '/aporia/nagel-essay/',
        'date': date(2026, 3, 31),
        'image': '/dashboard_portraits/lincoln_portrait.png',
        'label': 'Personality Analytics',
        'featured': True,
    },
    {
        'title': 'Market Metaphors — Kindleberger Phases × Narrative Economics',
        'description': 'Tracing the evolution of metaphorical language in 158,666 financial news headlines (2009–2020) across five crisis events, mapping metaphor domains to the Minsky–Kindleberger panic cycle.',
        'url': '/web/',
        'date': date(2026, 3, 27),
        'image': '/web/preview.svg',
        'label': 'Computational Rhetoric',
        'featured': True,
    },
    {
        'title': 'Around the World in 80 Days: Route Map and Chapter Summaries',
        'description': "Jules Verne's 1872 novel read as a dataset: Phileas "
                       "Fogg's eighty-day itinerary drawn on an orthographic "
                       "globe, all 37 chapters summarised, every one of the 342 "
                       "place names the book uses resolved against Wikidata or "
                       "held back with a stated reason, and the political "
                       "borders of 1880 laid over today's.",
        'url': '/verne/',
        'date': date(2026, 8, 27),
        'image': '/verne/preview.svg',
        'label': 'NLP & Digital Humanities',
        'featured': False,
    },
    {
        'title': 'The Narrative Engine — FOMC Speech Analysis',
        'description': 'A pilot dashboard comparing how FOMC governors talk about the economy — topic, narrative type, stance, and time-orientation across four speeches, with a drill-down inspector for individual expressions.',
        'url': '/fomc-dashboard/',
        'date': date(2026, 6, 19),
        'image': '/fomc-dashboard/preview.png',
        'label': 'Narrative Analytics',
        'featured': False,
    },
    {
        'title': 'Chokepoint News-Risk Dashboard',
        'description': "Topic-modelled daily geopolitical risk across the world's maritime chokepoints — Suez, the Red Sea, Hormuz, Panama, the Bosphorus and the Danish straits — tracking how risk is framed in the news as it unfolds.",
        'url': '/chokepoints/',
        'date': date(2026, 6, 24),
        'image': '/chokepoints/preview.svg',
        'label': 'News-Risk Analytics',
        'featured': False,
    },
    {
        'title': 'Corruption Press Networks — The K-Monitor Archive',
        'description': "A data-driven analysis of K-Monitor's Hungarian corruption news archive: the most frequent and characteristic words, vocabulary richness, the co-occurrence network of the actors — people and institutions — and the types of corruption, broken down by parliamentary cycle.",
        'url': '/kmdb/',
        'date': date(2026, 7, 22),
        'image': '/kmdb/preview.svg',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
        'featured': False,
    },
    {
        'title': 'Felsőzsolca — A Town in Data',
        'description': "A data portrait of a Hungarian town: warming stripes of annual mean temperature, housing and population, incomes and local economy, what changed between two censuses, and year-by-year Landsat imagery of the town and its industrial zone.",
        'url': '/felsozsolca/',
        'date': date(2026, 7, 27),
        'image': '/felsozsolca/preview.svg',
        'label': 'Geospatial Analytics',
        'lang': 'In Hungarian',
        'wip': True,
        'featured': False,
        # Held out of llms-full.txt: the page describes itself as internal
        # working material, and its inclusion in the sitemap is still an
        # open question. Publishing its full prose to a machine-readable
        # surface would settle that question by default.
        'llms_full': False,
    },
    {
        'title': 'Semantic Shifts in Presidential Rhetoric',
        'description': 'Tracking how the meaning of political concepts like freedom, democracy, and war evolves across 250 years of American presidential discourse. Built with our open-source chronowords package — PPMI embeddings, Procrustes alignment, and NMF topic modeling.',
        'url': '/analysis/',
        'date': date(2026, 3, 27),
        'image': '/analysis/preview.svg',
        'label': 'Computational Semantics',
        'featured': False,
    },
    {
        'title': 'Semantic Explorer — Interactive Co-occurrence Networks',
        'description': 'Explore the semantic structure of classic texts through interactive ego networks. Type a seed word, click to expand, and trace how meaning propagates through Tolstoy, Plato, Adam Smith, Darwin, and more. Built with our open-source kenon package.',
        'url': '/semantic_explorer/app/',
        'date': date(2026, 3, 27),
        'image': '/semantic_explorer/preview.svg',
        'label': 'Semantic Networks',
        'featured': False,
    },
    {
        'title': 'The Tractatus as a Flat Spiral',
        'description': "The complete text of Wittgenstein's Tractatus walked out as a flat, right-angle spiral — one continuous path through its numbered propositions, set in handwriting and coloured by topical cluster. Companion visualisation to the Aporia essay.",
        'url': '/aporia/wittgenstein/viz/handwriting.html',
        'date': date(2026, 5, 19),
        'image': '/aporia/wittgenstein/imgs/handwriting_2d.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'The Tractatus as a Helix',
        'description': "The same spiral lifted into three dimensions: each proposition set a constant step above the last, so the Tractatus climbs as it turns. Rendered in handwriting and navigable sentence by sentence.",
        'url': '/aporia/wittgenstein/viz/handwriting_3d.html',
        'date': date(2026, 5, 19),
        'image': '/aporia/wittgenstein/imgs/social-preview.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'The Punctuation Spiral',
        'description': "The Tractatus stripped to its punctuation alone — every mark in sequence, spiralled outward. What remains when the words are removed: the rhythm and breath of the argument.",
        'url': '/aporia/wittgenstein/punctuation_spiral.html',
        'date': date(2026, 6, 1),
        'image': '/aporia/wittgenstein/imgs/punctuation_spiral.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'Hungarian Pop Lyrics — A Diachronic Analysis',
        'description': "Six decades of Hungarian popular-music lyrics: distinctive words, shifting themes, semantic drift and genre from the 1960s to today.",
        'url': '/magyar-dalszovegek/#temak',
        'date': date(2026, 6, 16),
        'image': '/magyar-dalszovegek/assets/og.png',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
        'featured': False,
    },
]

# Aporia — visual essays.
# `llm_summary` is used only by llms.txt: a denser line stating method and
# finding, for machine readers that never see the essay's visuals. Optional —
# llms.txt falls back to `description` when it is absent.
APORIA = [
    {
        'title': 'The Wrath and the Journey',
        'description': 'A computational reading of the Iliad and the Odyssey: what each poem hoards, who speaks to whom, and where the map runs out.',
        'llm_summary': 'Compares the Iliad and the Odyssey as corpora. Extracts proper nouns and themes, '
                       'builds a character co-occurrence network (the "small world" of Greek heroes), and '
                       'maps the geography of each poem — finding that 21.3% of the Odyssey is open water, '
                       'and reading the Catalogue of Ships against the wanderings.',
        'url': '/aporia/homer/',
        'date': date(2026, 7, 24),
        'image': '/aporia/homer/og.png',
        'label': 'Computational Classics',
    },
    {
        'title': 'The great modern crimes are public crimes',
        'description': 'Big Five personality analysis of seven American leaders, public speeches vs. private writings.',
        'llm_summary': 'Measures the gap between public and private personality in American leaders by '
                       'scoring Big Five traits on public speeches versus private letters and diaries. '
                       'Lincoln reads as the same man in both registers; Nixon does not. Takes its title '
                       "and its question from Thomas Nagel's essay on ruthlessness in public life.",
        'url': '/aporia/nagel-essay/',
        'date': date(2026, 3, 31),
        'image': '/aporia/nagel-essay/imgs/social-preview.png',
        'label': 'Computational Psycholinguistics',
    },
    {
        'title': 'Whereof one cannot speak, thereof one must be silent',
        'description': "A visual reading of Wittgenstein's Tractatus as a handwritten spiral.",
        'llm_summary': "Reads Wittgenstein's Tractatus as a shape: the whole text walked out as one "
                       'continuous right-angle spiral through its numbered propositions, set in '
                       'handwriting and coloured by topical cluster. Companion visualisations lift the '
                       'spiral into 3-D and strip the text to its punctuation alone.',
        'url': '/aporia/wittgenstein/',
        'date': date(2026, 5, 19),
        'image': '/aporia/wittgenstein/imgs/social-preview.png',
        'label': 'Computational Philosophy',
    },
    {
        'title': 'Where does the mind end and the world begin?',
        'description': "Two reinforcement-learning agents testing Clark & Chalmers' extended-mind hypothesis.",
        'llm_summary': "An empirical test of Clark & Chalmers' extended-mind thesis. Two reinforcement-"
                       'learning agents (PPO) learn Tetris under identical architectures but opposite '
                       'reward functions — one charged for every keystroke, one free to rotate pieces on '
                       'screen rather than in its head. Their strategies diverge as the epistemic actions '
                       'are priced in or out.',
        'url': '/aporia/epistemic-arcade/',
        'date': date(2026, 5, 21),
        'image': '/aporia/epistemic-arcade/imgs/social-preview.png',
        'label': 'Philosophy of Mind',
    },
    {
        'title': 'Nekem írod a dalt',
        'description': "A scrollable visual essay on six decades of Hungarian popular song (1950–2026): themes, words, emotions, rhymes and word-networks, decade by decade. In Hungarian.",
        'llm_summary': 'Traces seven words — szerelem (love), lány (girl), csaj (chick), pénz (money), '
                       'éjszaka (night), szabadság (freedom), élet (life) — through seventy years of '
                       'Hungarian popular song, quoting real lyrics decade by decade and tracking how '
                       'each word shifts meaning and company. Written in Hungarian.',
        'url': '/aporia/magyar-dalszovegek-essze/',
        'date': date(2026, 7, 28),
        'image': '/aporia/magyar-dalszovegek-essze/assets/og.png',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
    },
]

# The Nagel Index dashboards — one interactive dashboard per public figure,
# living under the essay that explains them (/aporia/nagel-essay/dashboards/).
# Declared here so the sitemap, the projects grid and the per-page breadcrumbs
# all read the same list. `slug` is the file stem; `lastmod` tracks the parent
# essay's date, since the dashboards ship with it.
NAGEL_DASHBOARDS = [
    {'slug': 'washington', 'figure': 'George Washington'},
    {'slug': 'lincoln', 'figure': 'Abraham Lincoln'},
    {'slug': 'jefferson', 'figure': 'Thomas Jefferson'},
    {'slug': 'nixon', 'figure': 'Richard Nixon'},
    {'slug': 'bush41', 'figure': 'George H. W. Bush'},
    {'slug': 'bush43', 'figure': 'George W. Bush'},
    {'slug': 'kissinger', 'figure': 'Henry Kissinger'},
]
for _d in NAGEL_DASHBOARDS:
    _d['url'] = f"/aporia/nagel-essay/dashboards/{_d['slug']}_dashboard.html"
    _d['image'] = f"/dashboard_portraits/{_d['slug']}_portrait.png"
    _d['title'] = f"The Nagel Index — {_d['figure']}"
    _d['date'] = date(2026, 3, 31)

# Full text for llms-full.txt. The essays and microsites are hand-authored HTML
# outside the content tree, so their prose is read off disk here rather than in
# the template. `_REPO_ROOT` is the parent of pelican/, which is where build.sh
# and deploy.yml both map `projects/<dir>/` and `aporia/` to `/<dir>/`.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APORIA_FULL = collect(_REPO_ROOT, APORIA)
PROJECTS_FULL = collect(_REPO_ROOT, PROJECTS)

# Services
SERVICES = [
    {
        'title': 'AI & NLP Due Diligence',
        'description': 'Independent technical due diligence on AI and NLP startups for early-stage venture funds — technology, data, IP, team, and EU AI Act readiness.',
        'url': '/services/ai-due-diligence.html',
        'image': '/images/social-preview/due-diligence.png',
        'label': 'For Venture Funds',
    },
    {
        'title': 'The AI Adoption Audit',
        'description': 'A fixed-scope diagnostic that finds why an internal AI tool has stalled — across the data, retrieval, and cognitive layers — and sets out what to change.',
        'url': '/services/ai-adoption-audit.html',
        'image': '/images/social-preview/ai-adoption.png',
        'label': 'For Enterprise & Scale-ups',
    },
    {
        'title': 'Commissioned Analysis',
        'description': 'Data analysis, visualisation, and visual storytelling — from a single interactive chart to a scrollable data essay — built on our own open-source tools.',
        'url': '/services/commissioned-analysis.html',
        'image': '/images/social-preview/commissioned-analysis.png',
        'label': 'Visualisation & Story',
    },
]

# SPDX identifier -> licence URL, so the package schema can emit a resolvable
# licence rather than the bare string the cards display.
LICENSE_URLS = {
    'MIT': 'https://opensource.org/licenses/MIT',
}

# Open source packages
PACKAGES = [
    {
        'name': 'chronowords',
        'logo': 'logos/brand/chronowords.svg',
        'version': 'v0.3.0',
        'license': 'MIT',
        'python': '3.10+',
        'description': 'Detect semantic shifts over time in text corpora. Memory-efficient PPMI-based word embeddings via Count-Min Sketch, NMF topic modeling, and Procrustes alignment for tracking how word meanings evolve across time periods.',
        'pypi': 'https://pypi.org/project/chronowords/',
        'github': 'https://github.com/crow-intelligence/chronowords',
        'docs': 'https://chronowords.readthedocs.io/en/latest/',
    },
    {
        'name': 'kenon',
        'logo': 'logos/brand/kenon.svg',
        'version': 'v0.1.2',
        'license': 'MIT',
        'python': '3.11+',
        'description': 'Construct semantic and co-occurrence networks from text using corpus-internal statistics. Lightweight graph construction through spaCy tokenization, skip-gram windows, and network backbone extraction — no neural models or external training data required.',
        'pypi': 'https://pypi.org/project/kenon/',
        'github': 'https://github.com/crow-intelligence/kenon',
        'docs': 'https://kenon.readthedocs.io/en/latest/',
    },
    {
        'name': 'keyflux',
        'logo': 'logos/brand/keyflux.svg',
        'version': 'v0.2.0',
        'license': 'MIT',
        'python': '3.11+',
        'description': 'Corpus keyness done properly: keywords and lockwords from a focus-versus-reference comparison (log-likelihood significance, log-ratio effect size), rank-turbulence divergence between the ranked lists, and allotaxonograph plots — a transparent, pip-installable pipeline rendered in matplotlib.',
        'pypi': 'https://pypi.org/project/keyflux/',
        'github': 'https://github.com/crow-intelligence/keyflux',
        'docs': 'https://keyflux.readthedocs.io/',
    },
    {
        'name': 'lexograph',
        'logo': 'logos/brand/lexograph.svg',
        'version': 'v0.1.0',
        'license': 'MIT',
        'python': '3.11+',
        'description': 'Spatialize linear text into pictures you can read: punctuation spirals, 2-D/3-D sentence walks, recurrence dotplots, and concordance plots through one segment → layout → encode → render pipeline. Pure Python, matplotlib figures — the visualisation member of the corpus-lx family.',
        'pypi': 'https://pypi.org/project/lexograph/',
        'github': 'https://github.com/crow-intelligence/lexograph',
        'docs': 'https://lexograph.readthedocs.io/',
    },
    {
        'name': 'saphes',
        'logo': 'logos/brand/saphes.svg',
        'version': 'v0.1.0',
        'license': 'MIT',
        'python': '3.11+',
        'description': 'Readability (LIX) and lexical diversity (TTR/MATTR) with the parameters other implementations hardcode. The LIX long-word threshold is fixed at 6 everywhere — a Swedish value that saturates on agglutinative or heavily inflected languages — so saphes exposes it, along with every count behind the score. Dependency-free: plain Python and the standard library.',
        'pypi': 'https://pypi.org/project/saphes/',
        'github': 'https://github.com/crow-intelligence/saphes',
        'docs': 'https://saphes.readthedocs.io/',
    },
    {
        'name': 'corvus',
        'logo': 'logos/brand/corvus.svg',
        'license': 'MIT',
        # Not on PyPI, and not a release we can version: the name `corvus`
        # on PyPI belongs to an unrelated WebSocket library published by
        # someone else. Templates must not format this entry like the five
        # that do have releases.
        'no_pypi': True,
        'python': '3.10+',
        'description': 'A cookiecutter template for data science and text analysis projects. Pre-configured scaffold with uv, ruff, DVC, MLflow, Sphinx docs, and structured directories — eliminate manual setup and start analysing.',
        'github': 'https://github.com/crow-intelligence/corvus',
    },
]

# Partners
PARTNERS = [
    {
        'name': 'RxClarity',
        'logo': 'logos/rxclarity.png',
    },
    {
        'name': 'GL1',
        'logo': 'logos/gl1.png',
    },
    {
        'name': 'Precognox',
        'logo': 'logos/precognox.png',
    },
    {
        'name': 'K-Monitor',
        'logo': 'logos/k-monitor.png',
    },
    {
        'name': 'The Future Fox',
        'logo': 'logos/futurefox.jpeg',
    },
    {
        'name': 'nyest.hu',
        'logo': 'logos/nyest.png',
    },
    {
        'name': 'HUN-REN ICNP',
        'logo': 'logos/hun-ren.png',
    },
    {
        'name': 'Manning',
        'logo': 'logos/manning.svg',
    },
    {
        'name': 'Urbanum',
        'logo': 'logos/urbanum_kek.png',
    },
    {
        'name': 'Habitat for Humanity',
        'logo': 'logos/hfhh_logo_black.svg',
    },
    {
        'name': 'Széchenyi University',
        'logo': 'logos/uni_szec.png',
    },
]
