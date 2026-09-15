#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A13 VERIFY — RECOVERY MATCH RUNTIME ==="

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

CORE="mobile/src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
SERVICE="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
POLICY="mobile/src/features/broker-sync/brokerExecutionEvidencePolicy.js"
TEST="mobile/scripts/test-pc031a13-recovery-match-runtime.mjs"
STORE="mobile/src/services/trade/basketExecutionStore.js"

echo
echo "=== PURE MATCH CORE ==="

check "pure recovery match core exists" \
  test -f "$CORE"

check "pure core owns verified matcher" \
  grep -q 'export function findVerifiedEvidenceMatches' "$CORE"

check "pure core owns recovery audit" \
  grep -q 'export function buildVerifiedEvidenceMatchAudit' "$CORE"

check "pure core uses broker evidence classifier" \
  grep -q 'classifyBrokerExecutionEvidence' "$CORE"

check "pure core owns one-day backward window" \
  grep -q 'MATCH_WINDOW_BEFORE_MS' "$CORE"

check "pure core owns seven-day forward window" \
  grep -q 'MATCH_WINDOW_AFTER_MS' "$CORE"

check "pure core preserves exact-reference mode" \
  grep -q '"BROKER_REFERENCE"' "$CORE"

check "pure core preserves strict identity-window mode" \
  grep -q '"STRICT_IDENTITY_WINDOW"' "$CORE"

check "pure core preserves relevance ranking" \
  grep -q 'const relevanceScore =' "$CORE"

check "pure core preserves relevant evidence ordering" \
  grep -q 'const relevantEvidence =' "$CORE"

echo
echo "=== PURE-CORE ISOLATION ==="

check "pure core does not import basket execution store" \
  sh -c '! grep -q "basketExecutionStore" "$1"' \
  _ "$CORE"

check "pure core does not import user storage" \
  sh -c '! grep -q "userStorage" "$1"' \
  _ "$CORE"

check "pure core does not import React Native or Expo" \
  sh -c '! grep -Eq "react-native|expo-router|AsyncStorage" "$1"' \
  _ "$CORE"

check "pure core cannot update execution order" \
  sh -c '! grep -q "updateExecutionOrder" "$1"' \
  _ "$CORE"

check "pure core cannot route broker orders" \
  sh -c '! grep -Eq "placeBrokerOrder|routeExecutionOrderByMode" "$1"' \
  _ "$CORE"

echo
echo "=== STATEFUL RECONCILIATION BOUNDARY ==="

check "stateful service imports pure matcher" \
  grep -q 'realOrderExecutionEvidenceMatchCore.js' "$SERVICE"

check "stateful service re-exports audit API" \
  grep -q 'buildVerifiedEvidenceMatchAudit' "$SERVICE"

check "stateful service retains recoverable broker statuses" \
  grep -q 'SUBMISSION_UNCERTAIN' "$SERVICE"

check "stateful service retains full reconciliation signature" \
  grep -q 'export async function reconcileUncertainRealOrderFromVerifiedEvidence' "$SERVICE"

check "stateful service loads basket execution" \
  grep -q 'loadBasketExecution' "$SERVICE"

check "stateful service updates only after reconciliation" \
  grep -q 'updateExecutionOrder' "$SERVICE"

check "stateful service no longer duplicates matcher window constants" \
  sh -c '! grep -q "MATCH_WINDOW_BEFORE_MS" "$1"' \
  _ "$SERVICE"

check "stateful service contains no truncated extraction artifact" \
  sh -c '! grep -q "^ecords = \\[\\]" "$1"' \
  _ "$SERVICE"

echo
echo "=== EVIDENCE POLICY ==="

check "completed evidence policy still accepts FILLED" \
  grep -q '"FILLED"' "$POLICY"

check "completed evidence policy still accepts SETTLED" \
  grep -q '"SETTLED"' "$POLICY"

check "non-executed evidence still includes REJECTED" \
  grep -q '"REJECTED"' "$POLICY"

check "non-executed evidence still includes REFUSED" \
  grep -q '"REFUSED"' "$POLICY"

echo
echo "=== REAL EXECUTION SAFETY ==="

check "manual REAL fill guard remains" \
  grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

check "REAL receipt evidence guard remains" \
  grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"

echo
echo "=== RUNTIME BEHAVIOR ==="

if (
  cd mobile &&
  node scripts/test-pc031a13-recovery-match-runtime.mjs \
    >/tmp/gatecep-pc031a13-runtime.log 2>&1
); then
  echo "PASS: PC-031A13 runtime behavior suite"
  cat /tmp/gatecep-pc031a13-runtime.log
else
  echo "FAIL: PC-031A13 runtime behavior suite"
  cat /tmp/gatecep-pc031a13-runtime.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$CORE" \
  "$SERVICE" \
  "$POLICY" \
  "$TEST" \
  "$STORE"
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
  echo "PC-031A13 verification FAILED."
  exit 1
fi

echo
echo "PC-031A13 verification PASSED."
