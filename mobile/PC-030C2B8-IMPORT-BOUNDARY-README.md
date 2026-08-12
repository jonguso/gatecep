# PC-030C2B8 — Canonical Snapshot Import-Boundary Cleanup

This cleanup does not change the V2 snapshot writer, stored snapshots, lifecycle
reasons, Performance calculations, or Practice/REAL separation.

It moves the two known Performance readers to the canonical service path:

- `app/performance.js`
- `src/features/performance/historicalPerformanceSummaryService.js`

The legacy `src/portfolio/portfolioSnapshot.js` wrapper remains available for
unknown compatibility consumers.

## Apply

Extract this archive into `~/gatecep/mobile`, preserving paths and replacing
the included files.

## Verify

```bash
cd ~/gatecep/mobile
chmod +x scripts/verify-pc030c2b8-import-boundary.sh
chmod +x scripts/verify-pc030c2b9.sh
bash scripts/verify-pc030c2b8-import-boundary.sh
bash scripts/verify-pc030c2b9.sh
```

The B9 verifier is now location-independent and distinguishes legitimate
Performance snapshot readers from forbidden analytics/wealth back-dependencies.
