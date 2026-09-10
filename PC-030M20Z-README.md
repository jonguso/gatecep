# PC-030M20Z — Weighted Average Buy Guard

Coach G now previews the effect of an additional purchase on an existing holding's weighted average cost.

- Uses current quantity, weighted average price, proposed quantity, proposed price and all estimated charges.
- Shows all-in cost per new share and projected weighted average.
- Calculates the maximum limit price that will not raise the current weighted average.
- Floors the threshold to avoid presenting an unsafe rounded-up price.
- Requires fee evidence for an exact threshold outside the labelled Practice fee assumptions.
- Does not block or place a REAL trade; a lower average cost is not itself a reason to buy.

Example: 300 EABL at KES 271.04 plus 100 shares at KES 270 with 1.4% displayed Practice charges produces an all-in unit cost of KES 273.78 and projected average of KES 271.73. The maximum illustrative limit price is KES 267.29.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20z-weighted-average-buy-guard.sh
```
