"""Download books from Project Gutenberg and cache to data/raw/."""

import re
import sys
import time
from pathlib import Path

import requests

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "raw"

BOOKS = {
    "war_and_peace": 2600,
    "pride_and_prejudice": 1342,
    "beyond_good_and_evil": 4363,
    "wealth_of_nations": 3300,
    "moby_dick": 2701,
    "the_republic": 1497,
    "frankenstein": 84,
    "origin_of_species": 1228,
}

# Try multiple URL patterns — Gutenberg is inconsistent
URL_PATTERNS = [
    "https://www.gutenberg.org/files/{id}/{id}-0.txt",
    "https://www.gutenberg.org/files/{id}/{id}.txt",
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
]


def strip_gutenberg_header_footer(text: str) -> str:
    """Remove Project Gutenberg header and footer boilerplate."""
    # Find start marker
    start_match = re.search(
        r"\*\*\*\s*START OF (?:THE |THIS )?PROJECT GUTENBERG",
        text,
        re.IGNORECASE,
    )
    if start_match:
        # Skip to end of the line after the marker
        newline_after = text.find("\n", start_match.end())
        if newline_after != -1:
            text = text[newline_after + 1 :]

    # Find end marker
    end_match = re.search(
        r"\*\*\*\s*END OF (?:THE |THIS )?PROJECT GUTENBERG",
        text,
        re.IGNORECASE,
    )
    if end_match:
        text = text[: end_match.start()]

    return text.strip()


def download_book(slug: str, gutenberg_id: int) -> None:
    """Download a single book, trying multiple URL patterns."""
    out_path = DATA_DIR / f"{slug}.txt"
    if out_path.exists():
        print(f"[{slug}] Already cached → {out_path}")
        return

    for pattern in URL_PATTERNS:
        url = pattern.format(id=gutenberg_id)
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                # Try UTF-8, fall back to latin-1
                try:
                    text = resp.content.decode("utf-8")
                except UnicodeDecodeError:
                    text = resp.content.decode("latin-1")

                text = strip_gutenberg_header_footer(text)

                if len(text) < 1000:
                    print(f"[{slug}] WARNING: text suspiciously short from {url}")
                    continue

                out_path.write_text(text, encoding="utf-8")
                print(
                    f"[{slug}] Downloaded ({len(text):,} chars) → {out_path}"
                )
                return
        except requests.RequestException as e:
            print(f"[{slug}] Failed {url}: {e}")
            continue

    print(f"[{slug}] ERROR: Could not download from any URL pattern")
    sys.exit(1)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Downloading {len(BOOKS)} books from Project Gutenberg...")
    for slug, gid in BOOKS.items():
        download_book(slug, gid)
        time.sleep(1)  # Be polite to Gutenberg servers

    print(f"\nDone. All books cached in {DATA_DIR}/")


if __name__ == "__main__":
    main()
