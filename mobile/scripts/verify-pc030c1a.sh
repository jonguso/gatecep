#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== DECLARATIVE COMPATIBILITY REDIRECTS ====="

for f in \
  app/portfolio-command-center.js \
  app/portfolio-analysis.js \
  app/coach-dashboard.js
do
  echo
  echo "--- $f ---"

  grep -n \
    'Redirect\|href=' \
    "$f"
done

echo
echo "===== NO EFFECT-BASED REDIRECTS ====="

if grep -nE \
  'useEffect|router\.replace' \
  app/portfolio-command-center.js \
  app/portfolio-analysis.js \
  app/coach-dashboard.js
then
  echo
  echo "ERROR: imperative compatibility navigation remains."
  exit 1
else
  echo "PASS — compatibility redirects are declarative."
fi

echo
echo "===== DASHBOARD PORTFOLIO DESTINATIONS ====="

grep -n -A4 -B3 \
  'title="Live Investing"\|title="Portfolio Analytics"' \
  app/'(tabs)'/dashboard.js

echo
echo "===== LIVE DASHBOARD DESTINATIONS ====="

grep -n -A8 -B3 \
  'Portfolio Analytics' \
  app/live-dashboard.js

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

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
echo "PC-030C1A verification complete."
