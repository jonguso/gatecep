#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3M1 — AV3M Verifier Route-Formatting Correction"
node scripts/test-pc030m20av3m-responsive-calibration.mjs

echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3m1-web-smoke
LOG="${TMPDIR:-/tmp}/pc030m20av3m1-expo-export.log"
if ! npx expo export --platform web --output-dir .av3m1-web-smoke >"$LOG" 2>&1; then
  cat "$LOG"
  rm -rf .av3m1-web-smoke
  exit 1
fi
rm -rf .av3m1-web-smoke
echo "PASS — Expo web bundle smoke test."
