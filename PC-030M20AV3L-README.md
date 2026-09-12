# PC-030M20AV3L — Broker Reconciliation & Resolution Responsive Calibration

Targets:
- app/broker-reconciliation.js
- app/broker-reconciliation-case.js
- app/broker-reconciliation-cases.js
- app/broker-reconciliation-insight.js
- app/broker-reconciliation-actions.js
- app/broker-resolution.js
- app/broker-resolution-ledger.js
- app/broker-sync-history.js

Responsive scope:
- The two large ScrollView history/action screens receive 960px centered desktop
  containment and 128px bottom clearance.
- Existing canonical `MobileScreen` / `StickyActionBar` screens keep that shell.
- Local rows, headers, issue headers and route/history links gain wrapping where
  appropriate to avoid narrow-screen overflow.

Integrity scope:
- Practice reconciliation remains isolated from REAL holdings, cash, performance
  and connected-broker source-of-truth evidence.
- Case review and Coach G insight remain explanatory only.
- Resolution choices remain sandbox notes and cannot trade, import or mutate REAL.
- Action workflow states do not place trades, move cash or modify broker accounts.
- Resolution ledger and sync history remain read-only audit/history.
- Existing evidence-required and Evidence -> Compare -> Review -> Resolve -> Complete
  flow is unchanged.

No reconciliation decision math, approval semantics, broker records, portfolio
mutation logic, evidence loading, or route destinations are changed.

Verifier includes a real Expo web export smoke test.
