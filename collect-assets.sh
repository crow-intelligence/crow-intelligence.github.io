#!/usr/bin/env bash
#
# Stage the site's graphics into visualization-assets/ for the downloads /
# merchandise pipeline.
#
# Sources are only ever read. Each asset is copied to a destination that mirrors
# its source path, so the ~28 repeated basenames across microsites (social-preview.png,
# punctuation_spiral.png, og.png, ...) cannot overwrite one another.
#
# Excluded as chrome: */legend/ (per-feature QGIS swatches, 16x16) and */css/images/
# (third-party Leaflet UI sprites). Neither is artwork.
#
# The output directory is gitignored — it is a local staging area, not a tracked
# duplicate of 68 MB the repo already holds.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_NAME="visualization-assets"
DEST="$REPO_ROOT/$DEST_NAME"

cd "$REPO_ROOT"

# Guard the rm: only ever remove the expected path inside the repo.
if [ -e "$DEST" ]; then
  case "$DEST" in
    "$REPO_ROOT/$DEST_NAME") rm -rf "$DEST" ;;
    *) echo "refusing to remove unexpected path: $DEST" >&2; exit 1 ;;
  esac
fi
mkdir -p "$DEST"

# All seven requested extensions stay in the pattern even though .pdf/.eps/.webp
# currently match nothing — this keeps working if such a file is added later.
find_assets() {
  find . \
    \( -path ./.git -o -name node_modules -o -name .venv -o -name dist \
       -o -name build -o -name .next -o -path ./output \
       -o -path "./$DEST_NAME" \) -prune -o \
    -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
               -o -iname '*.svg' -o -iname '*.pdf' -o -iname '*.eps' \
               -o -iname '*.webp' \) -print0
}

total=0
excluded=0

while IFS= read -r -d '' src; do
  rel="${src#./}"
  case "$rel" in
    */legend/*|*/css/images/*) excluded=$((excluded + 1)); continue ;;
  esac
  mkdir -p "$DEST/$(dirname "$rel")"
  cp -p "$src" "$DEST/$rel"
  total=$((total + 1))
done < <(find_assets)

# ---- summary -----------------------------------------------------------------

echo
echo "Collected into $DEST_NAME/"
echo

# Categorized listing: group by top-level bucket, count each.
find "$DEST" -type f -printf '%P\n' | awk -F/ '
  { bucket = (NF > 1 ? $1 : "(root)"); count[bucket]++ }
  END { for (b in count) printf "  %-12s %4d files\n", b, count[b] }
' | sort

size=$(du -sh "$DEST" | cut -f1)

echo "  ────────────────────────────"
printf '  %-12s %4d files, %s\n' "TOTAL" "$total" "$size"
echo
echo "  Excluded as chrome (legend swatches / Leaflet sprites): $excluded files"
echo

# Full categorized path list.
find "$DEST" -type f -printf '%P\n' | sort | sed 's|^|  |'
