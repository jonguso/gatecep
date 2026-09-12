#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV1B — Recovery Choice Hierarchy"
node mobile/scripts/test-pc030m20av1b-recovery-choice-hierarchy.mjs
grep -Fq 'OPTION 1 · ADD MONEY NOW' mobile/app/goal-recovery-choice.js
grep -Fq 'OPTION 2 · INCREASE MONTHLY CONTRIBUTION' mobile/app/goal-recovery-choice.js
grep -Fq 'OPTION 3 · EXTEND THE TIMELINE' mobile/app/goal-recovery-choice.js
grep -Fq 'OPTION 4 · BALANCED RECOVERY' mobile/app/goal-recovery-choice.js
grep -Fq 'requiredMonthlyContribution' mobile/app/goal-recovery-choice.js
grep -Fq 'additionalMonthly' mobile/app/goal-recovery-choice.js
grep -Fq 'pathname:"/goal-recovery-allocation"' mobile/app/goal-recovery-choice.js
echo "PASS — future shortfall, lump sum today and monthly increase are separate recovery quantities."
echo "PASS — monthly increase is a first-class recovery option."
echo "PASS — add-money-now still routes to AV2 diversified recovery allocation."
echo "PC-030M20AV1B verification complete."
