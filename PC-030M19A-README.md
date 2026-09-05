# PC-030M19A — Practice Trade Boundary

- All GateCEP trade entry, basket, routing, order, fill, handoff, and execution-audit screens are Practice-only.
- The Practice queue no longer calls a connected-broker adapter.
- GateCEP cannot locally label a simulated fill as `BROKER_CONFIRMATION`.
- Practice timestamps describe simulations only.
- REAL buys and sells remain read-only broker evidence and must retain the broker-provided execution date, price, quantity, fees, and reference.

## Verify

```bash
cd ~/gatecep/mobile
bash scripts/verify-pc030m19a-practice-trade-boundary.sh
```
