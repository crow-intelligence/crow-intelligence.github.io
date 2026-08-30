#!/usr/bin/env python3
"""Assert the invariants every published page is supposed to hold.

The head and navigation of this site drifted apart because nothing checked
them. The Pelican pages share one template and stayed healthy; the ~16
hand-authored microsites and essays, which share nothing, ended up with six
navigation variants, three head variants, and pages carrying no social tags,
no canonical, or no way back to the site at all.

Consolidating them into a shared head would mean a new build stage duplicated
across build.sh and deploy.yml, and it would fight the two microsites that are
generated in other repositories. This is the cheaper half of that trade: patch
the variants once, then check them on every build.

Scope: every page reachable from a sitemap, plus the sitemaps themselves. The
bulk auto-generated Vega trees (projects/charts/, projects/altair_maps/, ~3,000
files) are not in any sitemap and are not checked — they are chart output, not
pages.

Usage:
    python3 scripts/lint_html.py output/
    python3 scripts/lint_html.py output/ --warn-only

Exit status is 1 if any error-level check fails.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

# Minimum server-rendered prose for a page that is submitted in a sitemap. A
# page with less than this is asking to be indexed while giving a crawler
# nothing to index.
MIN_WORDS = 250

# Known, accepted failures. Keyed by the path as the sitemap lists it, then by
# check name, with the reason. Nothing here is silent: every entry is printed in
# the run summary, so a temporary exemption cannot quietly become permanent, and
# removing the exemption is how the work gets picked back up.
EXEMPT = {
    # Generated in ~/projects/music_networks and re-copied here. Hand edits are
    # lost on the next regen, so these are upstream fixes, not local ones.
    'magyar-dalszovegek/': {
        'description-length': 'generated from music_networks; fix upstream',
    },
    'aporia/magyar-dalszovegek-essze/': {
        'description-length': 'generated from music_networks; fix upstream',
    },

    # Utility and hub pages. Short by design — a contact form and a three-item
    # index are not thin content, and padding them to clear a lint would be
    # writing for the checker rather than the reader.
    'contact.html': {'prose-length': 'contact form; short by design'},
    'services.html': {'prose-length': 'three-item index; short by design'},

    # Single full-bleed visualisations with no prose surface. Each is a
    # companion to an essay that carries the argument.
    'aporia/wittgenstein/punctuation_spiral.html': {'prose-length': 'companion visualisation'},
    'aporia/wittgenstein/viz/handwriting.html': {'prose-length': 'companion visualisation', 'h1-count': 'companion visualisation, no heading'},
    'aporia/wittgenstein/viz/handwriting_3d.html': {'prose-length': 'companion visualisation', 'h1-count': 'companion visualisation, no heading'},

    # Publication status is an open question; not being padded to pass a lint.
    'felsozsolca/': {
        'prose-length': 'self-described internal working material; publication status undecided',
        'description': 'ditto — not writing metadata for a page that may be withdrawn',
        'og-locale': 'ditto',
    },

    # Prose slots written as briefs in PR 5, awaiting the author. Each page
    # carries shared framing so it is never empty.
    'chokepoints/': {'prose-length': 'PR 5 prose slot: corpus and findings not yet stated anywhere in the repo'},
    'semantic_explorer/app/': {'prose-length': 'PR 5 prose slot: source list and kenon settings to come from the author'},
    'site/': {'prose-length': 'framing prose not written yet'},
    'web/': {'prose-length': 'framing prose not written yet'},
    **{
        f'aporia/nagel-essay/dashboards/{slug}_dashboard.html':
            {'prose-length': 'PR 5 prose slot: per-figure sources and findings await the author'}
        for slug in ('washington', 'lincoln', 'jefferson', 'nixon', 'bush41', 'bush43', 'kissinger')
    },
}

WORDPRESS_MARKERS = ('wp-content', 'wp-includes', 'jetpack', 'society6', 'wp-json')

_STRIP = re.compile(r'<(script|style|template)\b.*?</\1\s*>', re.I | re.S)
_COMMENT = re.compile(r'<!--.*?-->', re.S)
_TAG = re.compile(r'<[^>]+>')
_LOC = re.compile(r'<loc>([^<]+)</loc>')


def meta(html, attr, name):
    """Return the content of <meta {attr}="{name}"> regardless of attribute order.

    The closing quote is back-referenced to the opening one. A character class
    would end the value at the first quote of either kind, which silently
    truncated any description containing an apostrophe — and so under-reported
    its length, which is the one thing this check exists to measure.
    """
    for m in re.finditer(r'<meta\b([^>]*)>', html, re.I):
        attrs = m.group(1)
        if re.search(rf'\b{attr}\s*=\s*(["\']){re.escape(name)}\1', attrs, re.I):
            c = re.search(r'\bcontent\s*=\s*(["\'])(.*?)\1', attrs, re.I | re.S)
            if c:
                return ' '.join(c.group(2).split())
    return None


def prose_words(html):
    """Word count of the text a crawler sees without executing JavaScript."""
    body = re.search(r'<body\b[^>]*>(.*)</body>', html, re.I | re.S)
    text = body.group(1) if body else html
    text = _COMMENT.sub(' ', text)
    text = _STRIP.sub(' ', text)
    # Anything hidden before JS runs does not count — that was the actual bug on
    # the Epistemic Arcade, whose whole essay sat inside a `hidden` container.
    text = re.sub(r'<(\w+)\b[^>]*\bhidden\b[^>]*>.*?</\1\s*>', ' ', text, flags=re.I | re.S)
    for tag in ('nav', 'footer', 'header'):
        text = re.sub(rf'<{tag}\b.*?</{tag}\s*>', ' ', text, flags=re.I | re.S)
    return len(_TAG.sub(' ', text).split())


def sitemap_paths(root):
    """Every site-relative path listed in any sitemap under `root`."""
    paths = set()
    for sm in sorted(root.glob('sitemap*.xml')):
        for loc in _LOC.findall(sm.read_text(encoding='utf-8')):
            path = urlsplit(loc).path or '/'
            paths.add(path.lstrip('/') or 'index.html')
    return paths


def resolve(root, rel):
    """Map a sitemap path to a file, following the directory-index convention."""
    for candidate in (root / rel, root / rel / 'index.html'):
        if candidate.is_file():
            return candidate
    return None


def check_page(rel, html):
    """Yield (check_name, message) for each invariant this page fails.

    Comments are stripped first: a commented-out <h1> or a prose slot brief is
    not markup the browser sees, and counting it produced false failures.
    """
    visible = _COMMENT.sub(' ', html)

    if not re.search(r'<html\b[^>]*\blang\s*=', visible, re.I):
        yield 'lang', 'no lang attribute on <html>'

    locale = meta(visible, 'property', 'og:locale')
    lang = re.search(r'<html\b[^>]*\blang\s*=\s*["\']([^"\']+)', visible, re.I)
    if locale is None:
        yield 'og-locale', 'no og:locale'
    elif lang and not locale.lower().startswith(lang.group(1).split('-')[0].lower()):
        yield 'og-locale', f'og:locale {locale!r} disagrees with lang {lang.group(1)!r}'

    if not re.search(r'<link\b[^>]*\brel\s*=\s*["\']canonical["\']', visible, re.I):
        yield 'canonical', 'no canonical link'

    desc = meta(visible, 'name', 'description')
    if not desc:
        yield 'description', 'no meta description'
    elif len(desc) > 160:
        yield 'description-length', f'meta description is {len(desc)} characters (max 160)'

    h1s = len(re.findall(r'<h1\b', visible, re.I))
    if h1s != 1:
        yield 'h1-count', f'{h1s} <h1> elements (want exactly 1)'

    if 'crowintelligence.org' not in visible and not re.search(r'href\s*=\s*["\']/(?:[a-z]|["\'])', visible):
        yield 'site-link', 'no link back to the site'

    for m in re.finditer(r'<img\b([^>]*)>', visible, re.I):
        if not re.search(r'\balt\s*=', m.group(1), re.I):
            src = re.search(r'\bsrc\s*=\s*["\']([^"\']*)', m.group(1), re.I)
            yield 'img-alt', f'<img> without alt: {src.group(1) if src else "?"}'

    lowered = visible.lower()
    for marker in WORDPRESS_MARKERS:
        if marker in lowered:
            yield 'wordpress', f'WordPress-era marker in output: {marker}'

    words = prose_words(html)
    if words < MIN_WORDS:
        yield 'prose-length', f'only {words} words of server-rendered prose (min {MIN_WORDS})'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('root', type=Path, help='built site directory, e.g. output/')
    ap.add_argument('--warn-only', action='store_true',
                    help='report failures but exit 0')
    args = ap.parse_args()

    root = args.root
    if not root.is_dir():
        sys.exit(f'not a directory: {root}')

    rels = sitemap_paths(root)
    if not rels:
        sys.exit(f'no sitemap*.xml found under {root} - nothing to check')

    errors, exempted, missing, checked = 0, [], [], 0
    unused = {(rel, check) for rel, checks in EXEMPT.items() for check in checks}

    for rel in sorted(rels):
        if rel.endswith(('.txt', '.xml')):
            continue
        path = resolve(root, rel)
        if path is None:
            missing.append(rel)
            continue
        checked += 1
        html = path.read_text(encoding='utf-8', errors='replace')
        for check, msg in check_page(rel, html):
            reason = EXEMPT.get(rel, {}).get(check)
            if reason:
                unused.discard((rel, check))
                exempted.append(f'{rel} [{check}]: {msg} - {reason}')
            else:
                errors += 1
                print(f'ERROR  {rel} [{check}]: {msg}')

    for rel in missing:
        errors += 1
        print(f'ERROR  {rel} [missing]: in a sitemap but not in the build')

    if exempted:
        print('\nAccepted failures, each with a stated reason:')
        for line in sorted(exempted):
            print(f'  - {line}')

    if unused:
        # An exemption that no longer fires means the underlying problem is
        # fixed. Report it so the register does not accumulate dead entries.
        print('\nExemptions that no longer apply - remove them from EXEMPT:')
        for rel, check in sorted(unused):
            print(f'  - {rel} [{check}]')

    print(f'\n{checked} pages checked, {errors} error(s), '
          f'{len(exempted)} accepted failure(s), {len(unused)} stale exemption(s).')
    if errors and not args.warn_only:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
