# PC-030M20AV3AB — Review Portfolio Import Responsive Calibration

AV3W1 confirmed `/review-portfolio-import` is canonically reachable from
`/import-portfolio`.

This is intentionally a single-screen high-integrity package because the screen
contains two materially different confirmation paths.

RECONCILE path:
- saves a verified uploaded broker mirror;
- marks valuation evidence ready;
- returns to Portfolio Sync Center;
- explicitly does not change REAL holdings.

Initial REAL import path:
- refuses ordinary replacement when a connected REAL broker exists;
- saves the initial REAL portfolio only when the connected-broker guard permits it;
- retains canonical snapshot reason `CONFIRMED_PORTFOLIO_IMPORT`.

Responsive changes only:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

No branch logic, broker evidence policy, portfolio mutation, cloud sync, or snapshot
semantics are intentionally changed.
