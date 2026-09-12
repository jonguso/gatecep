#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3R2 — Investor Alert Review Syntax Hotfix"
node scripts/test-pc030m20av3r2-syntax-hotfix.mjs

echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3r2-web-smoke
LOG="${TMPDIR:-/tmp}/pc030m20av3r2-expo-export.log"
if ! npx expo export --platform web --output-dir .av3r2-web-smoke >"$LOG" 2>&1; then
  cat "$LOG"
  rm -rf .av3r2-web-smoke
  exit 1
fi
rm -rf .av3r2-web-smoke
echo "PASS — Expo web bundle smoke test."
