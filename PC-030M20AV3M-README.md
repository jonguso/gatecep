# PC-030M20AV3M — Broker Sync, Routing & Controlled Import Responsive Calibration

Targets:
- app/broker-sync.js
- app/broker-routing.js
- app/broker-portfolio-import.js

Responsive scope:
- 960px centered desktop containment
- 128px bottom clearance
- row/header/card wrapping where the existing layout can overflow
- flexible 47% metric cards where present

Preserved contracts:
- Broker Sync loads independent REAL broker evidence for read-only comparison and does not place trades.
- Broker Sync keeps the current valuation/cash evidence handoffs into reconciliation and Portfolio Sync Center.
- Broker Routing remains Practice-only; no REAL order is transmitted.
- Broker Routing keeps verified broker-charge comparison semantics and does not invent unavailable fee evidence.
- Controlled Portfolio Import updates canonical REAL only after approved reconciliation and current broker mirror validation.
- Controlled Portfolio Import does not place a trade or modify the broker account.
- Existing approved-import execution and portfolio-ledger backfill semantics are unchanged.

No broker API behavior, trade execution semantics, reconciliation approval logic,
portfolio accounting, fee-evidence meaning, or canonical portfolio mutation rules are changed.

Verifier includes a real Expo web export smoke test.
