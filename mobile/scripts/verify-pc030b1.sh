#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== CANONICAL COACH STORAGE ====="

grep -n \
  'transactionsUploaded\|transactionHistory\|recommendationHistory\|saveRecommendationRecord\|RECOMMENDATION_STATUS' \
  app/'(tabs)'/coach.js \
  | head -n 100

echo
echo "===== LEGACY COACH STORAGE MUST BE GONE ====="

if grep -nE \
  'gatecepTransactionsUploaded|gatecepTransactionHistory|gatecepRecommendationHistory|AsyncStorage' \
  app/'(tabs)'/coach.js
then
  echo
  echo "ERROR: legacy Coach G storage remains."
  exit 1
else
  echo "PASS — canonical Coach G no longer uses legacy gatecep* AsyncStorage keys."
fi

echo
echo "===== RECOMMENDATION WORKSPACE ENTRY ====="

grep -n -A3 -B2 \
  'Recommendation Workspace' \
  app/'(tabs)'/coach.js

echo
echo "===== SPECIALIZED WORKSPACE TITLE ====="

grep -n \
  'Coach G Recommendation Workspace\|Recommendation & Execution Review' \
  app/coach-insights.js

echo
echo "===== WORKSPACE RETURN TO COACH G ====="

grep -n -A8 -B4 \
  'router.replace("/(tabs)/coach")' \
  app/coach-insights.js

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(find app -type f -iname '*bak*' | wc -l)"
echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname '*bak*'
  exit 1
fi

echo
echo "PC-030B1 verification complete."
