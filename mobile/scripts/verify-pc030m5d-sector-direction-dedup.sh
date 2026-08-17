#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOME_SCREEN="src/features/portfolio-home/PortfolioHomeScreen.js"

echo "============================================================"
echo "PC-030M5D — SECTOR DIRECTION + UI DEDUPLICATION"
echo "============================================================"

grep -Fq 'current.investedValue +=' "$HOME_SCREEN"
grep -Fq 'current.profitLoss +=' "$HOME_SCREEN"
grep -Fq 'profitLossPct:' "$HOME_SCREEN"
echo "PASS — sector direction is derived from aggregated REAL cost and value."

grep -Fq 'direction === "up" ? "▲"' "$HOME_SCREEN"
grep -Fq 'direction === "down" ? "▼"' "$HOME_SCREEN"
grep -Fq 'styles.sectorFlat' "$HOME_SCREEN"
grep -Fq 'return unavailable' "$HOME_SCREEN"
echo "PASS — gain, loss, flat, and unavailable states are explicit."

if grep -Fq '<Tool label="Holdings Detail" route="/holding-details"' "$HOME_SCREEN"; then
  echo "FAIL — duplicate Holdings Detail remains in More."
  exit 1
fi
grep -Fq 'View All ${summary.holdingsCount' "$HOME_SCREEN"
echo "PASS — Holdings owns the security-list route; duplicate More link is removed."

node --check "$HOME_SCREEN"
echo "PASS — sector direction source parses successfully."

bash scripts/verify-pc030m5c-interactive-allocation.sh

echo "PC-030M5D sector direction + UI deduplication complete."
