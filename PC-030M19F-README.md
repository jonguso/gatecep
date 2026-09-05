# PC-030M19F — Connected Broker Holdings Lock

This update applies the same source-of-truth rule to REAL holdings that M19E applies to REAL cash.

- Manual portfolio entry is initial-setup only.
- Ordinary portfolio imports are initial-setup only.
- Once a REAL broker is connected, those routes cannot mutate canonical REAL holdings.
- Connected investors use verified broker evidence or a live broker adapter.
- Reconciliation uploads remain read-only until the investor confirms the authoritative replacement.
- Practice and simulation accounts do not trigger the REAL holdings lock.

Run from `mobile`:

```bash
bash scripts/verify-pc030m19f-connected-broker-holdings-lock.sh
```
