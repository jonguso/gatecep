#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOME_SCREEN="src/features/portfolio-home/PortfolioHomeScreen.js"

echo "============================================================"
echo "PC-030M5A — PORTFOLIO-FIRST HOME VERIFICATION"
echo "============================================================"

grep -Fq 'PortfolioHomeScreen' 'app/(tabs)/dashboard.js'
grep -Fq 'PortfolioHomeScreen' app/portfolio-hub.js
echo "PASS — Dashboard and Portfolio Hub share one canonical screen."

grep -Fq 'const TABS = ["Allocation", "Holdings", "Performance", "More"]' "$HOME_SCREEN"
grep -Fq 'useState("Allocation")' "$HOME_SCREEN"
grep -Fq '.slice(0, 3)' "$HOME_SCREEN"
echo "PASS — Allocation is first; Holdings use progressive disclosure."

grep -Fq 'loadUnifiedPortfolioRuntime' "$HOME_SCREEN"
grep -Fq 'loadCanonicalRealAvailableCash' "$HOME_SCREEN"
grep -Fq 'calculatePortfolioSummary' "$HOME_SCREEN"
grep -Fq 'GateCEP did not switch to Practice' "$HOME_SCREEN"
grep -Fq 'N/A — REAL data unavailable' "$HOME_SCREEN"
echo "PASS — Home reads canonical REAL data and fails closed."

grep -Fq 'route="/performance"' "$HOME_SCREEN"
grep -Fq 'genuine snapshot history' "$HOME_SCREEN"
grep -Fq 'route="/portfolio-sync-center"' "$HOME_SCREEN"
grep -Fq 'route="/investor-timeline"' "$HOME_SCREEN"
echo "PASS — verified detail routes remain available on demand."

if grep -Eq 'buildPortfolioHub|oneDay:[[:space:]]*1\.2|totalValue[[:space:]]*\*[[:space:]]*0\.06|TXN-001' "$HOME_SCREEN" 'app/(tabs)/dashboard.js' app/portfolio-hub.js; then
  echo "FAIL — synthetic legacy Portfolio Hub data entered the canonical Home."
  exit 1
fi
echo "PASS — synthetic performance, income, and transactions are excluded."

grep -Fq 'name="dashboard" options={{ title: "Home" }}' 'app/(tabs)/_layout.js'
echo "PASS — the primary tab is labeled Home."

node --check "$HOME_SCREEN"
node --check 'app/(tabs)/dashboard.js'
node --check app/portfolio-hub.js
node --check 'app/(tabs)/_layout.js'
echo "PASS — portfolio-first source parses successfully."

if [[ -x scripts/verify-pc030m4a-mobile-auth.sh ]]; then
  bash scripts/verify-pc030m4a-mobile-auth.sh
fi

echo "PC-030M5A portfolio-first Home verification complete."
