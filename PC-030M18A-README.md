# PC-030M18A — Practice Reconciliation Isolation

Broker reconciliation is now a Practice-only, non-executing journey.

- It reads the Practice portfolio and an explicitly Practice-scoped sandbox mirror.
- It cannot read or update REAL holdings, cash, performance history, or broker source-of-truth evidence.
- Cases, resolutions, actions, decision ledger, and audit history use separate Practice storage keys.
- The REAL Portfolio Sync Center no longer invokes reconciliation.
- Reconciliation screens are visibly marked **PRACTICE ONLY** and retain focused mobile issue panels.

## Verify

```bash
cd ~/gatecep/mobile
bash scripts/verify-pc030m18a-practice-reconciliation-isolation.sh
```
