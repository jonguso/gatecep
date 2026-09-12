# PC-030M20AV3V1 — AV3V Partial-Apply Recovery

The original AV3V successfully updated:
- app/execution-audit.js
- app/execution-bridge.js

It then stopped because `app/execution-wizard.js` uses compact StyleSheet syntax:

`content:{padding:22,paddingTop:70,paddingBottom:120}`

rather than the spaced form expected by AV3V.

AV3V1:
- validates the already-applied Audit and Bridge changes;
- patches only the exact compact Execution Wizard style anchor;
- preserves all Practice/REAL execution boundaries;
- replaces the original AV3V verifier with the same full three-screen contract checks;
- runs the Expo web bundle smoke test.

Do not rerun the original AV3V apply script.
