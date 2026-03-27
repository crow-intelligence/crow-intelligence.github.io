"""Export Nelson free association norms to JSON for the browser app.

Reads the norms CSV from the google_and_the_mind experiment (already downloaded)
or from the raw free_association.txt in that experiment's data directory.
"""

import json
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
KENON_ROOT = BASE_DIR.parent.parent
JSON_DIR = BASE_DIR / "data" / "json"

# Try multiple possible locations for the norms data
NORMS_PATHS = [
    KENON_ROOT / "experiments" / "google_and_the_mind" / "data" / "norms.csv",
    KENON_ROOT / "experiments" / "google_and_the_mind" / "data" / "free_association.txt",
]


def load_norms() -> pd.DataFrame:
    """Load norms from whichever file exists."""
    for path in NORMS_PATHS:
        if not path.exists():
            continue

        if path.suffix == ".csv" and path.stem == "norms":
            # Already cleaned CSV from the google_and_the_mind scripts
            df = pd.read_csv(path)
            if "cue" in df.columns and "target" in df.columns and "fsg" in df.columns:
                return df

        # Raw free_association.txt — parse it
        try:
            df = pd.read_csv(path, sep=",")
        except Exception:
            df = pd.read_csv(path, sep="\t")

        # Normalise column names
        df.columns = [c.strip().lower() for c in df.columns]

        # Identify cue/target/fsg columns
        if "cue" in df.columns and "target" in df.columns and "fsg" in df.columns:
            df["cue"] = df["cue"].astype(str).str.strip().str.lower()
            df["target"] = df["target"].astype(str).str.strip().str.lower()
            df["fsg"] = pd.to_numeric(df["fsg"], errors="coerce")
            df = df[df["fsg"] > 0].dropna(subset=["fsg"])
            return df[["cue", "target", "fsg"]]

    print("[norms] ERROR: Could not find norms data.")
    print("[norms] Expected one of:")
    for p in NORMS_PATHS:
        print(f"  {p}")
    print("[norms] Run the google_and_the_mind download_data.py first,")
    print("[norms] or place free_association.txt in the data directory.")
    sys.exit(1)


def main() -> None:
    JSON_DIR.mkdir(parents=True, exist_ok=True)

    print("[norms] Loading Nelson free association norms...")
    df = load_norms()
    print(f"[norms] {len(df):,} associations loaded")

    # Drop any rows with NaN cue/target, ensure strings
    df = df.dropna(subset=["cue", "target"])
    df["cue"] = df["cue"].astype(str).str.strip().str.lower()
    df["target"] = df["target"].astype(str).str.strip().str.lower()
    df = df[df["cue"].str.len() > 0]
    df = df[df["target"].str.len() > 0]

    # Build vocabulary from all unique cues and targets
    all_words = sorted(set(df["cue"].tolist() + df["target"].tolist()))
    word_to_idx = {w: i for i, w in enumerate(all_words)}

    # Build edges
    edges = []
    for _, row in df.iterrows():
        cue = row["cue"]
        target = row["target"]
        if cue in word_to_idx and target in word_to_idx:
            edges.append({
                "source": word_to_idx[cue],
                "target": word_to_idx[target],
                "weight": round(float(row["fsg"]), 5),
            })

    edges.sort(key=lambda e: e["weight"], reverse=True)

    doc = {
        "book": "USF Free Association Norms",
        "author": "Nelson, McEvoy & Schreiber (2004)",
        "vocab": all_words,
        "edges": edges,
    }

    out_path = JSON_DIR / "nelson_norms.json"
    out_path.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(
        f"[norms] vocab={len(all_words):,} edges={len(edges):,} "
        f"size={size_mb:.1f}MB → {out_path}"
    )


if __name__ == "__main__":
    main()
