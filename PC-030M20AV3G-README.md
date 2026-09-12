# PC-030M20AV3G — Fundamental Operations & Filing Workflow Responsive Calibration

Targets:
- app/fundamental-import.js
- app/fundamental-operations-center.js
- app/filing-extraction.js
- app/filing-import-bridge.js
- app/filing-submission-history.js

The prior discovery command did not include `multi-period-filing-extraction.js` because the
shell wildcard was `filing*.js`. AV3G therefore does not guess at or modify the undiscovered
multi-period screen.

Layout-only calibration:
- 960px centered desktop containment
- compact mobile padding with 128px bottom clearance
- responsive titles
- narrow hero/action stacking where exact discovery anchors were available

No import validation, source evidence, filing lifecycle, approval, duplicate-resolution,
retry/archive, portfolio, cash, broker, or execution behavior is changed.

Verifier includes a real Expo web export smoke test.
