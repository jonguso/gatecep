# PC-030M20AR9B — M20AR4 Integrity Export Regression Correction

Verification-only correction.

M20AR9 correctly exports `DECISION_DIALOGUE_INTEGRITY` as a constant. The prior M20AR9A
compatibility test incorrectly attempted to import a nonexistent function named
`buildDecisionDialogueIntegrity`.

This patch restores the legacy M20AR4 functional checks and validates the exported
`DECISION_DIALOGUE_INTEGRITY` object field-by-field, while allowing the intentional
M20AR9 additive field `actionAware: true`.

No runtime application code is changed.
