PC-027H — Coach G Corporate Action Advisor

Purpose
-------
Unify PC-027B through PC-027G into one Coach G-ready investor advice service.

Coach G can now answer:
- What happened?
- Does it affect this investor?
- What are they entitled to?
- What is the expected portfolio impact?
- Is income expected?
- Is a share adjustment expected?
- Does the investor need to decide anything?
- What does Coach G currently recommend?
- Why?
- What should happen next?

Outputs
-------
priority
lifecycle
entitlement
portfolioImpact
receivable
shareAdjustment
decision
nextBestAction
narrative

Main functions
--------------
buildCoachGCorporateActionAdvice()
buildCoachGCorporateActionAdviceBatch()
buildCoachGCorporateActionSummary()
loadCoachGCorporateActionAdvice()
loadCoachGHighPriorityCorporateActions()
loadCoachGCorporateActionsRequiringDecision()
loadCoachGCorporateActionIncomeEvents()
loadCoachGTopCorporateAction()

Safeguard
---------
Coach G remains advisory.
No portfolio mutation, cash mutation, election execution, or assumed external confirmation occurs here.

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildCoachGCorporateActionAdvice\\|buildCoachGCorporateActionAdviceBatch\\|buildCoachGCorporateActionSummary\\|loadCoachGCorporateActionAdvice\\|loadCoachGHighPriorityCorporateActions\\|loadCoachGCorporateActionsRequiringDecision\\|loadCoachGCorporateActionIncomeEvents\\|loadCoachGTopCorporateAction" \
  src/features/corporate-actions/*.js
