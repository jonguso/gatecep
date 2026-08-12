#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B9A — BROKER SNAPSHOT LIFECYCLE RECOVERY"
echo "============================================================"

FILE="src/services/brokers/brokerPortfolioSync.js"

echo
echo "===== 1. BROKER SNAPSHOT IMPORT ====="

grep -n -A4 -B4 \
  'portfolioSnapshotTrigger' \
  "$FILE"

echo
echo "===== 2. BROKER SNAPSHOT COMMIT ====="

grep -n -A12 -B12 \
  'reason: "BROKER_PORTFOLIO_SYNC"' \
  "$FILE"

echo
echo "===== 3. STRICT BROKER TRIGGER ASSERTION ====="

python - <<'PY'
from pathlib import Path

p = Path(
    "src/services/brokers/brokerPortfolioSync.js"
)

text = p.read_text(
    encoding="utf-8"
)

required = [
    "refreshCanonicalRealPortfolioSnapshot",
    'reason: "BROKER_PORTFOLIO_SYNC"',
    '../portfolio/portfolioSnapshotTrigger'
]

missing = [
    item
    for item in required
    if item not in text
]

if missing:
    print(
        "ERROR — broker lifecycle trigger incomplete:",
        missing
    )
    raise SystemExit(1)

source_only = (
    'source: "BROKER_PORTFOLIO_SYNC"'
    in text
)

reason_present = (
    'reason: "BROKER_PORTFOLIO_SYNC"'
    in text
)

print(
    "Holding source marker:",
    source_only
)

print(
    "Lifecycle reason marker:",
    reason_present
)

assert reason_present

print(
    "PASS — broker sync has an actual snapshot lifecycle trigger."
)
PY

echo
echo "===== 4. ALL REQUIRED LIFECYCLE REASONS ====="

python - <<'PY'
from pathlib import Path

checks = {
    "PERFORMANCE_OPEN":
        Path("app/performance.js"),

    "MANUAL_PORTFOLIO_ENTRY":
        Path("app/manual-portfolio-entry.js"),

    "CONFIRMED_PORTFOLIO_IMPORT":
        Path("app/review-portfolio-import.js"),

    "CASH_STATEMENT_UPDATE":
        Path("app/(tabs)/funds.js"),

    "TRADE_COMMIT":
        Path("app/trade.js"),

    "BASKET_TRADE_COMMIT":
        Path("app/trade.js"),

    "BROKER_PORTFOLIO_SYNC":
        Path(
            "src/services/brokers/"
            "brokerPortfolioSync.js"
        )
}

for reason, path in checks.items():

    text = path.read_text(
        encoding="utf-8"
    )

    expected = (
        f'reason: "{reason}"'
        if reason != "PERFORMANCE_OPEN"
        else
        'triggerReason: "PERFORMANCE_OPEN"'
    )

    if expected not in text:
        print(
            f"FAIL {reason} — {path}"
        )
        raise SystemExit(1)

    print(
        f"PASS {reason}"
    )

print()
print(
    "PASS — all seven lifecycle boundaries are explicit."
)
PY

echo
echo "===== 5. LOW-LEVEL STORE MUST REMAIN CLEAN ====="

if grep -q \
  'refreshCanonicalRealPortfolioSnapshot' \
  src/services/portfolio/portfolioStore.js
then
  echo "ERROR — low-level portfolioStore creates snapshots."
  exit 1
fi

echo "PASS — portfolioStore remains snapshot-independent."

echo
echo "===== 6. REAL BROKER RECONCILIATION BOUNDARY ====="

if grep -q -E \
  'savePracticePortfolio|practicePortfolio' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js \
  src/features/broker-sync/brokerReconciliationService.js
then
  echo "ERROR — active broker reconciliation still depends on Practice."
  exit 1
fi

grep -q 'saveCanonicalRealBrokerPortfolio' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js
grep -q 'refreshCanonicalRealPortfolioSnapshot' \
  src/features/broker-sync/canonicalRealBrokerPortfolioService.js
echo "PASS — broker reconciliation mutates REAL only after approval."

echo
echo "===== 7. BACKUPS INSIDE APP ====="

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
echo "===== 8. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 9. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2B9A verification complete."
echo "============================================================"
