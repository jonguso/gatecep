#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV3B2 — Goal Scenario Planner Syntax Hotfix"
node scripts/test-pc030m20av3b2-goal-planner-syntax-hotfix.mjs
echo
echo "Running Expo web bundle smoke test..."
npx expo export --platform web --output-dir .av3b2-web-smoke >/tmp/pc030m20av3b2-expo-export.log 2>&1 || {
  cat /tmp/pc030m20av3b2-expo-export.log
  rm -rf .av3b2-web-smoke
  exit 1
}
rm -rf .av3b2-web-smoke
echo "PASS — Expo web bundle syntax smoke test."
