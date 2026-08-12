PC-028X1 — Coach + Wealth Journey Integration Fix

Why
---
The original PC-028X component and full reconciliation screen installed
correctly, but the automatic patch could not find a generic Coach screen
anchor.

The actual Coach screen begins:

<ScrollView ...>
  <Text style={styles.title}>Coach G Insights</Text>

PC-028X1 targets that exact structure.

Coach placement
---------------
Immediately after:

Coach G Insights

This makes reconciliation a top-priority Coach G check-in before the
traditional Portfolio Review.

Wealth Journey placement
------------------------
Immediately before ReadinessBanner.

This keeps reconciliation visible near the top of the real Wealth Journey.

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc028x1.py
bash scripts/verify-pc028x1.sh

Then restart:

npx expo start -c

Expected
--------
Coach tab:
  Coach G Insights
  [Coach G Check-in card, only when clarification is required]
  Coach G Portfolio Review
  ...

Wealth Journey:
  [Coach G reconciliation card, only when clarification is required]
  Readiness
  ...

The full response route remains:

/reconciliation-conversation

Safeguards
----------
Practice evidence remains excluded.
Investor DNA is not automatically changed.
No trades or holdings are modified.
