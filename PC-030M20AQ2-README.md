# PC-030M20AQ2 — Inline-Style Trading Route Hotfix

Corrects AQ1's failed UI injection when the host `mobile/app/(tabs)/trading.js` has a StyleSheet closing format that does not match the patcher's expected anchor.

This hotfix deliberately uses local inline style objects inside `DecisionLabHome`, so it does not edit or depend on the existing `StyleSheet.create(...)` block. It still targets only the existing Trading tab, retains Account / Orders / Depth / Activity as Broker Evidence, and keeps all Decision Lab calculations read-only.

It also passes BUY/SELL route intent into the existing `/trade` scenario engine. No REAL, Practice, CDSC, transaction, cash, or broker evidence is mutated by the Decision Lab.
