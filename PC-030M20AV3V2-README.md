# PC-030M20AV3V2 — AV3V Partial-Apply Recovery Correction

AV3V1 stopped while validating `app/execution-bridge.js` because its validator
looked for the exact string `maxWidth: 960`. The already-applied bridge uses the
compact equivalent `maxWidth:960`.

AV3V2 corrects only that recovery-validator defect.

It:
- validates Execution Audit and Execution Bridge with whitespace-tolerant regex;
- does not rewrite either already-applied screen;
- patches Execution Wizard only if the exact compact audited style anchor is present;
- preserves the Practice-only execution review boundary;
- runs the full AV3V contract verifier and Expo web bundle smoke test.

Do not rerun AV3V or AV3V1.
