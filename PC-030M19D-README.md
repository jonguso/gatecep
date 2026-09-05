# PC-030M19D — First Trade Practice Isolation

This update closes a legacy onboarding leak in `/first-trade`.

- First Trade now reads and writes `practicePortfolio` only.
- Simulated cash never changes canonical REAL `availableCash`.
- Simulation no longer marks REAL statements, broker readiness, or sync status complete.
- Practice trades use `practiceSimulatedTrades` with explicit Practice evidence labels.
- Practice Order Book reads the same isolated history.

Run from `mobile`:

```bash
bash scripts/verify-pc030m19d-first-trade-practice-isolation.sh
```
