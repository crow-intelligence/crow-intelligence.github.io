"""Extract readable prose from the hand-authored pages, for llms-full.txt.

The Aporia essays and the project microsites live outside the Pelican content
tree — they are self-contained HTML copied into the build by `build.sh` and by
the deploy workflow. Jinja cannot reach them, so `llms-full.txt` needs the text
pulled out in Python first and handed to the template as data.

The extraction is deliberately blunt: drop <script>, <style>, <head>, <nav> and
<footer>, unescape entities, collapse whitespace. It is not a renderer. What it
guarantees is that no markup and no inlined `const DATA = {...}` payload reaches
the output; what it does not guarantee is paragraph structure.

Pages whose file is missing are skipped rather than reported as empty, so a
project listed in PROJECTS but not yet in the repo cannot break the build.
"""

import html
import re
from pathlib import Path

_DROP = re.compile(
    r'<(script|style|head|nav|footer|svg|noscript)\b.*?</\1\s*>',
    re.IGNORECASE | re.DOTALL,
)
_COMMENT = re.compile(r'<!--.*?-->', re.DOTALL)
_TAG = re.compile(r'<[^>]+>')


def extract_prose(path):
    """Return the readable text of an HTML file, or '' if it is not there.

    >>> import tempfile, pathlib
    >>> d = pathlib.Path(tempfile.mkdtemp())
    >>> _ = (d / 'p.html').write_text(
    ...     '<html><head><title>x</title></head><body>'
    ...     '<script>const DATA = {"a": 1};</script>'
    ...     '<h1>Title</h1><p>Some&nbsp;prose.</p></body></html>')
    >>> extract_prose(d / 'p.html')
    'Title Some prose.'
    >>> extract_prose(d / 'missing.html')
    ''
    """
    path = Path(path)
    if not path.is_file():
        return ''
    text = path.read_text(encoding='utf-8', errors='replace')
    text = _COMMENT.sub(' ', text)
    text = _DROP.sub(' ', text)
    text = _TAG.sub(' ', text)
    return ' '.join(html.unescape(text).split())


def collect(repo_root, entries):
    """Pair each entry with the prose of the page its `url` points at.

    `entries` are the dicts from APORIA / PROJECTS in pelicanconf.py. A published
    URL like `/kmdb/` maps to `projects/kmdb/` in the repo, while `/aporia/homer/`
    maps straight to `aporia/homer/` — both `build.sh` and the deploy workflow
    flatten `projects/<dir>/` to `/<dir>/`, so both layouts are searched. A URL
    that already names a file is used as given.

    Entries whose page is missing or holds no prose are dropped: an empty
    section in llms-full.txt would assert the page is empty, which is a
    different claim from "not published from this repo".

    Returns a list of (entry, prose) pairs in the order given.
    """
    root = Path(repo_root)
    out = []
    for entry in entries:
        url = entry['url'].split('#')[0].strip('/')
        if not url:
            continue
        for base in (root, root / 'projects'):
            candidate = base / url
            if candidate.suffix != '.html':
                candidate = candidate / 'index.html'
            prose = extract_prose(candidate)
            if prose:
                out.append((entry, prose))
                break
    return out
