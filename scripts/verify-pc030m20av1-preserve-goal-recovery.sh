#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
echo "PC-030M20AV1 — Preserve-Goal Recovery First"
node mobile/scripts/test-pc030m20av1-preserve-goal-recovery.mjs
grep -q 'pathname: "/goal-recovery-choice"' mobile/app/goal-scenario-planner.js
grep -q 'Yes — I can add this amount' mobile/app/goal-recovery-choice.js
grep -q 'No — I cannot add this amount' mobile/app/goal-recovery-choice.js
grep -q 'Compare recovery alternatives' mobile/app/goal-recovery-choice.js
grep -q 'startDecisionConversation' mobile/app/goal-recovery-choice.js
grep -q 'requestFloatingCoachGOpen' mobile/app/goal-recovery-choice.js
grep -q 'preserveGoal: true' mobile/app/goal-recovery-choice.js
grep -q 'brokerExecutionAllowed:false' mobile/src/features/wealth-journey/preserveGoalRecoveryService.js
echo "PASS — primary recovery asks whether the investor can fund the gap first."
echo "PASS — YES preserves goal/date/contribution and opens canonical Coach G."
echo "PASS — NO exposes second-level recovery alternatives."
echo "PASS — no REAL/Practice/DNA/goal/broker mutation is introduced."
echo "PC-030M20AV1 verification complete."
