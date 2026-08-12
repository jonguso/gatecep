PC-028E — Coach G Wealth Journey Advisor

Purpose
-------
Unify PC-028A through PC-028D into one continuous investor-centered
wealth journey service.

Coach G can now answer:
- Where am I now?
- Where am I trying to go?
- Am I on track?
- What behavior supports or conflicts with my goal?
- What recovery options exist?
- What has GateCEP learned about me?
- What still needs clarification?
- What should we discuss next?

Inputs
------
Goals
Portfolio
Cash
Contribution behavior
Observed behavior
Portfolio health
Investor DNA
Financial context
Allocation advice
Planning assumptions
Recent life changes

Outputs
-------
Per-goal:
- progress
- alignment
- recovery options
- DNA evidence review
- priority
- next action
- Coach G narrative
- conversation questions

Overall:
- top priority goal
- goals needing attention
- goals on track
- achieved goals
- combined DNA evidence
- DNA update proposal
- executive summary

Critical design rule
--------------------
Coach G orchestrates guidance but does not automatically:
- change a goal
- update Investor DNA
- increase contributions
- rebalance a portfolio
- execute a trade

Main functions
--------------
buildCoachGGoalJourneyAdvice()
buildCoachGWealthJourneyAdvice()
buildCoachGWealthJourneySummary()
buildCoachGWealthJourneyNextAction()
loadCoachGGoalsNeedingAttention()
loadCoachGTopWealthJourneyAction()
loadCoachGWealthJourneyQuestions()
loadCoachGInvestorDNAClarifications()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildCoachGGoalJourneyAdvice\\|buildCoachGWealthJourneyAdvice\\|buildCoachGWealthJourneySummary\\|buildCoachGWealthJourneyNextAction\\|loadCoachGGoalsNeedingAttention\\|loadCoachGTopWealthJourneyAction\\|loadCoachGWealthJourneyQuestions\\|loadCoachGInvestorDNAClarifications" \
  src/features/wealth-journey/*.js
