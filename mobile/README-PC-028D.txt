PC-028D — Investor DNA Evidence Update Engine

Purpose
-------
Turn observed behavior into confidence-weighted Investor DNA evidence without
automatically changing the investor profile.

Flow
----
Observed behavior
+ Goal context
+ Current Investor DNA
+ Coach G clarification
↓
Evidence item
↓
Confidence
↓
Proposed DNA change
↓
Confirm / Defer / Reject / Keep Current
↓
Confirmed update proposal
↓
Apply only approved traits

Supported DNA evidence areas
----------------------------
Investment style
Contribution discipline
Loss sensitivity
Liquidity sensitivity
Concentration tendency
Holding-period tendency
Trading activity
Goal commitment
Decision discipline

Important rules
---------------
Observation is evidence, not truth.
Conflicting evidence is preserved.
Coach G clarification can strengthen, weaken, defer or reject a hypothesis.
No DNA trait is automatically changed simply because behavior differs from the current profile.

Main functions
--------------
buildInvestorDNAEvidenceFromAlignment()
attachCoachGClarificationToEvidence()
resolveInvestorDNAEvidence()
buildInvestorDNAUpdateProposal()
applyConfirmedInvestorDNAUpdates()
buildInvestorDNAEvidenceReview()
buildInvestorDNAEvidenceNarrative()
buildInvestorDNAEvidenceReviewBatch()
loadInvestorDNAEvidenceNeedingClarification()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildInvestorDNAEvidenceFromAlignment\\|attachCoachGClarificationToEvidence\\|resolveInvestorDNAEvidence\\|buildInvestorDNAUpdateProposal\\|applyConfirmedInvestorDNAUpdates\\|buildInvestorDNAEvidenceReview\\|buildInvestorDNAEvidenceNarrative\\|loadInvestorDNAEvidenceNeedingClarification" \
  src/features/wealth-journey/*.js
