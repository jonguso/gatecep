PC-027D — Corporate Action Portfolio Impact Engine

Purpose
-------
Turn the investor-specific entitlement from PC-027C into a projected
before/after portfolio view that Coach G can explain.

Models
------
Expected holding quantity
Expected average cost interpretation
Expected cost-basis interpretation
Expected cash receivable
Expected capital requirement
Expected income
Expected portfolio allocation change
Expected goal-progress effect
Performance interpretation

Important
---------
This is a projection engine.

It does NOT:
- mutate actual holdings
- mutate cash
- mutate cost basis
- execute a rights decision
- assume a corporate action has been confirmed by an external account

Main functions
--------------
buildCorporateActionProjectedHoldingImpact()
buildCorporateActionCashImpact()
buildCorporateActionIncomeImpact()
buildCorporateActionPortfolioImpact()
buildPortfolioImpactExplanation()
buildCorporateActionPortfolioImpactBatch()
loadCorporateActionPortfolioImpactsRequiringCoachG()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildCorporateActionProjectedHoldingImpact\\|buildCorporateActionCashImpact\\|buildCorporateActionIncomeImpact\\|buildCorporateActionPortfolioImpact\\|buildPortfolioImpactExplanation\\|buildCorporateActionPortfolioImpactBatch\\|loadCorporateActionPortfolioImpactsRequiringCoachG" \
  src/features/corporate-actions/*.js
