PC-028A — Goal Progress Intelligence Engine

Purpose: help the investor answer:
1. Where am I now?
2. Where am I trying to go?
3. Am I on track?
4. What should I do next?

Inputs:
Goal target/date, portfolio value, available cash, contributions, observed behavior, portfolio health, Investor DNA context and planning assumptions.

Outputs:
Current position, required trajectory, projected goal value, projected gap, on-track status, behavior/goal alignment, next-best action and Coach G narrative.

Important:
Observed behavior is evidence, not proof that the investor is wrong. If behavior and goal conflict, Coach G should discuss the mismatch because the goal, circumstances or Investor DNA may have changed.

Verify:
grep -n "buildInvestorGoalProgress\|calculateGoalRequiredTrajectory\|classifyGoalProgress\|analyzeGoalBehaviorAlignment\|buildGoalNextBestAction\|buildGoalProgressNarrative\|loadGoalsNeedingCoachGAttention" src/features/wealth-journey/*.js
