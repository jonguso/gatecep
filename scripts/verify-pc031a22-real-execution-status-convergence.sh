#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "===== PC-031A22 REAL EXECUTION STATUS CONVERGENCE ====="

cd mobile
node scripts/test-pc031a22-real-execution-status-read-model.mjs
cd ..

echo
echo "===== A21 REGRESSION ====="
cd mobile
node scripts/test-pc031a21-authoritative-replacement-cross-platform.mjs
cd ..

echo
echo "===== A20 REGRESSION ====="
cd mobile
node scripts/test-pc031a20-practice-trade-real-isolation.mjs
cd ..

echo
echo "===== A19 REGRESSION ====="
cd mobile
node scripts/test-pc031a19-real-manual-fill-boundary.mjs
cd ..

echo
echo "===== A18 REGRESSION ====="
cd mobile
node scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs
cd ..

echo
echo "===== DIFF CHECK ====="
git diff --check

echo
echo "===== SAFETY ====="
git branch --show-current
git rev-list --left-right --count main...HEAD

test -x .git/hooks/pre-push \
  && echo "Push guard: ACTIVE" \
  || {
    echo "Push guard: NOT ACTIVE"
    exit 1
  }

echo
echo "PASS: PC-031A22 READ-MODEL FOUNDATION"
