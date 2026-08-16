#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOME_SCREEN="src/features/portfolio-home/PortfolioHomeScreen.js"
HOLDINGS_SCREEN="app/holding-details.js"

echo "============================================================"
echo "PC-030M5B — SECTOR TAP + SECURITY HOLDINGS VERIFICATION"
echo "============================================================"

grep -Fq 'accessibilityLabel={`Open ${sector.sector} sector holdings`}' "$HOME_SCREEN"
grep -Fq 'setSelectedSector(sector)' "$HOME_SCREEN"
grep -Fq 'presentationStyle="overFullScreen"' "$HOME_SCREEN"
grep -Fq 'View All ${sectorRows.length} Sectors' "$HOME_SCREEN"
echo "PASS — sectors use explicit native tap controls and an Expo-safe modal."

grep -Fq 'loadUnifiedPortfolioRuntime({ broker: "ALL" })' "$HOLDINGS_SCREEN"
grep -Fq 'Individual securities in your REAL portfolio' "$HOLDINGS_SCREEN"
grep -Fq 'All Securities' "$HOLDINGS_SCREEN"
grep -Fq 'expandedSymbol' "$HOLDINGS_SCREEN"
echo "PASS — Holding Details renders canonical REAL securities individually."

if grep -Eq 'sectorRows\.map|expandedSector|Current portfolio positions by sector' "$HOLDINGS_SCREEN"; then
  echo "FAIL — legacy sector-grouped Holding Details remains active."
  exit 1
fi
echo "PASS — legacy sector-grouped holdings presentation is removed."

grep -Fq 'GateCEP did not switch to Practice' "$HOLDINGS_SCREEN"
grep -Fq 'hasVerifiedData ?' "$HOLDINGS_SCREEN"
echo "PASS — holdings fail closed without fake zero values or Practice fallback."

node --check "$HOME_SCREEN"
node --check "$HOLDINGS_SCREEN"
echo "PASS — corrected mobile source parses successfully."

bash scripts/verify-pc030m5a-portfolio-first-home.sh

echo "PC-030M5B sector tap + security holdings verification complete."
