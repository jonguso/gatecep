PC-028T — Investor DNA Reconciliation Engine

Mission fit
-----------
GateCEP does not create a second Investor DNA when real data arrives.

The original conversational Investor DNA remains the investor's initial
self-described intention.

Real holdings, cash, orders, trades, portfolio health and follow-through on
Coach G recommendations become evidence that Coach G reconciles against that
initial DNA over time.

Core principle
--------------
Observed behavior is evidence to discuss, not proof of intent.

Example
-------
Initial plan:
  reduce heavy Banking concentration
  add Consumer exposure

Observed real behavior:
  investor continued buying Banking

PC-028T does NOT say:
  "The investor is wrong."
  "The DNA changed automatically."

Instead:
  - records a recommendation-follow-through mismatch
  - raises the concentration signal
  - creates a hypothesis
  - asks Coach G to understand WHY
  - only proposes a durable DNA update after explicit investor confirmation

Practice
--------
Practice is never accepted as Investor DNA reconciliation evidence.

PC-028T inputs
--------------
Initial:
  investorDNA
  wealthBlueprint

Real evidence:
  canonical real portfolio
  available cash
  portfolio health
  behavior analytics
  real order history
  real trade history
  recommendation history
  real Wealth Journey state

Outputs
-------
signals
classification / score
hypotheses
Coach G questions
DNA update proposal
safeguards

Status model
------------
ALIGNED
WATCH
DRIFTING
MATERIAL_DRIFT
NOT_ENOUGH_DATA

Important safeguard
-------------------
DNA updates are proposals only.

Observed behavior alone cannot mutate Investor DNA.
Investor confirmation is required before durable DNA changes can be applied.

Runtime history note
--------------------
recommendationHistory, orderHistory and tradeHistory are injectable in this
build because GateCEP currently has more than one history/execution store.
PC-028T intentionally does not guess which store is canonical.

A follow-up integration build can wire the exact real recommendation/order/
trade stores once they are identified.

Install
-------
Extract into ~/gatecep/mobile.

Then:

cd ~/gatecep/mobile

grep -n \
  "buildInvestorDNAReconciliation\\|loadCurrentInvestorDNAReconciliation" \
  src/features/wealth-journey/*.js

Optional index exports
----------------------
Add to src/features/wealth-journey/index.js:

export * from "./investorDNAReconciliationEngine";
export * from "./investorDNAReconciliationRuntime";

Verify
------
bash scripts/verify-pc028t.sh
