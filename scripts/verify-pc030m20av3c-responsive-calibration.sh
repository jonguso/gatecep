#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV3C — Recovery & Wealth Journey Responsive Calibration"
node scripts/test-pc030m20av3c-responsive-calibration.mjs
echo
echo "Running Expo web bundle smoke test..."
rm -rf .av3c-web-smoke
npx expo export --platform web --output-dir .av3c-web-smoke >/tmp/pc030m20av3c-expo-export.log 2>&1 || { cat /tmp/pc030m20av3c-expo-export.log; rm -rf .av3c-web-smoke; exit 1; }
rm -rf .av3c-web-smoke
echo "PASS — Expo web bundle smoke test."
