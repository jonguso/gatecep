PC-027B — Corporate Action Lifecycle Engine

Purpose: move a corporate action through a controlled lifecycle so GateCEP can understand what is happening to the investor and give Coach G the context needed to explain, monitor, and later recommend.

Adds:
- lifecycle transitions and validation
- lifecycle audit history
- progress calculation
- investor-attention classification
- Coach G context flags
- prioritization of events requiring investor attention

Safeguard:
PC-027B does not change holdings, cash, cost basis, or execute an investor decision.

Install: extract into ~/gatecep/mobile

Verify:
grep -n "CORPORATE_ACTION_LIFECYCLE_EVENTS\|canTransitionCorporateAction\|transitionCorporateActionLifecycle\|calculateCorporateActionLifecycleProgress\|classifyCorporateActionInvestorAttention\|buildCorporateActionLifecycleAnalysis\|loadCorporateActionsNeedingInvestorAttention" src/features/corporate-actions/*.js
