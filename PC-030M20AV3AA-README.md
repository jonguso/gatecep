# PC-030M20AV3AA — Import Portfolio Responsive Calibration

AV3W1 confirmed `/import-portfolio` is canonically reachable from current broker,
existing-portal, and Portfolio Sync Center flows.

This package targets only:
- app/import-portfolio.js

Responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

Protected import/evidence boundaries:
- safe file and row validation remain required;
- verified CDS and broker evidence identity checks remain required;
- `BROKER_RECONCILIATION_EVIDENCE` remains distinct from `INITIAL_REAL_PORTFOLIO`;
- extraction still hands off to `/review-portfolio-import`;
- this package does not confirm, save, or mutate the REAL portfolio.

`review-portfolio-import.js` is intentionally deferred to its own higher-risk package.
