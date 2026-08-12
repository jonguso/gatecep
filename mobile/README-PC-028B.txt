PC-028B — Goal Gap & Recovery Planner

Purpose
-------
When an investor is behind a goal, GateCEP should not default to:
"invest more."

PC-028B compares realistic recovery paths.

Strategies
----------
INCREASE_CONTRIBUTION
EXTEND_TIMELINE
ADJUST_TARGET
IMPROVE_ALLOCATION
PROTECT_LIQUIDITY
COMBINED
CONTINUE_PLAN
REVIEW_FURTHER

What Coach G receives
---------------------
Current goal progress
Recovery scenarios
Feasibility of each scenario
Trade-offs
Suggested discussion question
Recommended scenario to discuss first

Important
---------
A recommendation is not an automatic plan change.

Coach G should discuss:
- what is financially realistic
- whether circumstances changed
- whether the goal changed
- whether behavior should change
- whether the portfolio should change

Main functions
--------------
buildContributionRecoveryScenario()
buildTimelineRecoveryScenario()
buildTargetRecoveryScenario()
buildAllocationRecoveryScenario()
buildLiquidityProtectionScenario()
buildCombinedRecoveryScenario()
buildGoalRecoveryPlan()
buildGoalRecoveryNarrative()
buildGoalRecoveryPlanBatch()
loadGoalRecoveryPlansNeedingDiscussion()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildContributionRecoveryScenario\\|buildTimelineRecoveryScenario\\|buildTargetRecoveryScenario\\|buildAllocationRecoveryScenario\\|buildLiquidityProtectionScenario\\|buildCombinedRecoveryScenario\\|buildGoalRecoveryPlan\\|buildGoalRecoveryNarrative\\|loadGoalRecoveryPlansNeedingDiscussion" \
  src/features/wealth-journey/*.js
