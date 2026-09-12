#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3T — Practice Queue Manager Responsive Calibration"
node scripts/test-pc030m20av3t-responsive-calibration.mjs

echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3t-web-smoke
LOG="${TMPDIR:-/tmp}/pc030m20av3t-expo-export.log"
if ! npx expo export --platform web --output-dir .av3t-web-smoke >"$LOG" 2>&1; then
  cat "$LOG"
  rm -rf .av3t-web-smoke
  exit 1
fi
rm -rf .av3t-web-smoke
echo "PASS — Expo web bundle smoke test."
