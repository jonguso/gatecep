# PC-030M20R — Defensive Investment Policy

GateCEP no longer treats idle broker cash as a required strategic allocation.

- Every risk profile has a 0% required broker-cash minimum.
- Existing saved predefined profiles automatically adopt the corrected policy.
- Rebalancing profiles use `DEFENSIVE_INVESTMENTS`, covering verified
  money-market and fixed-income funds, instead of `CASH`.
- Operational broker cash remains visible but is excluded from asset-class drift.
- Asset-class gaps direct future contributions or dividends to defensive
  investments. They do not create equity-sale recommendations solely to raise cash.
- No MMF or fixed-income balance is fabricated before verified evidence is imported.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20r-defensive-investment-policy.sh
npx expo start --clear --lan
```
