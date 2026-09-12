# PC-030M20AV3N1 — Residual Audit Classification Correction

AV3N successfully exposed a large residual set, but its auth/setup classifier had
a pattern defect: `app/onboarding/*` did not match the intended onboarding rule,
and `app/signup.js` was not included in the auth family.

AV3N1 corrects only the audit classifier.

It does not patch GateCEP application code and does not change any responsive
screen styles.

After applying AV3N1, rerun the audit. The new report will remove onboarding and
signup false positives from the investor-facing residual list while still
reporting them separately for a later setup/auth responsive pass.

This prevents a mass patch from being built from a knowingly inflated residual
count.
