# PC-030M20AK — Historical CDSC Evidence Chain & Canonical Ownership Ledger

Adds bulk historical CDSC monthly-statement ingestion and a continuous settled-ownership evidence chain.

Integrity rules:
- Every monthly statement is retained as a dated checkpoint.
- Exact duplicate month/account evidence is ignored; conflicting evidence never silently overwrites an existing month.
- Opening + settled purchases - settled sales must reconcile to closing.
- Previous closing must reconcile to next opening.
- CDSC is authoritative for settled registered quantity, not execution price, fees, WAP or broker cost basis.
- Historical transactions remain visible; a prior BUY that was later sold is a closed historical lot, not discarded evidence.
- Existing M20AJ date normalization and settlement-alignment logic remains in place.
