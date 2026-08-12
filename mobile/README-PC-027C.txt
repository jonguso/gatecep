PC-027C — Investor Corporate Action Entitlement Engine

Purpose
-------
Personalize a corporate action for a specific GateCEP investor.

The engine answers:

1. Does this investor appear eligible?
2. What quantity is eligible?
3. What cash may they receive?
4. What shares may they receive?
5. How many rights may they receive?
6. How much capital would exercising those rights require?
7. Does Coach G need to explain or discuss a decision?

Supported calculations
----------------------
Cash dividend / special dividend
Bonus issue
Rights issue
Stock split
Share consolidation

Eligibility evidence
--------------------
The engine prefers:

eligibleQuantity
quantityOnRecordDate
manual confirmation
current holding + date evidence

If GateCEP only knows the current holding but lacks record-date evidence,
eligibility is marked ELIGIBILITY_UNKNOWN instead of being guessed.

Important safeguard
-------------------
PC-027C does NOT change holdings, cash, cost basis, or broker state.

It calculates the investor-specific EXPECTED entitlement only.

Main functions
--------------
determineCorporateActionEligibleQuantity()
calculateCashDividendEntitlement()
calculateBonusShareEntitlement()
calculateRightsEntitlement()
calculateSplitEntitlement()
buildInvestorCorporateActionEntitlement()
buildEntitlementExplanationFocus()
buildInvestorCorporateActionEntitlementBatch()
loadInvestorCorporateActionsRequiringDecision()
loadInvestorCorporateActionsWithUnknownEligibility()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "determineCorporateActionEligibleQuantity\\|calculateCashDividendEntitlement\\|calculateBonusShareEntitlement\\|calculateRightsEntitlement\\|calculateSplitEntitlement\\|buildInvestorCorporateActionEntitlement\\|buildEntitlementExplanationFocus\\|loadInvestorCorporateActionsRequiringDecision" \
  src/features/corporate-actions/*.js
