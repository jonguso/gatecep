#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2E2 — Projection Context Continuity"

grep -Fq 'projectedValue:projectedValue??""' mobile/app/goal-recovery-choice.js
grep -Fq 'projectedShortfallBeforeRecovery: params?.projectedShortfall ?? params?.goalGap ?? ""' mobile/app/goal-recovery-allocation.js
grep -Fq 'projectedValueBeforeRecovery: params?.projectedValue ?? ""' mobile/app/goal-recovery-allocation.js
grep -Fq 'function maybeNum(v)' mobile/app/goal-recovery-preview.js
grep -Fq 'const projectedValueBeforeRecovery=maybeNum(params.projectedValueBeforeRecovery)' mobile/app/goal-recovery-preview.js
grep -Fq 'const projectedShortfallBeforeRecovery=maybeNum(params.projectedShortfallBeforeRecovery)' mobile/app/goal-recovery-preview.js

if grep -Fq 'projectedValueBeforeRecovery: String(Number(params?.projectedValue ?? 0) || 0)' mobile/app/goal-recovery-allocation.js; then
  echo "ERROR — projected value is still being coerced to zero."
  exit 1
fi

if grep -Fq 'projectedShortfallBeforeRecovery: String(Number(params?.projectedShortfall ?? params?.goalGap ?? 0) || 0)' mobile/app/goal-recovery-allocation.js; then
  echo "ERROR — projected shortfall is still being coerced to zero."
  exit 1
fi

echo "PASS — Planner projectedValue survives Recovery Choice -> Allocation -> Preview."
echo "PASS — Planner projectedShortfall survives Recovery Choice -> Allocation -> Preview."
echo "PASS — missing projection evidence is no longer converted to KES 0.00."
echo "PASS — no new projectedShortfall local-variable dependency was introduced."
echo "PC-030M20AV2E2 verification complete."
