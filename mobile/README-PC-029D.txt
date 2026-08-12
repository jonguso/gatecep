PC-029D — Wealth Journey Reconciliation Navigation

Why this patch exists
---------------------
Manual PC-029C navigation testing passed 8 of 10 paths.

Missing:
6. Wealth Journey -> Reconciliation Conversation
7. Reconciliation Conversation -> DNA Review -> Back

Root cause
----------
Wealth Journey already rendered CoachGReconciliationCard, but the card returned
null whenever reconciliation state was NOT_REQUIRED. That made the route
invisible even though /reconciliation-conversation existed.

PC-029D behavior
----------------
Wealth Journey:
- CoachGReconciliationCard uses showWhenNotRequired={true}.
- Real investors therefore always see a Coach G Check-in entry.
- When there is no issue, the card clearly says there is no unresolved
  reconciliation issue.

Coach G card elsewhere:
- Default showWhenNotRequired remains false.
- Existing compact Coach G surfaces do not become noisy.

Reconciliation Conversation:
- If an Investor DNA change review is required:
    Review Investor DNA Changes
- Otherwise:
    View Investor DNA Review Status

Both routes open /dna-update-review.

Important safeguard
-------------------
The status button does NOT manufacture a DNA update.
The DNA review screen already shows:
"No DNA update review needed"
when shouldReview is false.

Practice policy
---------------
The Wealth Journey explanation is corrected to state that Practice is a
learning sandbox and is not Investor DNA evidence.

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc029d.py
bash scripts/verify-pc029d.sh

npx expo start -c

Retest
------
6. Wealth Journey -> Open Coach G Check-in
7. Reconciliation -> View/Review Investor DNA -> Back

Expected:
6 PASS
7 PASS
