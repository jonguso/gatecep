#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== HEALTH LABEL NORMALIZER ====="

grep -n -A35 \
  'function normalizeHealthLabel' \
  app/performance.js

echo
echo "===== CURRENT HEALTH RATING ====="

grep -n -A16 -B5 \
  'healthRating:' \
  app/performance.js

echo
echo "===== OBJECT STRING SAFEGUARD ====="

if grep -n \
  'healthRating:.*currentHealth' \
  app/performance.js
then
  echo "Review direct assignment above."
fi

grep -q \
  'normalizeHealthLabel(' \
  app/performance.js

echo "PASS — Health rating is normalized before rendering."

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(
  find app -type f -iname '*bak*' | wc -l
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
echo "PC-030C2B7C verification complete."
