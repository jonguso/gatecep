PC-028U — Real Behavior History Integration, Source Discovery Stage

Why this stage exists
---------------------
PC-028T can already reconcile:

- initial Investor DNA
- Wealth Blueprint
- canonical real portfolio
- portfolio health
- behavior analytics
- Wealth Journey

The remaining inputs are:

- REAL recommendation history
- REAL order history
- REAL trade history

GateCEP currently contains several history / execution stores, including
Practice and simulation features. We must not guess which ones are canonical
because that could contaminate Investor DNA reconciliation with simulated
activity.

PC-028U therefore does two things:

1. Adds a strict real-history source policy.
2. Provides discovery scripts to identify the actual GateCEP stores before
   wiring them into PC-028T.

Real-history safeguard
----------------------
A history record is accepted only when it can be classified REAL.

PRACTICE -> rejected
UNKNOWN  -> rejected
REAL     -> accepted

This is intentionally conservative.

Files
-----
src/features/wealth-journey/realBehaviorHistorySourcePolicy.js

scripts/pc028u-discover-real-history.sh
scripts/pc028u-inspect-likely-history-files.sh
scripts/verify-pc028u.sh

Run
---
cd ~/gatecep/mobile

bash scripts/verify-pc028u.sh

bash scripts/pc028u-discover-real-history.sh

Then, if needed:

bash scripts/pc028u-inspect-likely-history-files.sh

What to send back
-----------------
Send the output from:

bash scripts/pc028u-discover-real-history.sh

That will let the next PC-028U integration step wire the actual canonical
recommendation/order/trade stores into:

loadCurrentInvestorDNAReconciliation()

without allowing Practice activity into Investor DNA reconciliation.
