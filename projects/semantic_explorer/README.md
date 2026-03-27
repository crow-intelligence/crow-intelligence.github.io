# Semantic Explorer

Interactive semantic network explorer built on kenon graphs. Type a seed word,
see its ego network in a chosen book, and expand the graph by clicking neighbours.

## How to run

```bash
# From the kenon root:
uv sync --dev

# Step 1: data prep (once)
uv run python experiments/semantic_explorer/scripts/download_books.py
uv run python experiments/semantic_explorer/scripts/build_graphs.py
uv run python experiments/semantic_explorer/scripts/export_json.py
uv run python experiments/semantic_explorer/scripts/download_norms.py

# Step 2: serve locally
cd experiments/semantic_explorer/app
python -m http.server 8080
# Open: http://localhost:8080
```
