#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030C2B8 — CANONICAL SNAPSHOT IMPORT-BOUNDARY CLEANUP"
echo "============================================================"

grep -q \
  'from "../src/services/portfolio/portfolioSnapshot"' \
  app/performance.js

grep -q \
  'from "../../services/portfolio/portfolioSnapshot"' \
  src/features/performance/historicalPerformanceSummaryService.js

echo "PASS — both Performance readers use the canonical service."

test -f src/portfolio/portfolioSnapshot.js
grep -q \
  'export \* from "../services/portfolio/portfolioSnapshot.js"' \
  src/portfolio/portfolioSnapshot.js

echo "PASS — legacy wrapper remains as a compatibility re-export."

if grep -En \
  'src/portfolio/portfolioSnapshot|\.\./\.\./portfolio/portfolioSnapshot' \
  app/performance.js \
  src/features/performance/historicalPerformanceSummaryService.js
then
  echo "FAIL — a known Performance reader still uses the wrapper."
  exit 1
fi

node --check \
  src/services/portfolio/portfolioSnapshot.js

node --check \
  src/features/performance/historicalPerformanceSummaryService.js

python scripts/audit-pc029c-visible-routes.py

echo "PC-030C2B8 import-boundary cleanup verification complete."
