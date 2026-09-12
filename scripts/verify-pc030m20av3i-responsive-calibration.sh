#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3I — Remaining Utility Responsive Calibration"
node scripts/test-pc030m20av3i-responsive-calibration.mjs

echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3i-web-smoke
LOG="${TMPDIR:-/tmp}/pc030m20av3i-expo-export.log"
if ! npx expo export --platform web --output-dir .av3i-web-smoke >"$LOG" 2>&1; then
  cat "$LOG"
  rm -rf .av3i-web-smoke
  exit 1
fi
rm -rf .av3i-web-smoke
echo "PASS — Expo web bundle smoke test."
