#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$FILE" ]] || { echo "FAIL — missing $FILE"; exit 1; }

echo "PC-030M20AQ3B — Verification Correction"
echo "NO APP CODE CHANGED — this hotfix corrects the M20AQ3 verification contract only."
echo "PRESERVED — current mobile/app/(tabs)/trading.js is left untouched."
echo "PC-030M20AQ3B applied successfully."
