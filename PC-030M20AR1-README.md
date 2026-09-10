# PC-030M20AR1 — Decision Lab Regression Contract Correction

This hotfix changes verification only. It does not modify application code.

M20AR intentionally replaced the old two-button `Simulate a Buy` / `Simulate a Sell` landing controls with a richer decision-conversation entry layer. The prior M20AQ3 verifier incorrectly required those retired labels, so it failed even though the new M20AR contract was present and its own verification had passed.

The corrected M20AQ3 verifier now accepts either:
- the original M20AQ2/AQ3 BUY/SELL landing controls, or
- the M20AR unified conversation entry controls (`I have a decision`, `What if I add money?`, `Explore a security idea`, `Explore a reduction / sell`).

It continues to verify Active Account ordering, Decision Lab subtitle, goal/recovery context, Broker Action Plan separation, Trading data integration, removal of duplicate broker-evidence UI, and preservation of dedicated broker routes.
