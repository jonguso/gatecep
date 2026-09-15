#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "============================================================"
echo "PC-031A32 REAL PARTIAL-FILL EVIDENCE INTEGRITY"
echo "============================================================"

RECOVERY_CORE="src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
FILL_IDENTITY="src/features/broker-sync/brokerExecutionFillIdentity.js"
MATCH_CORE="src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
READ_MODEL="src/services/trade/realExecutionStatusReadModel.js"
CANONICAL_LEDGER="src/features/trading/canonicalPortfolioLedgerService.js"
LOT_HISTORY="src/features/trading/brokerLotHistoryEvidenceService.js"
TRANSACTION_UPLOAD="app/transactions-upload.js"
RECOVERY_SERVICE="src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"

require_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "FAIL: required file missing: $file"
    exit 1
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  local description="$3"

  if grep -Fq "$text" "$file"; then
    echo "PASS: $description"
  else
    echo "FAIL: $description"
    echo "      missing text: $text"
    echo "      file: $file"
    exit 1
  fi
}

reject_text() {
  local file="$1"
  local text="$2"
  local description="$3"

  if grep -Fq "$text" "$file"; then
    echo "FAIL: $description"
    echo "      forbidden text present: $text"
    echo "      file: $file"
    exit 1
  else
    echo "PASS: $description"
  fi
}

for file in \
  "$RECOVERY_CORE" \
  "$FILL_IDENTITY" \
  "$MATCH_CORE" \
  "$READ_MODEL" \
  "$CANONICAL_LEDGER" \
  "$LOT_HISTORY" \
  "$TRANSACTION_UPLOAD" \
  "$RECOVERY_SERVICE"
do
  require_file "$file"
done

echo
echo "===== SOURCE CONTRACT ====="

require_text \
  "$FILL_IDENTITY" \
  "export function brokerExecutionFillIdentity" \
  "fill-level broker execution identity helper exists"

require_text \
  "$FILL_IDENTITY" \
  "fillReference" \
  "explicit fill reference participates in execution identity"

require_text \
  "$FILL_IDENTITY" \
  "executionId" \
  "explicit execution identity is preserved"

require_text \
  "$FILL_IDENTITY" \
  "tradeId" \
  "explicit trade identity is preserved"

require_text \
  "$RECOVERY_CORE" \
  'from "./brokerExecutionFillIdentity.js";' \
  "REAL recovery imports fill-level execution identity"

require_text \
  "$RECOVERY_CORE" \
  "const matchedEvidence =" \
  "REAL recovery separates raw matches from unique fills"

require_text \
  "$RECOVERY_CORE" \
  "const uniqueEvidenceByFill =" \
  "REAL recovery deduplicates matched evidence by fill identity"

require_text \
  "$RECOVERY_CORE" \
  "ORDER_STATUS.PARTIAL_FILL" \
  "REAL recovery supports verified partial-fill state"

require_text \
  "$RECOVERY_CORE" \
  "ORDER_STATUS.FILLED" \
  "REAL recovery supports terminal verified FILLED state"

require_text \
  "$RECOVERY_CORE" \
  "VERIFIED_EXECUTION_QUANTITY_EXCEEDS_ORDER" \
  "REAL recovery fails closed when cumulative verified quantity exceeds parent order"

require_text \
  "$RECOVERY_CORE" \
  "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION" \
  "verified partial-fill reconciliation status exists"

require_text \
  "$RECOVERY_CORE" \
  "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION" \
  "verified full-fill reconciliation status exists"

require_text \
  "$RECOVERY_CORE" \
  "verifiedExecutionEvidenceRecords" \
  "recovery retains fill-level broker evidence records"

require_text \
  "$RECOVERY_CORE" \
  "order?.brokerOrderId ||" \
  "existing genuine broker parent order identity remains preferred"

require_text \
  "$RECOVERY_CORE" \
  "latestEvidence?.brokerReference ||" \
  "verified broker reference can establish missing parent order identity"

require_text \
  "$READ_MODEL" \
  "PARTIAL_FILL" \
  "verified REAL partial fills remain visible in execution read model"

require_text \
  "$READ_MODEL" \
  "recoveryRequired" \
  "REAL execution read model exposes recovery requirement"

require_text \
  "$CANONICAL_LEDGER" \
  "brokerExecutionFillIdentity" \
  "canonical accounting deduplicates by individual broker fill identity"

require_text \
  "$LOT_HISTORY" \
  "brokerExecutionFillIdentity" \
  "historical lot evidence deduplicates by individual fill identity"

require_text \
  "$TRANSACTION_UPLOAD" \
  "fillReference:" \
  "transaction import preserves broker fill identity"

require_text \
  "$TRANSACTION_UPLOAD" \
  "VERIFIED_EXECUTION_QUANTITY_EXCEEDS_ORDER" \
  "transaction upload surfaces quantity-conflict recovery failure"

require_text \
  "$RECOVERY_SERVICE" \
  "REAL_ORDER_PARTIAL_FILL_FROM_VERIFIED_EVIDENCE" \
  "audit differentiates verified REAL partial-fill recovery"

reject_text \
  "$RECOVERY_CORE" \
  "markExecutionOrderFilled" \
  "verified REAL recovery never calls manual full-fill service"

reject_text \
  "$RECOVERY_CORE" \
  "markExecutionOrderPartial" \
  "verified REAL recovery never calls manual partial-fill service"

echo
echo "===== A32 FOCUSED RUNTIME ====="
node \
  scripts/test-pc031a32-real-partial-fill-integrity.mjs

echo
echo "===== A14 RECOVERY TRANSITION ====="
node \
  scripts/test-pc031a14-recovery-transition-runtime.mjs

echo
echo "===== A15 STATEFUL RECOVERY ====="
node --experimental-vm-modules \
  scripts/test-pc031a15-stateful-recovery-runtime.mjs

echo
echo "===== A16 CANONICAL EVIDENCE BOUNDARY ====="
node \
  scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs

echo
echo "===== A18 RECOVERY / LEDGER CONVERGENCE ====="
node \
  scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs

echo
echo "===== A19 REAL MANUAL-FILL BOUNDARY ====="
node \
  scripts/test-pc031a19-real-manual-fill-boundary.mjs

echo
echo "===== A23 REAL EXECUTION IDENTITY ====="
node \
  scripts/test-pc031a23-real-execution-identity-continuity.mjs

echo
echo "===== A24 REAL EXECUTION AUDIT ====="
node \
  scripts/test-pc031a24-real-execution-audit-trail.mjs

echo
echo "===== A25 REAL EXECUTION AUDIT RUNTIME ====="
node --experimental-vm-modules \
  scripts/test-pc031a25-real-execution-audit-runtime.mjs

echo
echo "============================================================"
echo "PASS: PC-031A32 REAL PARTIAL-FILL EVIDENCE INTEGRITY"
echo "============================================================"
