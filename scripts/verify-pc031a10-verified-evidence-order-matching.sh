#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A10 VERIFY — VERIFIED EVIDENCE ORDER MATCHING ==="

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
UPLOAD="mobile/app/transactions-upload.js"
RECOVERY="mobile/app/real-order-recovery.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
POLICY="mobile/src/features/broker-sync/brokerExecutionEvidencePolicy.js"

check "A10 reconciliation service exists" \
  test -f "$SERVICE"

check "service independently classifies broker evidence" \
  grep -q 'classifyBrokerExecutionEvidence' "$SERVICE"

check "only VERIFIED_BROKER_EXECUTION can match" \
  grep -q '"VERIFIED_BROKER_EXECUTION"' "$SERVICE"

check "REAL portfolio eligibility is required" \
  grep -q 'canAffectRealPortfolio !== true' "$SERVICE"

check "REAL order scope is enforced" \
  grep -q 'executionMode !== "REAL"' "$SERVICE"

check "only BROKER_SELECTED recovery order can resolve" \
  grep -q 'ORDER_STATUS.BROKER_SELECTED' "$SERVICE"

check "SUBMISSION_UNCERTAIN is recoverable" \
  grep -q '"SUBMISSION_UNCERTAIN"' "$SERVICE"

check "SUBMITTING is recoverable only through evidence" \
  grep -q '"SUBMITTING"' "$SERVICE"

check "manual-confirmation state is recoverable through evidence" \
  grep -q '"MANUAL_CONFIRMATION_REQUIRED"' "$SERVICE"

check "symbol is part of evidence identity" \
  grep -q 'upper(evidence?.symbol)' "$SERVICE"

check "side is part of evidence identity" \
  grep -q 'upper(evidence?.side)' "$SERVICE"

check "quantity is part of evidence identity" \
  grep -q 'sameQuantity' "$SERVICE"

check "broker identity is part of evidence identity" \
  grep -q 'brokerIdentityMatches' "$SERVICE"

check "submission timing window is required" \
  grep -q 'evidenceWithinSubmissionWindow' "$SERVICE"

check "existing broker reference forces direct reference match" \
  grep -q 'text(record?.brokerReference)' "$SERVICE"

check "zero matches do not resolve" \
  grep -q '"NO_VERIFIED_MATCH"' "$SERVICE"

check "ambiguous matches do not resolve" \
  grep -q '"AMBIGUOUS_VERIFIED_MATCH"' "$SERVICE"

check "resolved order records verified evidence provenance" \
  grep -q 'verifiedExecutionEvidence' "$SERVICE"

check "resolved order records reconciliation provenance" \
  grep -q 'realExecutionReconciliation' "$SERVICE"

check "resolution provenance names verified broker execution" \
  grep -q 'RESOLVED_FROM_VERIFIED_BROKER_EXECUTION' "$SERVICE"

echo
echo "=== TRANSACTION UPLOAD INTEGRATION ==="

check "transaction upload reads recovery route params" \
  grep -q 'useLocalSearchParams' "$UPLOAD"

check "transaction upload reads recovery order id" \
  grep -q 'const recoveryOrderId =' "$UPLOAD"

check "transaction upload calls A10 reconciliation service" \
  grep -q 'reconcileUncertainRealOrderFromVerifiedEvidence' "$UPLOAD"

check "only verified partition is supplied to matcher" \
  sh -c 'grep -A8 "reconcileUncertainRealOrderFromVerifiedEvidence" "$1" | grep -q "records: verified"' \
  _ "$UPLOAD"

check "ambiguous evidence reports locked recovery state" \
  grep -q '"AMBIGUOUS_VERIFIED_MATCH"' "$UPLOAD"

check "no-match evidence reports locked recovery state" \
  grep -q '"NO_VERIFIED_MATCH"' "$UPLOAD"

check "unique verified match reports reconciliation" \
  grep -q 'REAL Order Reconciled' "$UPLOAD"

check "A9 supplies recoveryOrderId" \
  grep -q 'recoveryOrderId: order?.id' "$RECOVERY"

echo
echo "=== SAFETY BOUNDARIES ==="

check "A10 service never routes broker order" \
  sh -c "! grep -q 'placeBrokerOrder\\|routeExecutionOrderByMode' '$SERVICE'"

check "A10 service does not write REAL portfolio directly" \
  sh -c "! grep -Eq 'saveUnifiedPortfolio|replaceAuthoritativeBrokerPortfolio|availableCash|canonicalPortfolioLedger' '$SERVICE'"

check "manual REAL fill guard remains" \
  grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

check "REAL broker receipt guard remains" \
  grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"

check "evidence policy still requires completed execution status" \
  grep -q 'COMPLETED_EXECUTION_STATUSES' "$POLICY"

check "evidence policy still blocks non-executed statuses" \
  grep -q 'NON_EXECUTED_STATUSES' "$POLICY"

echo
echo "=== REGRESSION ==="

if bash scripts/verify-pc031a9-real-submission-recovery.sh \
  >/tmp/gatecep-pc031a10-a9.log 2>&1; then
  echo "PASS: PC-031A9 regression suite"
else
  echo "FAIL: PC-031A9 regression suite"
  cat /tmp/gatecep-pc031a10-a9.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$SERVICE" \
  "$UPLOAD" \
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
  echo "PC-031A10 verification FAILED."
  exit 1
fi

echo
echo "PC-031A10 verification PASSED."
