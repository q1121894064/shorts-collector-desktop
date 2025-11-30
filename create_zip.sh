#!/bin/bash
# Usage: run in project root. Creates shorts-collector-desktop.zip
set -e
OUT=shorts-collector-desktop.zip
echo "Creating zip $OUT ..."
rm -f "$OUT"
zip -r "$OUT" . -x "*.git*" "node_modules/*" "dist/*"
echo "Created $OUT"
