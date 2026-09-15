#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A12 VERIFY — RECOVERY EVIDENCE PRIORITIZATION ==="

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

echo
echo "=== RELEVANCE RANKING ==="

check "audit computes display-only relevance score" \
  grep -q 'const relevanceScore =' "$SERVICE"

check "broker reference receives strongest relevance signal" \
  grep -q 'referenceMatch === true ? 1000' "$SERVICE"

check "broker identity contributes relevance" \
  grep -q 'brokerMatch ? 120' "$SERVICE"

check "symbol contributes relevance" \
  grep -q 'symbolMatch ? 100' "$SERVICE"

check "side contributes relevance" \
  grep -q 'sideMatch ? 80' "$SERVICE"

check "quantity contributes relevance" \
  grep -q 'quantityMatch ? 60' "$SERVICE"

check "submission window contributes relevance" \
  grep -q 'submissionWindowMatch ? 40' "$SERVICE"

check "audit counts order identity signals" \
  grep -q 'identitySignalCount' "$SERVICE"

check "relevance requires meaningful order identity" \
  grep -q 'identitySignalCount >= 2' "$SERVICE"

check "audit exposes submission distance" \
  grep -q 'submissionDistanceMs' "$SERVICE"

check "audit builds relevantEvidence list" \
  grep -q 'const relevantEvidence =' "$SERVICE"

check "verified evidence is ranking tie-breaker" \
  grep -q 'left.checks.verified' "$SERVICE"

check "submission proximity is ranking tie-breaker" \
  grep -q 'leftDistance' "$SERVICE"

check "audit reports hidden irrelevant evidence" \
  grep -q 'hiddenIrrelevantEvidenceCount' "$SERVICE"

echo
echo "=== QUALIFICATION INTEGRITY ==="

check "A10 matcher still uses verified records" \
  grep -q 'const verified = verifiedRecords(records)' "$SERVICE"

check "broker reference still forces exact matcher path" \
  sh -c 'grep -A25 "export function findVerifiedEvidenceMatches" "$1" | grep -q "brokerReference.*===" || grep -A25 "export function findVerifiedEvidenceMatches" "$1" | grep -q "text(record?.brokerReference)"' \
  _ "$SERVICE"

check "heuristic matcher still calls evidenceMatchesOrder" \
  sh -c 'grep -A35 "export function findVerifiedEvidenceMatches" "$1" | grep -q "evidenceMatchesOrder"' \
  _ "$SERVICE"

check "qualification still requires verified evidence" \
  sh -c 'grep -A90 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "verified &&"' \
  _ "$SERVICE"

check "strict qualification still requires symbol" \
  sh -c 'grep -A100 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "symbolMatch &&"' \
  _ "$SERVICE"

check "strict qualification still requires side" \
  sh -c 'grep -A100 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "sideMatch &&"' \
  _ "$SERVICE"

check "strict qualification still requires quantity" \
  sh -c 'grep -A100 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "quantityMatch &&"' \
  _ "$SERVICE"

check "strict qualification still requires broker" \
  sh -c 'grep -A100 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "brokerMatch &&"' \
  _ "$SERVICE"

check "strict qualification still requires submission window" \
  sh -c 'grep -A105 "buildVerifiedEvidenceMatchAudit" "$1" | grep -q "submissionWindowMatch"' \
  _ "$SERVICE"

echo
echo "=== RECOVERY UI ==="

check "UI displays relevant evidence count" \
  grep -q 'label="Relevant Evidence"' "$RECOVERY"

check "UI displays hidden irrelevant count" \
  grep -q 'label="Hidden Irrelevant"' "$RECOVERY"

check "UI uses ranked relevant evidence list" \
  grep -q '(audit.relevantEvidence || \[\])' "$RECOVERY"

check "UI no longer slices raw evidence list" \
  sh -c '! grep -q "(audit.evidence || \\[\\])" "$1"' \
  _ "$RECOVERY"

check "UI shows relevance score" \
  grep -q 'Relevance score:' "$RECOVERY"

check "UI shows identity signal count" \
  grep -q 'Identity signals:' "$RECOVERY"

check "UI explains hidden evidence remains stored" \
  grep -q 'records remain stored' "$RECOVERY"

check "UI labels top-five relevance ordering" \
  grep -q 'Showing the 5 most relevant' "$RECOVERY"

echo
echo "=== SAFETY BOUNDARIES ==="

check "ranking code does not route broker orders" \
  sh -c '! grep -A180 "const relevantEvidence =" "$1" | grep -Eq "placeBrokerOrder|routeExecutionOrderByMode"' \
  _ "$SERVICE"

check "ranking code does not update execution order" \
  sh -c '! grep -A180 "const relevantEvidence =" "$1" | grep -q "updateExecutionOrder("' \
  _ "$SERVICE"

check "recovery screen remains broker-adapter free" \
  sh -c '! grep -Eq "placeBrokerOrder|routeExecutionOrderByMode" "$1"' \
  _ "$RECOVERY"

check "manual REAL fill guard remains" \
  grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

check "REAL receipt guard remains" \
  grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"

echo
echo "=== REGRESSION ==="

if bash scripts/verify-pc031a11-recovery-match-audit.sh \
  >/tmp/gatecep-pc031a12-a11.log 2>&1; then
  echo "PASS: PC-031A11 regression suite"
else
  echo "FAIL: PC-031A11 regression suite"
  cat /tmp/gatecep-pc031a12-a11.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- "$SERVICE" "$RECOVERY" "$STORE"; then
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
  echo "PC-031A12 verification FAILED."
  exit 1
fi

echo
echo "PC-031A12 verification PASSED."
