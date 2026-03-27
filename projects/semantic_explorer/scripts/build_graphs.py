"""Build kenon backbone graphs for each book."""

import gc
import pickle
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
GRAPHS_DIR = BASE_DIR / "data" / "graphs"

SPACY_MODEL = "en_core_web_sm"
WINDOW = 2
BACKBONE_ALPHA_PTILE = 0.5
BACKBONE_MIN_DEGREE = 2
MIN_TOKEN_LEN = 3

BOOKS = {
    "war_and_peace": "War and Peace",
    "pride_and_prejudice": "Pride and Prejudice",
    "beyond_good_and_evil": "Beyond Good and Evil",
    "wealth_of_nations": "The Wealth of Nations",
    "moby_dick": "Moby Dick",
    "the_republic": "The Republic",
    "frankenstein": "Frankenstein",
    "origin_of_species": "On the Origin of Species",
}


def build_book_graph(slug: str, title: str) -> None:
    """Tokenise a book and build its backbone graph."""
    from kenon import Tokenizer, build_cooccurrence_graph, extract_backbone, get_stopwords

    raw_path = RAW_DIR / f"{slug}.txt"
    out_path = GRAPHS_DIR / f"{slug}.pkl"

    if out_path.exists():
        print(f"[{slug}] Already built → {out_path}")
        return

    if not raw_path.exists():
        print(f"[{slug}] ERROR: {raw_path} not found. Run download_books.py first.")
        sys.exit(1)

    text = raw_path.read_text(encoding="utf-8")
    print(f"[{slug}] Tokenising {title} ({len(text):,} chars)...")

    tokenizer = Tokenizer(SPACY_MODEL, lemmatize=True, lower=True)
    stopwords = get_stopwords("english")

    # Tokenise (Tokenizer handles long texts by raising spaCy's max_length)
    tokens = tokenizer.flat_tokens(text)

    # Filter: remove stopwords, non-alphabetic, short tokens
    tokens = [
        t for t in tokens
        if t not in stopwords and t.isalpha() and len(t) >= MIN_TOKEN_LEN
    ]

    vocab_size = len(set(tokens))
    print(f"[{slug}] tokens={len(tokens):,} | vocab={vocab_size:,}")

    # Build co-occurrence graph
    print(f"[{slug}] Building co-occurrence graph (window={WINDOW})...")
    g = build_cooccurrence_graph(tokens, window=WINDOW, stopwords=stopwords)
    print(f"[{slug}] Base graph: nodes={g.number_of_nodes():,} edges={g.number_of_edges():,}")

    # Extract backbone
    print(f"[{slug}] Extracting backbone (alpha_ptile={BACKBONE_ALPHA_PTILE})...")
    backbone = extract_backbone(
        g,
        min_alpha_ptile=BACKBONE_ALPHA_PTILE,
        min_degree=BACKBONE_MIN_DEGREE,
    )
    print(
        f"[{slug}] Backbone: nodes={backbone.number_of_nodes():,} "
        f"edges={backbone.number_of_edges():,}"
    )

    # Save
    with open(out_path, "wb") as f:
        pickle.dump(backbone, f)
    print(f"[{slug}] → {out_path}")


def main() -> None:
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Building graphs for {len(BOOKS)} books...\n")
    for slug, title in BOOKS.items():
        build_book_graph(slug, title)
        gc.collect()
        print()

    print("Done. All graphs saved.")


if __name__ == "__main__":
    main()
