# PC-030M20AQ3B — Trading UI Verification Correction

This hotfix changes verification only. It does not modify mobile application code.

Why: M20AQ3 intentionally removed the broker-account controls from the Trading render. The original verifier incorrectly required the string `broker-accounts` to remain inside `mobile/app/(tabs)/trading.js`, even though broker account support is preserved by its dedicated routes/services outside that screen.

M20AQ3B verifies preservation at the architecture level instead:
- Decision Lab remains rendered.
- Active Account remains above Decision Lab.
- obsolete Broker Evidence UI remains absent from the Trading render.
- dedicated broker account / broker profile / portfolio sync routes remain present in the app.
- trading data service integration remains present.
- no REAL/Practice mutation contract is changed.
