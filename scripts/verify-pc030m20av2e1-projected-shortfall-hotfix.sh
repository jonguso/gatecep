#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2E1 — Projected Shortfall Handoff Hotfix"

grep -Fq 'pathname: "/goal-recovery-preview"' mobile/app/goal-recovery-allocation.js
grep -Fq 'params?.projectedShortfall' mobile/app/goal-recovery-allocation.js
grep -Fq 'projectedValueBeforeRecovery' mobile/app/goal-recovery-allocation.js

if grep -Fq 'projectedShortfallBeforeRecovery: String(projectedShortfall || 0)' mobile/app/goal-recovery-allocation.js; then
  echo "ERROR — undefined projectedShortfall reference still present."
  exit 1
fi

echo "PASS — projected portfolio handoff no longer references undefined projectedShortfall."
echo "PASS — shortfall is carried from existing route parameters."
echo "PASS — projected value is also carried when present."
echo "PC-030M20AV2E1 verification complete."
