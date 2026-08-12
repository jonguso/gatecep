PC-027G — Corporate Action Decision Intelligence

Purpose
-------
Turn corporate actions that require an investor choice into a personalized
Coach G decision framework.

Designed for
------------
Rights issues
Scrip dividends
Merger / acquisition elections
Other optional corporate-action elections

Uses
----
Investor goal
Investor DNA context
Available cash
Current / projected concentration
Portfolio impact
Valuation context
Investment quality / conviction
Behavior signals

Possible advisory outcomes
--------------------------
EXERCISE_FULL
EXERCISE_PARTIAL
TAKE_CASH
TAKE_SHARES
HOLD_WAIT
REVIEW_FURTHER
NO_ACTION_REQUIRED

Important
---------
This is advisory only.

Coach G explains the trade-offs.
The investor makes the final decision.
No order, election, cash movement, or portfolio mutation is executed here.

Main functions
--------------
calculateCorporateActionDecisionScore()
classifyCorporateActionDecision()
classifyCorporateActionDecisionConfidence()
buildCorporateActionDecisionIntelligence()
buildCorporateActionDecisionExplanation()
buildCorporateActionDecisionIntelligenceBatch()
loadCorporateActionDecisionsRequiringCoachG()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "calculateCorporateActionDecisionScore\\|classifyCorporateActionDecision\\|classifyCorporateActionDecisionConfidence\\|buildCorporateActionDecisionIntelligence\\|buildCorporateActionDecisionExplanation\\|buildCorporateActionDecisionIntelligenceBatch\\|loadCorporateActionDecisionsRequiringCoachG" \
  src/features/corporate-actions/*.js
