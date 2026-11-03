#!/usr/bin/env bash
# scripts/download_data.sh
# -------------------------------------------------
# Download large dataset / model assets listed in data/manifest.json
# -------------------------------------------------
# Requires: jq, curl
set -euo pipefail

# Directory containing this script's parent (project root)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$PROJECT_ROOT/data/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest file not found: $MANIFEST"
  exit 1
fi

# Ensure target directory exists
mkdir -p "$PROJECT_ROOT/data"

# Iterate over each entry in the JSON manifest: "filename" "url"
jq -r 'to_entries[] | "\(.key) \(.value)"' "$MANIFEST" | while read -r name url; do
  echo "Downloading $name -> $PROJECT_ROOT/data/$name"
  curl -L -o "$PROJECT_ROOT/data/$name" "$url"
done

echo "All files downloaded successfully."

