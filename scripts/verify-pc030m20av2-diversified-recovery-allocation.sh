#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2 — Goal-Preserving Diversified Recovery Allocation"

node mobile/scripts/test-pc030m20av2-diversified-recovery-allocation.mjs

grep -Fq 'sectorTargetsJson: JSON.stringify(sectorTargets || {})' mobile/app/goal-scenario-planner.js
grep -Fq 'pathname:"/goal-recovery-allocation"' mobile/app/goal-recovery-choice.js
grep -Fq 'onPress={openDiversifiedAllocation}' mobile/app/goal-recovery-choice.js

grep -Fq 'loadCanonicalRealWealthMetrics' mobile/app/goal-recovery-allocation.js
grep -Fq 'loadCoachGTopInvestmentOpportunities' mobile/app/goal-recovery-allocation.js
grep -Fq 'buildGoalPreservingDiversifiedRecoveryAllocation' mobile/app/goal-recovery-allocation.js
grep -Fq 'Discuss this allocation with Coach G' mobile/app/goal-recovery-allocation.js

grep -Fq 'calculateSectorAccommodation' mobile/src/features/wealth-journey/goalRecoveryDiversifiedAllocationService.js
grep -Fq 'buildUnderweightSectorCandidates' mobile/src/features/wealth-journey/goalRecoveryDiversifiedAllocationService.js
grep -Fq 'FEWER_THAN_TWO_EVIDENCE_SUPPORTED_SECTORS' mobile/src/features/wealth-journey/goalRecoveryDiversifiedAllocationService.js
grep -Fq 'brokerOrderCreated: false' mobile/src/features/wealth-journey/goalRecoveryDiversifiedAllocationService.js

echo "PASS — AV2 reuses canonical REAL holdings and existing Coach G investment-opportunity evidence."
echo "PASS — saved sector targets are preserved from Goal Recovery Simulator."
echo "PASS — concentration is checked before a security becomes part of the recovery allocation."
echo "PASS — recovery capital is allocated across multiple evidence-supported sectors when evidence permits."
echo "PASS — GateCEP refuses a fabricated one-security recovery basket when diversified evidence is insufficient."
echo "PASS — accepted recovery funding remains temporary scenario funding, not REAL available cash."
echo "PASS — no broker order or REAL/Practice/goal/DNA mutation is introduced."
echo "PC-030M20AV2 verification complete."
