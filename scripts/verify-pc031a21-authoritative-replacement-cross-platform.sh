#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "===== PC-031A21 AUTHORITATIVE REPLACEMENT + CROSS-PLATFORM VERIFY ====="

echo
echo "===== A21 SOURCE/RUNTIME CONTRACT ====="
cd mobile
node scripts/test-pc031a21-authoritative-replacement-cross-platform.mjs
cd ..

echo
echo "===== A20 REAL/PRACTICE EXECUTION ISOLATION ====="
cd mobile
node scripts/test-pc031a20-practice-trade-real-isolation.mjs
cd ..

echo
echo "===== A19 REAL MANUAL FILL BOUNDARY ====="
cd mobile
node scripts/test-pc031a19-real-manual-fill-boundary.mjs
cd ..

echo
echo "===== A18 RECOVERY / LEDGER CONVERGENCE ====="
cd mobile
node scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs
cd ..

echo
echo "===== A17 SINGLE CANONICAL REBUILD ====="
cd mobile
node scripts/test-pc031a17-single-canonical-rebuild-runtime.mjs
cd ..

echo
echo "===== A16 CANONICAL EVIDENCE BOUNDARY ====="
cd mobile
node scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs
cd ..

echo
echo "===== A15 STATEFUL RECOVERY ====="
cd mobile
node --experimental-vm-modules scripts/test-pc031a15-stateful-recovery-runtime.mjs
cd ..

echo
echo "===== A14 RECOVERY TRANSITION ====="
cd mobile
node scripts/test-pc031a14-recovery-transition-runtime.mjs
cd ..

echo
echo "===== A13 RECOVERY MATCHING ====="
cd mobile
node scripts/test-pc031a13-recovery-match-runtime.mjs
cd ..

echo
echo "===== FIFO HISTORICAL LOT LEDGER ====="
cd mobile
node scripts/test-pc030m20ad-fifo-lot-ledger.mjs
cd ..

echo
echo "===== DIFF CHECK ====="
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
echo "PASS: PC-031A21 AUTHORITATIVE REPLACEMENT + CROSS-PLATFORM UPLOAD INTEGRITY"
