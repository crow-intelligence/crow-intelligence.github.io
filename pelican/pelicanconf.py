AUTHOR = 'Crow Intelligence'
SITENAME = 'Crow Intelligence'
SITEURL = ''
SITESUBTITLE = 'AI Consultancy & Strategy'

PATH = 'content'
OUTPUT_PATH = '../output'

TIMEZONE = 'Europe/Budapest'
DEFAULT_LANG = 'en'

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

# Plugins
PLUGINS = ['sitemap']
SITEMAP = {
    'format': 'xml',
    'priorities': {
        'articles': 0.8,
        'pages': 0.9,
        'indexes': 0.5,
    },
    'changefreqs': {
        'articles': 'monthly',
        'pages': 'monthly',
        'indexes': 'daily',
    }
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
        'role': 'Co-Founder, Crow Intelligence',
        'bio': 'Two decades at the intersection of language, AI, and data. Technical due diligence and AI advisory for funds and startups; co-founded and exited Complytron (acquired by SEON, 2023).',
        'photo': 'portraits/zoli.jpeg',
        'linkedin': 'https://www.linkedin.com/in/zoltanvarju/',
    },
    {
        'name': 'Orsolya Putz, PhD',
        'role': 'Cognitive Scientist & AI Engineer',
        'bio': 'PhD in Cognitive Linguistics. Adjunct Professor at the Technical University of Budapest (BME).',
        'photo': 'portraits/orsi.jpeg',
        'linkedin': 'https://www.linkedin.com/in/orsolya-putz-phd-5242a5157/',
    },
]

# Featured projects
PROJECTS = [
    {
        'title': 'The Wealth of Nations — 250th Anniversary Digital Edition',
        'description': "An interactive exploration of Adam Smith's 1776 masterwork. Topic modeling, named entity recognition, rhetorical metaphor analysis, and full-text search across all five books.",
        'url': '/site/index.html',
        'image': '/site/img/punctuation_spiral.png',
        'label': 'NLP & Digital Humanities',
        'featured': True,
    },
    {
        'title': 'The Nagel Index — Public vs. Private Personality',
        'description': "Big Five personality analysis of political leaders, measuring the gap between their public speeches and private correspondence. Inspired by Thomas Nagel's essay on ruthlessness in public life.",
        'url': '/aporia/nagel-essay/',
        'image': '/dashboard_portraits/lincoln_portrait.png',
        'label': 'Personality Analytics',
        'featured': True,
    },
    {
        'title': 'Market Metaphors — Kindleberger Phases × Narrative Economics',
        'description': 'Tracing the evolution of metaphorical language in 158,666 financial news headlines (2009–2020) across five crisis events, mapping metaphor domains to the Minsky–Kindleberger panic cycle.',
        'url': '/web/index.html',
        'image': '/web/preview.svg',
        'label': 'Computational Rhetoric',
        'featured': True,
    },
    {
        'title': 'The Narrative Engine — FOMC Speech Analysis',
        'description': 'A pilot dashboard comparing how FOMC governors talk about the economy — topic, narrative type, stance, and time-orientation across four speeches, with a drill-down inspector for individual expressions.',
        'url': '/fomc-dashboard/index.html',
        'image': '/fomc-dashboard/preview.png',
        'label': 'Narrative Analytics',
        'featured': False,
    },
    {
        'title': 'Chokepoint News-Risk Dashboard',
        'description': "Topic-modelled daily geopolitical risk across the world's maritime chokepoints — Suez, the Red Sea, Hormuz, Panama, the Bosphorus and the Danish straits — tracking how risk is framed in the news as it unfolds.",
        'url': '/chokepoints/',
        'image': '/chokepoints/preview.svg',
        'label': 'News-Risk Analytics',
        'featured': False,
    },
    {
        'title': 'Corruption Press Networks — The K-Monitor Archive',
        'description': "A data-driven analysis of K-Monitor's Hungarian corruption news archive: the most frequent and characteristic words, vocabulary richness, the co-occurrence network of the actors — people and institutions — and the types of corruption, broken down by parliamentary cycle.",
        'url': '/kmdb/',
        'image': '/kmdb/preview.svg',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
        'featured': False,
    },
    {
        'title': 'Felsőzsolca — A Town in Data',
        'description': "A data portrait of a Hungarian town: warming stripes of annual mean temperature, housing and population, incomes and local economy, what changed between two censuses, and year-by-year Landsat imagery of the town and its industrial zone.",
        'url': '/felsozsolca/',
        'image': '/felsozsolca/preview.svg',
        'label': 'Geospatial Analytics',
        'lang': 'In Hungarian',
        'wip': True,
        'featured': False,
    },
    {
        'title': 'Semantic Shifts in Presidential Rhetoric',
        'description': 'Tracking how the meaning of political concepts like freedom, democracy, and war evolves across 250 years of American presidential discourse. Built with our open-source chronowords package — PPMI embeddings, Procrustes alignment, and NMF topic modeling.',
        'url': '/analysis/index.html',
        'image': '/analysis/preview.svg',
        'label': 'Computational Semantics',
        'featured': False,
    },
    {
        'title': 'Semantic Explorer — Interactive Co-occurrence Networks',
        'description': 'Explore the semantic structure of classic texts through interactive ego networks. Type a seed word, click to expand, and trace how meaning propagates through Tolstoy, Plato, Adam Smith, Darwin, and more. Built with our open-source kenon package.',
        'url': '/semantic_explorer/app/index.html',
        'image': '/semantic_explorer/preview.svg',
        'label': 'Semantic Networks',
        'featured': False,
    },
    {
        'title': 'The Tractatus as a Flat Spiral',
        'description': "The complete text of Wittgenstein's Tractatus walked out as a flat, right-angle spiral — one continuous path through its numbered propositions, set in handwriting and coloured by topical cluster. Companion visualisation to the Aporia essay.",
        'url': '/aporia/wittgenstein/viz/handwriting.html',
        'image': '/aporia/wittgenstein/imgs/handwriting_2d.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'The Tractatus as a Helix',
        'description': "The same spiral lifted into three dimensions: each proposition set a constant step above the last, so the Tractatus climbs as it turns. Rendered in handwriting and navigable sentence by sentence.",
        'url': '/aporia/wittgenstein/viz/handwriting_3d.html',
        'image': '/aporia/wittgenstein/imgs/social-preview.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'The Punctuation Spiral',
        'description': "The Tractatus stripped to its punctuation alone — every mark in sequence, spiralled outward. What remains when the words are removed: the rhythm and breath of the argument.",
        'url': '/aporia/wittgenstein/punctuation_spiral.html',
        'image': '/aporia/wittgenstein/imgs/punctuation_spiral.png',
        'label': 'Computational Philosophy',
        'featured': False,
    },
    {
        'title': 'Hungarian Pop Lyrics — A Diachronic Analysis',
        'description': "Six decades of Hungarian popular-music lyrics: distinctive words, shifting themes, semantic drift and genre from the 1960s to today.",
        'url': '/magyar-dalszovegek/#temak',
        'image': '/magyar-dalszovegek/assets/og.png',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
        'featured': False,
    },
]

# Hungarian-language projects (shown on the Hungarian portfolio page)
PROJECTS_HU = [
    {
        'title': 'Magyar dalszövegek — diakronikus elemzés',
        'description': "Hat évtizednyi magyar popzene szövegeinek nyelvi elemzése: "
                       "jellegzetes szavak, témák alakulása, jelentéseltolódások és "
                       "szemantikai sodródás a hatvanas évektől napjainkig.",
        'url': '/magyar-dalszovegek/#temak',
        'image': '/magyar-dalszovegek/assets/og.png',
        'label': 'NLP & Digitális bölcsészet',
    },
]

# Aporia — visual essays
APORIA = [
    {
        'title': 'The Wrath and the Journey',
        'description': 'A computational reading of the Iliad and the Odyssey: what each poem hoards, who speaks to whom, and where the map runs out.',
        'url': '/aporia/homer/',
        'image': '/aporia/homer/og.png',
        'label': 'Computational Classics',
    },
    {
        'title': 'The great modern crimes are public crimes',
        'description': 'Big Five personality analysis of seven American leaders, public speeches vs. private writings.',
        'url': '/aporia/nagel-essay/',
        'image': '/aporia/nagel-essay/imgs/social-preview.png',
        'label': 'Computational Psycholinguistics',
    },
    {
        'title': 'Whereof one cannot speak, thereof one must be silent',
        'description': "A visual reading of Wittgenstein's Tractatus as a handwritten spiral.",
        'url': '/aporia/wittgenstein/',
        'image': '/aporia/wittgenstein/imgs/social-preview.png',
        'label': 'Computational Philosophy',
    },
    {
        'title': 'Where does the mind end and the world begin?',
        'description': "Two reinforcement-learning agents testing Clark & Chalmers' extended-mind hypothesis.",
        'url': '/aporia/epistemic-arcade/',
        'image': '/aporia/epistemic-arcade/imgs/social-preview.png',
        'label': 'Philosophy of Mind',
    },
    {
        'title': 'Nekem írod a dalt',
        'description': "A scrollable visual essay on six decades of Hungarian popular song (1950–2026): themes, words, emotions, rhymes and word-networks, decade by decade. In Hungarian.",
        'url': '/magyar-dalszovegek-essze/',
        'image': '/magyar-dalszovegek-essze/assets/og.png',
        'label': 'NLP & Digital Humanities',
        'lang': 'In Hungarian',
    },
]

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

# Open source packages
PACKAGES = [
    {
        'name': 'chronowords',
        'logo': 'logos/brand/chronowords.svg',
        'version': 'v0.2.0',
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
        'version': 'v0.1.0',
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
        'version': 'v0.1.2',
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
        'name': 'corvus',
        'logo': 'logos/brand/corvus.svg',
        'version': 'v1.0.0',
        'license': 'MIT',
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
