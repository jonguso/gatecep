#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B7B — PERFORMANCE HISTORICAL INTEGRITY"
echo "============================================================"

echo
echo "===== CURRENT HEALTH SOURCE ====="

grep -nE \
  'buildPortfolioHealthScore|currentHealth' \
  app/performance.js

echo
echo "===== HISTORICAL COMPARISON ====="

grep -n -A45 -B5 \
  'hasHistoricalComparison' \
  app/performance.js

echo
echo "===== HISTORICAL UI ====="

grep -n -A24 -B4 \
  'Change Since First Snapshot' \
  app/performance.js

echo
echo "===== CURRENT HEALTH UI ====="

grep -n -A22 -B4 \
  'label="Health Score"' \
  app/performance.js

echo
echo "===== ZERO FALLBACK SAFEGUARDS ====="

if grep -nF \
  'metrics.latest.healthScore || 0' \
  app/performance.js
then
  echo
  echo "ERROR — current Health Score invents zero."
  exit 1
else
  echo "PASS — current Health Score does not invent zero."
fi

if grep -nE \
  's\.healthScore[[:space:]]*\|\|[[:space:]]*0' \
  app/performance.js
then
  echo
  echo "ERROR — snapshot Health invents zero."
  exit 1
else
  echo "PASS — snapshot Health does not invent zero."
fi

echo
echo "===== CURRENT FINANCIAL CONTRACT ====="

grep -n -A45 -B3 \
  'label="Holdings Market Value"' \
  app/performance.js

echo
echo "===== NAVIGATION ====="

grep -nE \
  'unified-portfolio-analytics|Back to Portfolio Analytics' \
  app/performance.js

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(
  find app \
    -type f \
    -iname '*bak*' \
    | wc -l
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname '*bak*'
  exit 1
fi

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2B7B verification complete."
echo "============================================================"
