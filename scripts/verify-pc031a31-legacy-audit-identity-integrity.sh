#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A31 LEGACY AUDIT IDENTITY INTEGRITY ====="

cd "$MOBILE"

echo
echo "===== A31 FOCUSED RUNTIME ====="
node --experimental-vm-modules \
  scripts/test-pc031a31-legacy-audit-identity-integrity.mjs

echo
echo "===== A30 UNIQUE IDENTITY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a30-audit-event-identity-integrity.mjs

echo
echo "===== A28 CLEAR CONCURRENCY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a28-audit-clear-concurrency-integrity.mjs

echo
echo "===== A27 WRITE CONCURRENCY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a27-audit-concurrency-integrity.mjs

echo
echo "===== A26 RETENTION REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a26-audit-retention-integrity.mjs

echo
echo "===== A25 REAL AUDIT RUNTIME REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a25-real-execution-audit-runtime.mjs

cd "$ROOT"

STORE="mobile/src/services/trade/executionAuditStore.js"
UI="mobile/app/execution-audit.js"

echo
echo "===== LEGACY EVIDENCE REMAINS NON-MIGRATING ====="

LOAD_BODY="$(
  sed -n \
    '/export async function loadExecutionAuditTrail/,/export async function addExecutionAuditEvent/p' \
    "$STORE"
)"

printf '%s\n' "$LOAD_BODY"

if printf '%s\n' "$LOAD_BODY" \
  | grep -q -E \
    'userSetItem|createUniqueExecutionAuditEventId|retainExecutionAuditEvents'
then
  echo "FAIL: audit load path mutates or migrates historical evidence"
  exit 1
else
  echo "PASS: load path remains read-only and does not rewrite legacy audit evidence"
fi

echo
echo "===== STRONG LIFECYCLE PRECEDENCE PRESERVED ====="

grep -n -A50 \
  'function realExecutionLifecycleKey' \
  "$STORE"

grep -q 'return `ORDER:' "$STORE"
grep -q 'return `EXECUTION:' "$STORE"
grep -q 'return `BROKER_ORDER:' "$STORE"
grep -q 'return `BROKER_REFERENCE:' "$STORE"

echo "PASS: broker/OMS lifecycle identity still precedes fallback event identity"

echo
echo "===== LEGACY FALLBACK IS RECORD-SAFE ====="

grep -q 'idIsDuplicate' "$STORE"
grep -q 'fallbackRecordKey' "$STORE"
grep -q 'LEGACY_EVENT:' "$STORE"
grep -q 'realEventIdCounts' "$STORE"

if grep -q \
  'return `EVENT:${id || "UNIDENTIFIED"}`' \
  "$STORE"
then
  echo "FAIL: old shared EVENT:UNIDENTIFIED fallback still exists"
  exit 1
else
  echo "PASS: missing/duplicate legacy IDs no longer share one fallback lifecycle"
fi

echo
echo "===== A30 NEW-EVENT IDENTITY STILL ACTIVE ====="

grep -q \
  'createUniqueExecutionAuditEventId' \
  "$STORE"

grep -q \
  'existingIds.has(candidate)' \
  "$STORE"

grep -q \
  'event.id =' \
  "$STORE"

echo "PASS: A30 persisted-ID uniqueness enforcement remains active"

echo
echo "===== EXECUTION AUDIT UI KEY COMPATIBILITY ====="

grep -n -A4 -B3 \
  'LEGACY_AUDIT' \
  "$UI"

if grep -q \
  'key={event.id}' \
  "$UI"
then
  echo "FAIL: Execution Audit still uses raw event.id as React key"
  exit 1
fi

grep -q \
  'event.id || "LEGACY_AUDIT"' \
  "$UI"

grep -q \
  'event.createdAt || ""' \
  "$UI"

echo "PASS: Execution Audit uses collision-safe runtime render identity"

echo
echo "===== AUDIT REMAINS OBSERVATIONAL ====="

if grep -n -E \
  'placeBrokerOrder|markExecutionOrderFilled|updateExecutionOrder|rebuildCanonicalPortfolioLedger' \
  "$STORE"
then
  echo "FAIL: audit store gained broker/OMS/accounting authority"
  exit 1
else
  echo "PASS: audit store remains observational"
fi

echo
echo "===== BROKER SUBMISSION LOCK REMAINS SEPARATE ====="

grep -n \
  'REAL_SUBMISSION_LOCKS' \
  mobile/src/services/trade/basketExecutionStore.js

if grep -q \
  'REAL_SUBMISSION_LOCKS' \
  "$STORE"
then
  echo "FAIL: audit compatibility logic reused broker submission lock"
  exit 1
else
  echo "PASS: audit compatibility remains independent from broker submission locking"
fi

echo
echo "===== DIRECT AUDIT STORAGE KEY OWNERSHIP ====="

COUNT="$(
  grep -R \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*.bak' \
    -l \
    '"executionAuditTrail"' \
    mobile/src mobile/app \
    | wc -l \
    | tr -d ' '
)"

if [ "$COUNT" -ne 1 ]; then
  echo "FAIL: executionAuditTrail has unexpected direct storage owners: $COUNT"
  grep -R -n \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude='*.bak' \
    '"executionAuditTrail"' \
    mobile/src mobile/app || true
  exit 1
fi

echo "PASS: canonical audit store remains sole direct owner of executionAuditTrail"

echo
echo "===== DIFF CHECK ====="
git diff --check

echo
echo "===== REPOSITORY SAFETY ====="
git branch --show-current
git rev-list --left-right --count main...HEAD

test -x .git/hooks/pre-push \
  && echo "Push guard: ACTIVE" \
  || {
    echo "Push guard: NOT ACTIVE"
    exit 1
  }

echo
echo "PASS: PC-031A31 LEGACY AUDIT IDENTITY INTEGRITY"
