#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A11 VERIFY — RECOVERY MATCH AUDIT ==="

fail=0

check() {
  local description="$1"
  shift

  if "$@" >/dev/null 2>&1; then
    echo "PASS: $description"
  else
    echo "FAIL: $description"
    fail=1
  fi
}

SERVICE="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
RECOVERY="mobile/app/real-order-recovery.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
POLICY="mobile/src/features/broker-sync/brokerExecutionEvidencePolicy.js"

echo
echo "=== AUDIT SERVICE ==="

check "A11 exports recovery match audit builder" \
  grep -q 'export function buildVerifiedEvidenceMatchAudit' "$SERVICE"

check "audit independently classifies evidence" \
  grep -q 'classifyBrokerExecutionEvidence(record)' "$SERVICE"

check "audit exposes verified status" \
  grep -q 'verified,' "$SERVICE"

check "audit exposes reference match" \
  grep -q 'referenceMatch' "$SERVICE"

check "audit exposes symbol match" \
  grep -q 'symbolMatch' "$SERVICE"

check "audit exposes side match" \
  grep -q 'sideMatch' "$SERVICE"

check "audit exposes quantity match" \
  grep -q 'quantityMatch' "$SERVICE"

check "audit exposes broker identity match" \
  grep -q 'brokerMatch' "$SERVICE"

check "audit exposes submission-window match" \
  grep -q 'submissionWindowMatch' "$SERVICE"

check "audit preserves broker-reference-only mode" \
  grep -q '"BROKER_REFERENCE"' "$SERVICE"

check "audit preserves strict identity/window mode" \
  grep -q '"STRICT_IDENTITY_WINDOW"' "$SERVICE"

check "audit reports unique verified match" \
  grep -q '"UNIQUE_VERIFIED_MATCH"' "$SERVICE"

check "audit reports ambiguous match" \
  grep -q '"AMBIGUOUS_VERIFIED_MATCH"' "$SERVICE"

check "audit reports no verified match" \
  grep -q '"NO_VERIFIED_MATCH"' "$SERVICE"

echo
echo "=== RECOVERY SCREEN ==="

check "recovery screen imports A11 audit" \
  grep -q 'buildVerifiedEvidenceMatchAudit' "$RECOVERY"

check "recovery screen reads verified transaction history" \
  grep -q 'userGetItem("transactionHistory")' "$RECOVERY"

check "recovery screen reads unverified transaction history for explainability" \
  grep -q 'userGetItem("unverifiedTransactionHistory")' "$RECOVERY"

check "recovery screen displays Recovery Match Audit" \
  grep -q 'Recovery Match Audit' "$RECOVERY"

check "recovery screen displays audit decision" \
  grep -q 'label="Decision"' "$RECOVERY"

check "recovery screen displays match mode" \
  grep -q 'label="Match Mode"' "$RECOVERY"

check "recovery screen displays qualifying match count" \
  grep -q 'label="Qualifying Matches"' "$RECOVERY"

check "recovery screen labels audit read-only" \
  grep -q 'Read-only comparison' "$RECOVERY"

echo
echo "=== SAFETY BOUNDARIES ==="

check "audit does not route broker orders" \
  sh -c "! grep -A180 'buildVerifiedEvidenceMatchAudit' '$SERVICE' | grep -Eq 'placeBrokerOrder|routeExecutionOrderByMode'"

check "audit does not update execution order" \
  sh -c "! grep -A180 'buildVerifiedEvidenceMatchAudit' '$SERVICE' | grep -q 'updateExecutionOrder('"

check "recovery screen does not call broker adapter" \
  sh -c "! grep -Eq 'placeBrokerOrder|routeExecutionOrderByMode' '$RECOVERY'"

check "recovery screen does not mutate REAL portfolio" \
  sh -c "! grep -Eq 'saveUnifiedPortfolio|replaceAuthoritativeBrokerPortfolio|canonicalPortfolioLedger|saveCanonicalRealPortfolioSnapshot' '$RECOVERY'"

check "manual REAL fill guard remains" \
  grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

check "REAL receipt guard remains" \
  grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"

check "completed execution policy remains" \
  grep -q 'COMPLETED_EXECUTION_STATUSES' "$POLICY"

check "non-executed status block remains" \
  grep -q 'NON_EXECUTED_STATUSES' "$POLICY"

echo
echo "=== REGRESSION ==="

if bash scripts/verify-pc031a10-verified-evidence-order-matching.sh \
  >/tmp/gatecep-pc031a11-a10.log 2>&1; then
  echo "PASS: PC-031A10 regression suite"
else
  echo "FAIL: PC-031A10 regression suite"
  cat /tmp/gatecep-pc031a11-a10.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$SERVICE" \
  "$RECOVERY" \
  "$STORE" \
  "$POLICY"
then
  echo "PASS: git diff --check"
else
  echo "FAIL: git diff --check"
  fail=1
fi

echo
echo "=== SAFETY ==="

echo -n "Branch: "
git branch --show-current

echo -n "gatecep-next vs main: "
git rev-list --left-right --count main...HEAD

echo -n "Push guard: "
test -x .git/hooks/pre-push && echo ACTIVE || echo NOT_ACTIVE

if [ "$fail" -ne 0 ]; then
  echo
  echo "PC-031A11 verification FAILED."
  exit 1
fi

echo
echo "PC-031A11 verification PASSED."
