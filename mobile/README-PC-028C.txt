PC-028C — Goal-to-Behavior Alignment Engine

Purpose
-------
Compare:
- what the investor says they want,
- what Investor DNA currently understands,
- what the investor is actually doing.

Behavior evidence can include:
- contribution consistency
- trading frequency
- holding periods
- concentration
- cash usage
- reaction to losses
- portfolio drift

Critical design rule
--------------------
A mismatch is not automatically treated as "bad behavior."

GateCEP creates hypotheses such as:
- behavior may need to change
- goal may have changed
- circumstances may have changed
- Investor DNA may need to evolve
- more evidence may be needed

Coach G then asks natural clarification questions before any major update.

Main functions
--------------
buildContributionAlignmentSignal()
buildTradingFrequencyAlignmentSignal()
buildHoldingPeriodAlignmentSignal()
buildConcentrationAlignmentSignal()
buildCashUsageAlignmentSignal()
buildLossResponseAlignmentSignal()
buildPortfolioDriftAlignmentSignal()
buildGoalBehaviorSignals()
calculateGoalBehaviorAlignmentScore()
classifyGoalBehaviorAlignment()
buildGoalBehaviorHypotheses()
buildCoachGAlignmentQuestions()
buildGoalBehaviorAlignmentAnalysis()
buildGoalBehaviorAlignmentNarrative()
buildGoalBehaviorAlignmentBatch()
loadGoalBehaviorMismatches()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildContributionAlignmentSignal\\|buildTradingFrequencyAlignmentSignal\\|buildHoldingPeriodAlignmentSignal\\|buildConcentrationAlignmentSignal\\|buildCashUsageAlignmentSignal\\|buildLossResponseAlignmentSignal\\|buildGoalBehaviorSignals\\|calculateGoalBehaviorAlignmentScore\\|buildGoalBehaviorHypotheses\\|buildCoachGAlignmentQuestions\\|buildGoalBehaviorAlignmentAnalysis\\|loadGoalBehaviorMismatches" \
  src/features/wealth-journey/*.js
