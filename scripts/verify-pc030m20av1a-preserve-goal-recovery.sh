#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV1A — Preserve-Goal Recovery Verifier Correction"

node mobile/scripts/test-pc030m20av1-preserve-goal-recovery.mjs

# Route handoff + parameter continuity.
grep -Eq 'pathname:[[:space:]]*"/goal-recovery-choice"' mobile/app/goal-scenario-planner.js
grep -Eq 'goalName:[[:space:]]*goal\?\.name' mobile/app/goal-scenario-planner.js
grep -Eq 'targetAmount:[[:space:]]*String\(targetAmount\)' mobile/app/goal-scenario-planner.js
grep -Eq 'targetDate:[[:space:]]*String\(targetDate\)' mobile/app/goal-scenario-planner.js
grep -Eq 'monthlyContribution:[[:space:]]*String\(monthlyContribution\)' mobile/app/goal-scenario-planner.js
grep -Eq 'projectedValue:[[:space:]]*String\(scenario\?\.trajectory\?\.projectedValue' mobile/app/goal-scenario-planner.js
grep -Eq 'goalGap:[[:space:]]*String\(scenario\?\.goalGap' mobile/app/goal-scenario-planner.js

# Investor-facing preserve-goal branch.
grep -Fq 'Yes — I can add this amount' mobile/app/goal-recovery-choice.js
grep -Fq 'No — I cannot add this amount' mobile/app/goal-recovery-choice.js
grep -Fq 'Compare recovery alternatives' mobile/app/goal-recovery-choice.js

# Canonical Coach G handoff.
grep -Fq 'startDecisionConversation' mobile/app/goal-recovery-choice.js
grep -Fq 'requestFloatingCoachGOpen' mobile/app/goal-recovery-choice.js
grep -Eq 'preserveGoal:[[:space:]]*true' mobile/app/goal-recovery-choice.js
grep -Eq 'preserveTargetDate:[[:space:]]*true' mobile/app/goal-recovery-choice.js
grep -Eq 'preserveContribution:[[:space:]]*true' mobile/app/goal-recovery-choice.js

# Integrity contract — tolerate formatted or minified source.
grep -Eq 'brokerExecutionAllowed:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
grep -Eq 'mutatesGoal:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
grep -Eq 'mutatesContribution:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
grep -Eq 'mutatesRealPortfolio:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
grep -Eq 'mutatesPracticePortfolio:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
grep -Eq 'mutatesInvestorDNA:[[:space:]]*false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js

echo "PASS — goal simulator hands off the actual goal/scenario values to preserve-goal recovery."
echo "PASS — recovery asks whether the investor can fund the gap before changing the plan."
echo "PASS — YES preserves goal/date/contribution and starts canonical Coach G discussion."
echo "PASS — NO exposes second-level recovery alternatives."
echo "PASS — preserve-goal branch remains advisory-only with no goal/portfolio/DNA/broker mutation."
echo "PASS — verifier accepts both formatted and minified source."
echo "PC-030M20AV1A verification complete."
