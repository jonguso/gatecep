PC-028Z — Explicit Investor DNA Review & Confirmation UI

Purpose
-------
PC-028Y can identify that a clarification requires an explicit Investor DNA
review. PC-028Z provides the field-level confirmation experience.

Flow
----
DNA_UPDATE_REVIEW_REQUIRED
-> show affected DNA domains
-> show current values
-> investor enters proposed new values
-> investor explicitly confirms each changed field
-> investor approves the overall review
-> save CONFIRMED_PENDING_APPLICATION instruction

Important
---------
PC-028Z does NOT overwrite Investor DNA.

It stops at:
CONFIRMED_PENDING_APPLICATION

The next controlled application step can consume only those explicitly
confirmed fields.

Storage
-------
investorDNAUpdateConfirmations

New route
---------
/dna-update-review

The reconciliation conversation screen shows:
Review Investor DNA Changes
only when dnaUpdateReview.shouldReview === true.

Safeguards
----------
- no Practice evidence
- no second Investor DNA
- no automatic DNA mutation
- no portfolio mutation
- no trade placement
- explicit field-level confirmation required

Install
-------
cd ~/gatecep/mobile
python scripts/apply-pc028z.py
bash scripts/verify-pc028z.sh
npx expo start -c
