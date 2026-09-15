#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A23 REAL EXECUTION IDENTITY CONTINUITY ====="

cd "$MOBILE"
node scripts/test-pc031a23-real-execution-identity-continuity.mjs

echo
echo "===== A22 REGRESSION ====="
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
echo "PASS: PC-031A23 REAL EXECUTION IDENTITY CONTINUITY"
