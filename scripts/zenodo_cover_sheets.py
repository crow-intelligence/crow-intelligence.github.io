#!/usr/bin/env python3
"""Render one-page PDF cover sheets for depositing the Aporia essays on Zenodo.

Zenodo needs a file in every record. The essays are scrollytelling pages whose
argument lives in interactive figures, and printing them gives dark, half-blank
pages, so each record gets a cover sheet instead: title, author, date,
abstract, a link to the essay itself, the cite line and the licence. A full
printed version can be added to the same record later as a new version.

Sources, so the sheet cannot disagree with the site:
- title and date: the essay's own `citation_title` and
  `citation_publication_date` meta tags (the same ones Google Scholar reads);
- abstract: the essay's `llm_summary` in `APORIA` (`pelican/pelicanconf.py`);
- URL: `APORIA`'s `url`, made absolute.

Fails loudly if an essay is missing its tags, if Chrome cannot be found, or if
Chrome produces no PDF. Output goes to `build/zenodo/` (gitignored), because the
PDFs can be rebuilt from the repo at any time.

Needs Google Chrome or Chromium (headless printing). Pass `--chrome` when it is
not on PATH as `google-chrome`, `chromium` or `chromium-browser`.

Usage:
    python3 scripts/zenodo_cover_sheets.py            # writes build/zenodo/*.pdf
    python3 scripts/zenodo_cover_sheets.py --out /tmp/sheets
"""

from __future__ import annotations

import argparse
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://crowintelligence.org"
AUTHOR_CITE = "Varjú, Zoltán"
AUTHOR_DISPLAY = "Zoltán Varjú"
ORCID = "https://orcid.org/0009-0009-6123-1703"
LICENCE = ("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/")
FONT = ROOT / "projects/kmdb/assets/fonts/imfellenglish-400-n-lat.woff2"
MAROON = "#7a1f1f"

sys.path.insert(0, str(ROOT / "pelican"))
from pelicanconf import APORIA  # noqa: E402


def meta(page_html: str, name: str, path: Path) -> str:
    """Return the content of `<meta name="...">`, or raise naming the file."""
    m = re.search(rf'<meta name="{re.escape(name)}" content="([^"]*)"', page_html)
    if not m:
        raise SystemExit(f"{path}: no <meta name=\"{name}\">. Add the citation tags first.")
    return html.unescape(m.group(1))


def cite_line(title: str, year: str, url: str) -> str:
    """The cite line, in the same form as the essays' visible "Cite as" lines.

    >>> cite_line("The Wrath and the Journey", "2026", "https://x.org/a/")
    'Varjú, Zoltán. 2026. “The Wrath and the Journey.” Aporia, Crow Intelligence. https://x.org/a/'
    """
    return f"{AUTHOR_CITE}. {year}. “{title}.” Aporia, Crow Intelligence. {url}"


def cover_html(title: str, date_iso: str, date_long: str, label: str,
               abstract: str, url: str, hungarian: bool) -> str:
    """Return the cover sheet as a standalone HTML page, every value escaped.

    >>> page = cover_html("A <b> title", "2026-01-02", "2 January 2026", "Label",
    ...                   "Text & more.", "https://x.org/a/", False)
    >>> "A &lt;b&gt; title" in page and "Text &amp; more." in page
    True
    >>> "written in Hungarian" in page
    False
    """
    e = html.escape
    # Some summaries already end "Written in Hungarian."; don't say it twice.
    lang_note = " The essay is written in Hungarian." if hungarian and "Hungarian." not in abstract else ""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{e(title)}</title>
<style>
  @font-face {{ font-family: "IM Fell English"; src: url("{FONT.as_uri()}") format("woff2"); }}
  @page {{ size: A4; margin: 22mm 24mm; }}
  body {{ font-family: Georgia, "Times New Roman", serif; color: #1b1b1b; font-size: 11pt; line-height: 1.55; }}
  .kicker {{ font: 600 8.5pt/1 "Helvetica Neue", Arial, sans-serif; letter-spacing: .18em;
             text-transform: uppercase; color: {MAROON}; margin: 0 0 14mm; }}
  h1 {{ font-family: "IM Fell English", Georgia, serif; font-weight: 400; font-size: 26pt;
        line-height: 1.15; margin: 0 0 5mm; }}
  .rule {{ width: 28mm; border-top: 1.5pt solid {MAROON}; margin: 0 0 5mm; }}
  .byline {{ margin: 0 0 12mm; color: #444; }}
  .byline a {{ color: inherit; }}
  h2 {{ font: 600 8.5pt/1 "Helvetica Neue", Arial, sans-serif; letter-spacing: .14em;
        text-transform: uppercase; color: #555; margin: 9mm 0 2.5mm; }}
  p {{ margin: 0 0 3mm; }}
  a {{ color: {MAROON}; }}
  .small {{ font-size: 9.5pt; color: #444; }}
</style></head><body>
<p class="kicker">Aporia · Crow Intelligence · {e(label)}</p>
<h1>{e(title)}</h1>
<div class="rule"></div>
<p class="byline">{e(AUTHOR_DISPLAY)} (<a href="{ORCID}">ORCID {ORCID.rsplit('/', 1)[1]}</a>)
 · Crow Intelligence · <time datetime="{date_iso}">{e(date_long)}</time></p>
<h2>Abstract</h2>
<p>{e(abstract)}</p>
<h2>Read the essay</h2>
<p>This record archives a visual essay. Its argument is carried by interactive figures
that do not survive as a PDF; the essay itself is at <a href="{e(url)}">{e(url)}</a>.{lang_note}</p>
<h2>Cite as</h2>
<p class="small">{e(cite_line(title, date_iso[:4], url))}</p>
<h2>Licence</h2>
<p class="small"><a href="{LICENCE[1]}">{LICENCE[0]}</a></p>
</body></html>
"""


def find_chrome(explicit: str | None) -> str:
    """Return a Chrome/Chromium executable, or raise with what was tried."""
    names = [explicit] if explicit else ["google-chrome", "chromium", "chromium-browser"]
    for name in names:
        found = shutil.which(name) if name else None
        if found:
            return found
    raise SystemExit(f"No Chrome found (tried {', '.join(n for n in names if n)}). Pass --chrome.")


def print_pdf(chrome: str, src: Path, dest: Path) -> None:
    """Print `src` to `dest` with headless Chrome; raise if no PDF appears."""
    dest.unlink(missing_ok=True)
    subprocess.run(
        [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
         "--allow-file-access-from-files", "--no-pdf-header-footer",
         f"--print-to-pdf={dest}", src.as_uri()],
        capture_output=True, timeout=120, check=False,
    )
    if not dest.exists() or dest.stat().st_size == 0:
        raise SystemExit(f"Chrome produced no PDF for {src}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=ROOT / "build/zenodo",
                    help="output directory (default: build/zenodo)")
    ap.add_argument("--chrome", help="Chrome/Chromium executable (default: found on PATH)")
    args = ap.parse_args()

    chrome = find_chrome(args.chrome)
    args.out.mkdir(parents=True, exist_ok=True)
    for essay in APORIA:
        slug = essay["url"].strip("/").split("/")[-1]
        path = ROOT / essay["url"].strip("/") / "index.html"
        page = path.read_text(encoding="utf-8")
        title = meta(page, "citation_title", path)
        date_iso = meta(page, "citation_publication_date", path).replace("/", "-")
        if date_iso != essay["date"].isoformat():
            raise SystemExit(f"{path}: citation date {date_iso} disagrees with APORIA {essay['date']}")
        src = args.out / f"aporia-{slug}.html"
        src.write_text(cover_html(
            title=title,
            date_iso=date_iso,
            date_long=f"{essay['date'].day} {essay['date']:%B %Y}",
            label=essay["label"],
            abstract=essay["llm_summary"],
            url=SITE + essay["url"],
            hungarian=bool(essay.get("lang")),
        ), encoding="utf-8")
        pdf = args.out / f"aporia-{slug}.pdf"
        print_pdf(chrome, src, pdf)
        print(f"{pdf.relative_to(ROOT) if pdf.is_relative_to(ROOT) else pdf}  ({title})")


if __name__ == "__main__":
    main()
