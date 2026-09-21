#!/usr/bin/env python3
"""Render a social-preview card in the house style.

The service and page cards under `pelican/content/images/social-preview/` are
typeset text on a near-black field: a letter-spaced gold kicker, the page title
in IM Fell English, a short gold rule, and an italic standfirst. They were made
by hand, so a new page had no way to get one — which is how the main services
page ended up sharing the generic card.

The face is IM Fell English, which the repo carries only as `woff2` (the format
the microsites serve). Pillow cannot read `woff2`, so it is converted to TTF in
memory via fontTools; nothing is written to the font directories.

Usage:
    python3 scripts/make_social_card.py \
        --title "Actionable Insight from Language Data" \
        --standfirst "Text analytics that ends in a decision." \
        --out pelican/content/images/social-preview/language-insight.png
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]

# Sampled from the existing cards rather than guessed.
SIZE = (1280, 640)
BG = "#0d0d10"
INK = "#e8e6e1"
GOLD = "#e8c97e"
MUTED = "#a8a69d"

# Row bands measured on commissioned-analysis.png: kicker 161-173,
# title 284-343, standfirst 480-515, with the rule between the last two.
Y_KICKER, Y_TITLE, Y_RULE, Y_STANDFIRST = 167, 313, 445, 497
TITLE_TRACKING = 2

REGULAR = ROOT / "projects/kmdb/assets/fonts/imfellenglish-400-n-lat.woff2"
ITALIC = ROOT / "projects/kmdb/assets/fonts/imfellenglish-400-i-lat.woff2"


def load_font(woff2_path, size):
    """Return an ImageFont for a woff2 face, converting in memory.

    Raises FileNotFoundError if the face is not in the repo — better than
    silently falling back to a default face and producing an off-brand card.
    """
    woff2_path = Path(woff2_path)
    if not woff2_path.is_file():
        raise FileNotFoundError(f"font not found: {woff2_path}")
    font = TTFont(str(woff2_path))
    font.flavor = None  # drop the woff2 wrapper, leaving plain TTF
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def fit(draw, text, path, max_width, start, floor=34, tracking=0):
    """Largest size at or below `start` that keeps `text` inside `max_width`."""
    for size in range(start, floor - 1, -2):
        font = load_font(path, size)
        if tracked_width(draw, text, font, tracking) <= max_width:
            return font
    return load_font(path, floor)


def tracked(draw, text, font, y, fill, tracking, width, word_gap=0):
    """Draw letter-spaced text centred on `y`. Pillow has no tracking option.

    `word_gap` is added on top of the space character, because the existing
    cards set the kicker with a noticeably wider gap between words than the
    letter tracking alone produces.
    """
    widths = [draw.textlength(c, font=font) for c in text]
    extra = [tracking + (word_gap if c == " " else 0) for c in text]
    total = sum(widths) + sum(extra[:-1])
    x = (width - total) / 2
    for char, w, e in zip(text, widths, extra):
        draw.text((x, y), char, font=font, fill=fill, anchor="lm")
        x += w + e


def tracked_width(draw, text, font, tracking, word_gap=0):
    """Rendered width of `text` under the same tracking rules as `tracked`."""
    widths = [draw.textlength(c, font=font) for c in text]
    extra = [tracking + (word_gap if c == " " else 0) for c in text]
    return sum(widths) + sum(extra[:-1])


def make_card(title, standfirst, out, kicker="CROW INTELLIGENCE"):
    img = Image.new("RGB", SIZE, BG)
    draw = ImageDraw.Draw(img)
    width, _ = SIZE
    margin = 100

    tracked(draw, kicker, load_font(REGULAR, 22), Y_KICKER, GOLD, 9, width, word_gap=26)

    # The existing cards set the title in caps with a little tracking.
    title = title.upper()
    title_font = fit(draw, title, REGULAR, width - 2 * margin, 92, tracking=TITLE_TRACKING)
    tracked(draw, title, title_font, Y_TITLE, INK, TITLE_TRACKING, width)

    draw.line([(width / 2 - 65, Y_RULE), (width / 2 + 65, Y_RULE)], fill=GOLD, width=2)

    sf_font = fit(draw, standfirst, ITALIC, width - 2 * margin, 30, floor=20)
    draw.text((width / 2, Y_STANDFIRST), standfirst, font=sf_font, fill=MUTED, anchor="mm")

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--title", required=True)
    ap.add_argument("--standfirst", required=True)
    ap.add_argument("--kicker", default="CROW INTELLIGENCE")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    path = make_card(args.title, args.standfirst, args.out, args.kicker)
    print(f"wrote {path} ({Image.open(path).size[0]}x{Image.open(path).size[1]})")


if __name__ == "__main__":
    main()
