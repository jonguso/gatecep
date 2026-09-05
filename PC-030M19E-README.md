# PC-030M19E — Connected Broker Cash Lock

This focused update closes the two gaps left after the existing REAL cash evidence work.

- Manual Funds entry cannot overwrite cash when a REAL broker account is connected.
- Connected investors are sent through Portfolio Sync Center and verified broker evidence.
- Broker statement evidence requires its own effective date.
- If a transaction-style ledger has no statement header, its highest valid `Date`-column value becomes the balance effective date.
- Upload time and unlabelled dates cannot substitute for the statement date.
- Initial cash setup remains available when no REAL broker account is connected.
- Practice and simulation accounts remain outside the REAL cash lock.

Run from `mobile`:

```bash
bash scripts/verify-pc030m19e-connected-broker-cash-lock.sh
```
