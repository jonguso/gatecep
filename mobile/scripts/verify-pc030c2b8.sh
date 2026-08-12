#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B8 — CANONICAL SNAPSHOT VERIFICATION"
echo "============================================================"

echo
echo "===== V2 SNAPSHOT CONTRACT ====="

grep -nE \
  'SNAPSHOT_VERSION|snapshotVersion:|snapshotAt:|sourceType:|sourceId:|sourceLabel:|netWorth|holdingsValue|investedValue|availableCash|unrealizedGainLoss|unrealizedGainLossPct|holdingsCount|healthScore|healthRating' \
  src/services/portfolio/portfolioSnapshot.js \
  | head -n 220

echo
echo "===== CANONICAL SNAPSHOT WRITER ====="

grep -n -A150 -B10 \
  'export async function saveCanonicalRealPortfolioSnapshot' \
  src/services/portfolio/portfolioSnapshot.js \
  | head -n 220

echo
echo "===== REAL SOURCE SAFEGUARDS ====="

grep -n -A18 -B5 \
  'practiceIncluded:' \
  src/services/portfolio/portfolioSnapshot.js

echo
echo "===== FINANCIAL EQUATION ====="

grep -n \
  'NET_WORTH = HOLDINGS_MARKET_VALUE + AVAILABLE_CASH' \
  src/services/portfolio/portfolioSnapshot.js

echo
echo "===== LEGACY COMPATIBILITY ====="

grep -nE \
  'normalizePortfolioSnapshot|currentValue:|cash:|totalValue:|netGainLoss:|gainLossPct:' \
  src/services/portfolio/portfolioSnapshot.js \
  | head -n 180

echo
echo "===== PERFORMANCE SNAPSHOT CAPTURE ====="

grep -n -A20 -B8 \
  'saveCanonicalRealPortfolioSnapshot' \
  app/performance.js

echo
echo "===== PERFORMANCE SNAPSHOT HISTORY ====="

grep -n -A38 -B8 \
  'Snapshot History' \
  app/performance.js

echo
echo "===== SNAPSHOT WRITER ACTIVE CALLERS ====="

grep -Rni \
  'saveCanonicalRealPortfolioSnapshot' \
  app src \
  --include="*.js" \
  --include="*.jsx"

echo
echo "===== FAKE HEALTH ZERO SAFEGUARDS ====="

if grep -nF \
  'healthScore: Number(healthScore || 0)' \
  src/services/portfolio/portfolioSnapshot.js
then
  echo
  echo "ERROR — snapshot writer still invents zero health."
  exit 1
else
  echo "PASS — snapshot health does not invent zero."
fi

echo
echo "===== PRACTICE EXCLUSION ====="

if grep -n \
  'loadInvestorContext' \
  src/services/portfolio/portfolioSnapshot.js
then
  echo
  echo "ERROR — snapshot service loads Investor Context / Practice."
  exit 1
else
  echo "PASS — canonical snapshot writer does not load Practice Portfolio."
fi

echo
echo "===== V2 REQUIRED FIELDS ====="

python - <<'PY'
from pathlib import Path

path = Path(
    "src/services/portfolio/portfolioSnapshot.js"
)

text = path.read_text(
    encoding="utf-8"
)

required = [
    "snapshotVersion:",
    "snapshotAt:",
    "sourceType:",
    "sourceId:",
    "sourceLabel:",
    "netWorth,",
    "holdingsValue,",
    "investedValue,",
    "availableCash,",
    "unrealizedGainLoss,",
    "unrealizedGainLossPct,",
    "holdingsCount:",
    "healthScore,",
    "healthRating,"
]

missing = [
    item
    for item in required
    if item not in text
]

if missing:
    print(
        "ERROR missing V2 fields:",
        missing
    )

    raise SystemExit(1)

print(
    "PASS — canonical V2 snapshot fields are present."
)
PY

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
echo "PC-030C2B8 verification complete."
echo "============================================================"
