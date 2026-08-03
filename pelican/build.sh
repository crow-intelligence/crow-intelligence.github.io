#!/usr/bin/env bash
# Build the Pelican site and link existing project assets into output/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT="$REPO_ROOT/output"

# Build
cd "$SCRIPT_DIR"
pelican content -s pelicanconf.py -o "$OUTPUT"

# Link project subdirectories into output (mirrors deploy workflow)
for dir in "$REPO_ROOT"/projects/*/; do
    dirname=$(basename "$dir")
    link="$OUTPUT/$dirname"
    if [ ! -e "$link" ]; then
        ln -s "$dir" "$link"
        echo "  linked projects/$dirname/"
    fi
done

# Link root-level asset directories
for dir in logos aporia; do
    target="$REPO_ROOT/$dir"
    link="$OUTPUT/$dir"
    if [ -d "$target" ] && [ ! -e "$link" ]; then
        ln -s "$target" "$link"
        echo "  linked $dir/"
    fi
done

# Link standalone root-level files that the deploy workflow copies. consent.js
# is needed locally too, otherwise the cookie banner 404s during local testing.
for file in consent.js; do
    target="$REPO_ROOT/$file"
    link="$OUTPUT/$file"
    if [ -f "$target" ] && [ ! -e "$link" ]; then
        ln -s "$target" "$link"
        echo "  linked $file"
    fi
done

echo "Build complete → $OUTPUT"
