# PC-030M20Y — Unified Alert Evidence

Portfolio-aware news alerts now reuse GateCEP's existing Coach G alert notification flow.

- Reported dividend dates are extracted as clues and clearly kept separate from verified facts.
- Dividend entitlement still requires official dates and historical broker/custodian holding evidence.
- News synchronizes personalized alerts into the existing local alert store without resetting read state.
- Intelligence Center merges local Coach G alerts with backend notifications.
- Dashboard bell displays the unread count and opens the same Intelligence Center.
- Alert taps open the existing portfolio-impact review.

Verify from `mobile`:

```bash
bash scripts/verify-pc030m20y-unified-alert-evidence.sh
```
