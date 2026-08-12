#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030C2C8 — RUNTIME CONTRACT + INTEGRITY VERIFICATION"
echo "============================================================"

SERVICE="src/features/performance/performanceBenchmarkGoalIntelligenceService.js"

grep -q '"INSUFFICIENT_HISTORY"' "$SERVICE"
grep -q 'insufficientHistoryBecomesAvailable:' "$SERVICE"
echo "PASS — insufficient benchmark history is explicitly unavailable."

node --experimental-vm-modules scripts/test-pc030c2c8-runtime.mjs

python scripts/audit-pc029c-visible-routes.py

if [ "${SKIP_EXPO_EXPORT:-0}" != "1" ]; then
  EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-state}"
  mkdir -p "$EXPO_STATE"
  CI=1 EXPO_NO_TELEMETRY=1 \
    __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
    npx expo export --platform web
fi

echo "PC-030C2C8 verification complete."
