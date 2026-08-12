PC-027F — Corporate Action Share Adjustment Engine

Purpose
-------
Model non-cash corporate-action changes without confusing them with investor
trading behavior.

Supported
---------
Bonus issues
Stock splits
Share consolidations
Rights exercised
Scrip dividends

Investor value
--------------
GateCEP can now distinguish:

"Investor bought more shares"

from

"Share quantity changed because of a corporate action"

This protects:
- Investor DNA behavior analysis
- trading-frequency analysis
- turnover analysis
- buy/sell pattern analysis
- performance interpretation
- cost-basis interpretation

Important
---------
This engine does NOT mutate the real portfolio and does NOT create artificial
trade history.

Main functions
--------------
classifyCorporateActionShareAdjustment()
calculateBonusAdjustment()
calculateSplitAdjustment()
calculateConsolidationAdjustment()
calculateRightsExerciseAdjustment()
calculateScripDividendAdjustment()
buildCorporateActionShareAdjustment()
buildShareAdjustmentExplanation()
buildCorporateActionShareAdjustmentBatch()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "classifyCorporateActionShareAdjustment\\|calculateBonusAdjustment\\|calculateSplitAdjustment\\|calculateConsolidationAdjustment\\|calculateRightsExerciseAdjustment\\|calculateScripDividendAdjustment\\|buildCorporateActionShareAdjustment\\|buildShareAdjustmentExplanation" \
  src/features/corporate-actions/*.js
