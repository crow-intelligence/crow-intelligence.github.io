"""Export backbone graphs to compact JSON for the browser app."""

import json
import pickle
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
GRAPHS_DIR = BASE_DIR / "data" / "graphs"
JSON_DIR = BASE_DIR / "data" / "json"

BOOKS = {
    "war_and_peace": ("War and Peace", "Leo Tolstoy"),
    "pride_and_prejudice": ("Pride and Prejudice", "Jane Austen"),
    "beyond_good_and_evil": ("Beyond Good and Evil", "Friedrich Nietzsche"),
    "wealth_of_nations": ("The Wealth of Nations", "Adam Smith"),
    "moby_dick": ("Moby Dick", "Herman Melville"),
    "the_republic": ("The Republic", "Plato"),
    "frankenstein": ("Frankenstein", "Mary Shelley"),
    "origin_of_species": ("On the Origin of Species", "Charles Darwin"),
}


def export_graph(slug: str, title: str, author: str) -> None:
    """Export a single graph to JSON."""
    pkl_path = GRAPHS_DIR / f"{slug}.pkl"
    out_path = JSON_DIR / f"{slug}.json"

    if not pkl_path.exists():
        print(f"[{slug}] ERROR: {pkl_path} not found. Run build_graphs.py first.")
        return

    with open(pkl_path, "rb") as f:
        g = pickle.load(f)

    # Build sorted vocabulary
    vocab = sorted(g.nodes())
    word_to_idx = {w: i for i, w in enumerate(vocab)}

    # Build edges with integer indices, sorted by weight descending
    edges = []
    for u, v, data in g.edges(data=True):
        weight = data.get("weight", 0.0)
        edges.append({
            "source": word_to_idx[u],
            "target": word_to_idx[v],
            "weight": round(weight, 5),
        })
    edges.sort(key=lambda e: e["weight"], reverse=True)

    doc = {
        "book": title,
        "author": author,
        "vocab": vocab,
        "edges": edges,
    }

    out_path.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(
        f"[{slug}] vocab={len(vocab):,} edges={len(edges):,} "
        f"size={size_mb:.1f}MB → {out_path}"
    )


def main() -> None:
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    for slug, (title, author) in BOOKS.items():
        export_graph(slug, title, author)

    print("\nDone. JSON files ready for the app.")


if __name__ == "__main__":
    main()
