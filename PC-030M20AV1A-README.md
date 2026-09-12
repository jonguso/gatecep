# PC-030M20AV1A — Preserve-Goal Recovery Verifier Correction

AV1 application and runtime wiring are unchanged.

The AV1 verifier stopped after the service test because some grep assertions expected
formatted source with spaces, while the installed `goal-recovery-choice.js` and
`preserveGoalRecoveryService.js` are minified/compact.

AV1A only replaces the verifier with whitespace-tolerant checks and adds explicit
route-parameter continuity assertions for goal name, target amount, target date,
monthly contribution, projected value, and goal gap.

No application source is modified.
