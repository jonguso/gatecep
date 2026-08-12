PC-028Y — Clarification Resolution & DNA Update Decision Engine

Purpose
-------
Close the loop after PC-028W/X saves an investor explanation.

PC-028Y:
- links a saved clarification to its original reconciliation signal
- prevents the same resolved question from appearing repeatedly
- classifies temporary vs durable evidence
- creates an explicit DNA UPDATE REVIEW proposal when warranted
- never changes Investor DNA automatically

Resolution rules
----------------
TEMPORARY_DECISION
CONSTRAINT_PREVENTED_ACTION
DID_NOT_UNDERSTAND
  -> RESOLVED_NO_DNA_CHANGE
  -> suppress repeat question

CIRCUMSTANCES_CHANGED
  -> DNA_UPDATE_REVIEW_REQUIRED
  -> suppress repeat question
  -> explicit field-level review required

INTENTIONAL
DISAGREED_WITH_RECOMMENDATION
  -> RESOLVED_MONITOR
  -> suppress repeat question
  -> monitor for repeated / explicit evidence

OTHER
  -> NEEDS_FOLLOW_UP or UNRESOLVED

Signal identity
---------------
A stable signal fingerprint uses:
- signal type
- recommendation id
- sector
- symbol
- title

New clarifications save the fingerprint directly.
Older PC-028W clarification records remain compatible because the fingerprint
can be rebuilt from clarification.evidence.originalSignal.

DNA update review
-----------------
This is a review proposal only.

Coach G may identify review domains such as:
- goal / target / timeline / priority
- risk profile / risk tolerance
- investment style / time horizon
- liquidity preference / cash needs
- sector preferences / concentration tolerance

Explicit field-level investor confirmation is still required before any
Investor DNA change can be applied.

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc028y.py
bash scripts/verify-pc028y.sh

Restart if needed:
npx expo start -c

Backups
-------
src/features/wealth-journey/coachGReconciliationConversationService.js.pc028y.bak
src/features/wealth-journey/index.js.pc028y.bak
