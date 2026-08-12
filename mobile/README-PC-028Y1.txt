PC-028Y1 — Clarification Resolution Service Integration Fix

Reason
------
PC-028Y engine and service files installed correctly, but the original
automatic patcher expected a slightly different formatting of:

coachGReconciliationConversationService.js

PC-028Y1 targets the exact current file shown after PC-028W / PC-028X.

What it changes
---------------
1. Imports:
   buildDNAReconciliationSignalFingerprint
   buildClarificationResolutionContext

2. loadCurrentCoachGReconciliationConversation():
   - loads Investor DNA reconciliation
   - loads saved clarification history
   - resolves previously answered reconciliation signals
   - removes resolved issues from the active Coach G question queue
   - exposes dnaUpdateReview when a clarification requires field review

3. submitCoachGReconciliationClarification():
   - saves a stable signalFingerprint with the clarification
   - allows PC-028Y to find the same signal reliably on later loads

Behavior after install
----------------------
Issue A appears
Investor answers Issue A
Issue A is saved with fingerprint
Next Coach G load resolves Issue A
Issue A no longer repeats
Coach G moves to Issue B, or no check-in is shown

DNA safeguards remain:
- no automatic Investor DNA mutation
- no second DNA
- no Practice evidence
- field-level investor confirmation required before any future DNA update

Install
-------
cd ~/gatecep/mobile

python scripts/apply-pc028y1.py
bash scripts/verify-pc028y1.sh

Then restart:
npx expo start -c
