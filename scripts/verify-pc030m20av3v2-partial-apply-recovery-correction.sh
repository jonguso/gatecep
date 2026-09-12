#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3V2 — AV3V Partial-Apply Recovery Correction"
node scripts/test-pc030m20av3v-responsive-calibration.mjs

echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3v2-web-smoke
LOG="${TMPDIR:-/tmp}/pc030m20av3v2-expo-export.log"
if ! npx expo export --platform web --output-dir .av3v2-web-smoke >"$LOG" 2>&1; then
  cat "$LOG"
  rm -rf .av3v2-web-smoke
  exit 1
fi
rm -rf .av3v2-web-smoke
echo "PASS — Expo web bundle smoke test."
