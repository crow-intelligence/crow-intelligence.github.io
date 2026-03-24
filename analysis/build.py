"""Inline dashboard_data.json into index.html to produce a self-contained page."""

import json
from pathlib import Path


HERE = Path(__file__).parent

with open(HERE / "dashboard_data.json") as f:
    data = json.dumps(json.load(f), separators=(",", ":"))

html = (HERE / "index.html").read_text()
html = html.replace("__DATA_PLACEHOLDER__", data)

out = HERE / "dashboard.html"
out.write_text(html)
print(f"Built {out}  ({out.stat().st_size / 1024:.0f} KB)")
