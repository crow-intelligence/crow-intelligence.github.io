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
    ('Projects', '/projects.html'),
    ('Packages', '/packages.html'),
    ('Due Diligence', '/services/ai-due-diligence.html'),
    ('AI Adoption', '/services/ai-adoption-audit.html'),
    ('Aporia', '/aporia/'),
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
        'url': '/dashboard/index.html',
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
