PC-028H — Real GateCEP Service Wiring

Purpose
-------
Wire PC-028G to services confirmed by inspection to already exist in GateCEP.

Confirmed existing services
---------------------------
loadInvestorContext()
  src/features/investor/investorContextStore.js

buildUnifiedPortfolioAnalytics()
  src/features/analytics/unifiedPortfolioAnalyticsService.js

buildBehaviorAnalytics()
  src/features/behavior-analytics/behaviorAnalyticsService.js

buildPortfolioHealthScore()
  src/features/analytics/portfolioHealthScoreService.js

What PC-028H wires
------------------
Investor
Investor DNA
Goal evidence
Practice activity
Unified portfolio
Available cash
Holdings
Behavior analytics
Portfolio health

Goal handling
-------------
The inspection did not reveal a dedicated persisted financial-goal service.

Therefore PC-028H reads the goal evidence that already exists in:
- investor context
- profile
- Investor DNA

If the current stored goal is only a label such as "Build Wealth", GateCEP
preserves it as INTENT_ONLY and does NOT invent a target amount or target date.

That means Coach G can naturally ask the investor to turn the intent into a
trackable goal.

Intentionally not wired yet
---------------------------
Orders
Trades
Coach G conversation history
Life-change history

Reason:
No canonical loaders for those domains were identified in the inspected output.
PC-028H leaves those domains missing instead of connecting to the wrong store.

Main functions
--------------
extractGoalsFromInvestorContext()
adaptInvestorContextForWealthJourney()
adaptUnifiedPortfolioAnalyticsForWealthJourney()
adaptBehaviorAnalyticsForWealthJourney()
adaptPortfolioHealthForWealthJourney()
registerRealGatecepWealthJourneyProviders()
initializeRealGatecepWealthJourney()
loadRealCurrentInvestorWealthJourney()
loadRealWealthJourneyHomeCard()
loadRealWealthJourneyCoachGPrompt()
loadRealWealthJourneyGoalsSummary()
loadRealWealthJourneyPortfolioContext()
loadRealWealthJourneyDNAContext()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "extractGoalsFromInvestorContext\\|adaptInvestorContextForWealthJourney\\|adaptUnifiedPortfolioAnalyticsForWealthJourney\\|adaptBehaviorAnalyticsForWealthJourney\\|adaptPortfolioHealthForWealthJourney\\|registerRealGatecepWealthJourneyProviders\\|initializeRealGatecepWealthJourney\\|loadRealCurrentInvestorWealthJourney" \
  src/features/wealth-journey/*.js
