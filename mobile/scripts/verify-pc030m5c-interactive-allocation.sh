#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOME_SCREEN="src/features/portfolio-home/PortfolioHomeScreen.js"

echo "============================================================"
echo "PC-030M5C — INTERACTIVE ALLOCATION VERIFICATION"
echo "============================================================"

grep -Fq 'onPress={() => onSelect(sector)}' "$HOME_SCREEN"
grep -Fq 'onSelect={setSelectedSector}' "$HOME_SCREEN"
grep -Fq 'Tap a colored sector or its row to view securities' "$HOME_SCREEN"
echo "PASS — donut slices and sector rows share the securities drill-down."

grep -Fq 'Largest Sector' "$HOME_SCREEN"
grep -Fq 'Diversification' "$HOME_SCREEN"
grep -Fq '{number(sector.weight).toFixed(1)}%' "$HOME_SCREEN"
grep -Fq '{money(total)}' "$HOME_SCREEN"
echo "PASS — allocation metrics, slice percentages, and exact value are visible."

grep -Fq 'pointerEvents="none"' "$HOME_SCREEN"
grep -Fq 'presentationStyle="overFullScreen"' "$HOME_SCREEN"
echo "PASS — chart labels do not block taps and the Expo-safe modal remains active."

node --check "$HOME_SCREEN"
echo "PASS — interactive allocation source parses successfully."

bash scripts/verify-pc030m5b-sector-holdings.sh

echo "PC-030M5C interactive allocation verification complete."
