# PC-030M19B — Broker Execution Evidence

- REAL BUY/SELL records require broker execution date, broker reference, broker identity, executed quantity, executed price, fees, and settlement evidence.
- Missing or manual records remain `UNVERIFIED` and cannot qualify as REAL portfolio evidence.
- GateCEP never substitutes upload time for a missing broker execution date.
- Verified and unverified records are stored separately.
- Transaction review and upload previews use contained mobile panels.
- Practice trading remains isolated.

## Verify

```bash
cd ~/gatecep/mobile
bash scripts/verify-pc030m19b-broker-execution-evidence.sh
```
