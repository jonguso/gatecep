#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  echo "ERROR: run inside the GateCEP git repository." >&2
  exit 1
fi
cd "$ROOT"

fail=0
check() {
  local desc="$1"; shift
  if "$@"; then echo "PASS: $desc"; else echo "FAIL: $desc"; fail=1; fi
}

echo "=== PC-031A2C VERIFY — GATECEP BROKER CANONICAL IDENTITY ==="

check "registry contains canonical GateCEP Practice broker" \
  grep -q 'id: "GATECEP_PRACTICE"' mobile/src/services/brokers/brokerRegistry.js
check "registry label is GateCEP Broker" \
  grep -q 'name: "GateCEP Broker"' mobile/src/services/brokers/brokerRegistry.js
check "registry no longer defines SIM as broker id" \
  bash -lc '! grep -q '\''id: "SIM"'\'' mobile/src/services/brokers/brokerRegistry.js'
check "legacy SIM alias resolves to GateCEP Practice" \
  grep -q 'return "GATECEP_PRACTICE"' mobile/src/services/brokers/brokerAccountStore.js
check "cash evidence excludes GATECEP_PRACTICE" \
  grep -q '\["SIM", "GATECEP_PRACTICE"\].*PRACTICE|DEMO|SIMULATION' mobile/src/features/broker-sync/brokerCashEvidencePolicy.js
check "connected broker sync excludes GATECEP_PRACTICE" \
  grep -q '\["SIM", "GATECEP_PRACTICE"\]' mobile/src/features/broker-sync/brokerSyncService.js
check "connected broker sync excludes simulation mode" \
  grep -q '!mode.includes("SIMULATION")' mobile/src/features/broker-sync/brokerSyncService.js

echo
echo "=== REMAINING ACTIVE SIMULATION LABELS (expected compatibility debt) ==="
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  --exclude='*.bak' \
  --exclude='*.map' \
  -Ei 'Simulation Broker|Testing OMS execution' \
  mobile/app mobile/src 2>/dev/null | sed -n '1,220p' || true

echo
echo "=== DIFF ==="
git diff -- \
  mobile/src/services/brokers/brokerRegistry.js \
  mobile/src/services/brokers/brokerAccountStore.js \
  mobile/src/features/broker-sync/brokerCashEvidencePolicy.js \
  mobile/src/features/broker-sync/brokerSyncService.js

echo
echo "=== SAFETY ==="
git status --short
echo -n "gatecep-next vs main: "
git rev-list --left-right --count main...HEAD
echo -n "Push guard: "
test -x .git/hooks/pre-push && echo ACTIVE || echo NOT_ACTIVE

if [ "$fail" -ne 0 ]; then
  echo "PC-031A2C verification FAILED." >&2
  exit 1
fi

echo "PC-031A2C verification PASSED."
