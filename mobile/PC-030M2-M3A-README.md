# PC-030M2 + PC-030M3A — Mobile Reconciliation Journey

This package introduces the shared mobile UI foundation and converts the first
two REAL broker-reconciliation steps into compact, guided screens.

## Investor journey

1. **Evidence** — upload current portfolio valuation, then cash/ledger evidence.
2. **Compare** — review the summary and page through one difference at a time.
3. Existing review, resolution, and completion routes remain unchanged.

The production data contracts are preserved: broker evidence remains read-only,
both valuation and cash evidence are required for a complete comparison, missing
cash is never interpreted as zero, and Practice holdings cannot enter the REAL
reconciliation flow.

## Files

- `src/components/mobile/MobileUI.js`
- `app/portfolio-sync-center.js`
- `app/broker-reconciliation.js`
- `scripts/verify-pc030m2-m3a-mobile.sh`
- `scripts/verify-broker-evidence-reconciliation.sh`

## Apply

From `~/gatecep/mobile`:

```bash
unzip -o ~/Downloads/gatecep-pc030m2-m3a-mobile-reconciliation.zip
chmod +x scripts/verify-pc030m2-m3a-mobile.sh
bash scripts/verify-pc030m2-m3a-mobile.sh
```

The verifier checks the mobile primitives, focused Evidence and Comparison
screens, REAL/Practice boundaries, reconciliation runtime scenarios, visible
routes, and the production web export.
