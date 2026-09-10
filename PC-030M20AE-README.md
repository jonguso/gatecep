# PC-030M20AE — Required Transaction History

Transaction history is promoted from the optional Manage section into Required Broker Evidence.

- Portfolio valuation, cash/ledger evidence, and transaction/lot history must all be available before reconciliation can advance.
- The primary action guides the investor to whichever required item is missing.
- Completed order history may support FIFO analytics even when it lacks the settlement evidence required to mutate REAL records.
- Rejected, expired and cancelled orders never qualify as acquisition or disposal lots.
- The sync status records lot-history readiness and its completed execution/security counts.
- The Average Cost Simulator reads the same centralized lot-history evidence service.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20ae-required-transaction-history.sh
```
