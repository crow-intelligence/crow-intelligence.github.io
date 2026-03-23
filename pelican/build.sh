#!/usr/bin/env bash
# Build the Pelican site and link existing project assets into output/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT="$REPO_ROOT/output"

# Build
cd "$SCRIPT_DIR"
pelican content -s pelicanconf.py -o "$OUTPUT"

# Link existing asset folders into output
ASSET_DIRS=(portraits site dashboard dashboard_portraits web)
for dir in "${ASSET_DIRS[@]}"; do
    target="$REPO_ROOT/$dir"
    link="$OUTPUT/$dir"
    if [ -d "$target" ] && [ ! -e "$link" ]; then
        ln -s "$target" "$link"
        echo "  linked $dir/"
    fi
done

echo "Build complete → $OUTPUT"
