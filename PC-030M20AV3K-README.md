# PC-030M20AV3K — Broker Account Responsive Residual Calibration

Targets:
- app/broker-account-center.js
- app/broker-accounts.js
- app/broker-profile.js
- app/broker-status.js
- app/broker-upload.js
- app/brokers.js

This wave deliberately excludes the consequential reconciliation/resolution family,
which remains for a separate controlled follow-on package.

Layout-only changes:
- 960px centered desktop containment
- 128px bottom clearance
- wrapping broker headers/tabs where those row layouts exist
- Broker Accounts summary metric flexibility

Preserved boundaries:
- Broker Account Center remains POC/demo profile linking.
- Broker Accounts remains canonical for linked accounts, default broker and fee evidence.
- Disconnecting a broker does not erase portfolio history.
- Fee schedules are not marked verified without source/date/explicit verification evidence.
- Broker Profile remains a compatibility statement-matching profile and converges to canonical accounts.
- Broker Status stays Practice-only and separate from REAL broker synchronization.
- Broker Upload evidence paths remain valuation + cash/ledger + transaction history.
- No REAL trade execution, reconciliation approval, portfolio mutation or broker API behavior is added.

Verifier includes a real Expo web export smoke test.
