# PC-030M7B1 — Goal Save Activation Fix

This correction closes the runtime gap discovered after PC-030M7B.

The Goal Details editor was saving the target amount and target date to the
canonical investor profile. However, the REAL wealth-activation adapter rebuilt
the active goal from the original intent and reset both saved values to `null`.

M7B1 carries structured investor-profile goals through the canonical REAL
wealth context and gives them priority over the intent-only fallback. Practice
Portfolio remains excluded, and every PC-030C2C8 historical-integrity rule is
preserved.
