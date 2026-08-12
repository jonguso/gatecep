PC-029B — Broken Route Repair + Navigation Audit Fix

Confirmed route decisions
-------------------------
/holdings-import -> /manual-portfolio-entry

Reason:
The Brokers screen describes Holdings Report as a fallback when the full
valuation is unavailable. The existing Manual Portfolio Entry screen is the
supported holdings-only fallback already present in GateCEP.

/oms-orders -> /orders

Reason:
Execution Bridge already separates Review Orders, Queue/Trading, and Execution
Audit. The existing /orders screen is therefore the current order-management
destination for OMS Orders.

Audit correction
----------------
The PC-029A audit incorrectly treated /(tabs)/dashboard and other route-group
qualified paths as broken. PC-029B recognizes both public and group-qualified
Expo Router paths.

Housekeeping
------------
All files containing .bak are moved out of app/ into:

archive/expo-router-nonroutes/bak/

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc029b-navigation-repair.py
bash scripts/verify-pc029b-navigation.sh

npx expo start -c

Expected audit result
---------------------
BROKEN STATIC ROUTE TARGETS
NONE

Next
----
PC-029C should be a visible navigation walk through:
Dashboard -> Portfolio Hub -> Coach G -> Wealth Journey ->
Reconciliation Conversation -> DNA Review -> back navigation.
