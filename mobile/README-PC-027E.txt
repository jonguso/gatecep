PC-027E — Corporate Action Income & Receivable Engine

Purpose
-------
Track investor cash benefits such as dividends from expected entitlement
through payment and reconciliation.

Lifecycle
---------
EXPECTED
→ RECEIVABLE
→ PAID
→ RECONCILED

Also supports:
- ELIGIBILITY_UNKNOWN
- OVERDUE
- NOT_APPLICABLE

Investor value
--------------
GateCEP can now distinguish:

"Dividend was announced"

from

"This investor is expected to receive KES X"

from

"This payment should now have arrived"

from

"The payment was observed and matched"

This gives Coach G context for:
- income planning
- cash-flow discussions
- dividend reinvestment
- goal progress
- missing-payment follow-up

Safeguard
---------
The engine does not mutate actual cash balances and never assumes payment
without evidence.

Main functions
--------------
buildCorporateActionReceivable()
recordCorporateActionPayment()
reconcileCorporateActionReceivable()
buildCorporateActionIncomeSchedule()
buildCorporateActionIncomeSummary()
loadCorporateActionReceivablesNeedingCoachG()

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildCorporateActionReceivable\\|recordCorporateActionPayment\\|reconcileCorporateActionReceivable\\|buildCorporateActionIncomeSchedule\\|buildCorporateActionIncomeSummary\\|loadCorporateActionReceivablesNeedingCoachG" \
  src/features/corporate-actions/*.js
