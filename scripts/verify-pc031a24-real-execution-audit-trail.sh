#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A24 REAL EXECUTION AUDIT TRAIL ====="

cd "$MOBILE"
node scripts/test-pc031a24-real-execution-audit-trail.mjs

echo
echo "===== A23 IDENTITY CONTINUITY REGRESSION ====="
node scripts/test-pc031a23-real-execution-identity-continuity.mjs

echo
echo "===== A22 STATUS CONVERGENCE REGRESSION ====="
node scripts/test-pc031a22-real-execution-status-read-model.mjs

echo
echo "===== A18 CONVERGENCE REGRESSION ====="
node scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs

echo
echo "===== A16 CANONICAL EVIDENCE REGRESSION ====="
node scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs

echo
echo "===== A13 MATCHER REGRESSION ====="
node scripts/test-pc031a13-recovery-match-runtime.mjs

echo
echo "===== DIFF CHECK ====="
cd "$ROOT"
git diff --check

echo
echo "===== REAL AUDIT EVENT COVERAGE ====="
grep -R -n -E \
  'REAL_ORDER_QUEUED|REAL_SUBMISSION_STARTED|REAL_SUBMISSION_SAFE_FAILURE|REAL_SUBMISSION_UNCERTAIN|REAL_ORDER_ROUTED|REAL_RECOVERY_MATCHED|REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE|REAL_RECOVERY_PERSISTENCE_FAILED' \
  mobile/src/services/trade \
  mobile/src/features/broker-sync \
  --exclude='*.bak'

echo
echo "===== SAFETY ====="
git branch --show-current
git rev-list --left-right --count main...HEAD

if test -x .git/hooks/pre-push; then
  echo "Push guard: ACTIVE"
else
  echo "Push guard: NOT ACTIVE"
  exit 1
fi

echo
echo "PASS: PC-031A24 REAL EXECUTION AUDIT TRAIL"
