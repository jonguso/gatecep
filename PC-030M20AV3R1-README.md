# PC-030M20AV3R1 — AV3R Partial-Apply Recovery

The original AV3R successfully updated `app/existing-portal.js`, then stopped
because `app/investor-alert-review.js` did not match the original simple
StyleSheet-content regex.

AV3R1:
- validates and preserves the already-applied Existing Portal calibration;
- brace-matches `content: { ... }` objects instead of assuming a simple flat
  one-line/multiline object;
- requires the exact AV3O-discovered padding/paddingTop/paddingBottom values;
- requires exactly one matching content object per unpatched screen;
- stops if the source is ambiguous;
- changes only responsive style properties.

Do not rerun the original AV3R apply script.
