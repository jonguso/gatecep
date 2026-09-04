# PC-030M13D — Security Landing + Practice Isolation

- Every Market and embedded-watchlist row opens `/security/[symbol]` directly.
- Security Education includes verified quote/depth fields and no longer reopens the repeated depth sheet.
- The primary navigation action is **Back to Markets**.
- The practice-only **Simulate / Place Trade** action is removed from the REAL security-research journey.
- `app/trade.js` is explicitly labeled **Practice Trade**.
- Practice execution reads/writes `practicePortfolio` and `practiceSimulatedTrades` only.
- Practice execution no longer mutates `portfolio`, `availableCash`, statement flags, broker readiness, sync status, or canonical REAL performance snapshots.

## Prior contamination audit

Before this correction, a simulated trade could update legacy local consumers of `portfolio`, `availableCash`, `simulatedTrades`, `statementUploaded`, `firstTradeCompleted`, `brokerReadiness`, and `syncStatus`, and could request a REAL snapshot. The backend-authoritative main dashboard did not use those mutations, which is why it correctly remained unchanged. This package prevents new contamination; it intentionally does not guess or overwrite pre-existing broker cash while cleaning old local data.
