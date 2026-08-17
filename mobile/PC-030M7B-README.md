# PC-030M7B — Trackable Goal Details

Wealth Journey now provides a direct way to clear
`TRACKABLE_GOAL_DETAILS`.

The investor can select **Add Required Goal Details** from the readiness
warning or the goal card, enter a target amount and target date, and return to
Wealth Journey after saving.

The structured goal is stored in the existing investor profile contract and
is used by Wealth Journey and Performance goal intelligence. The legacy goal
category remains a compatibility field; no second amount/date store is
introduced. Practice Portfolio values are excluded.

The REAL wealth-activation boundary preserves these structured goals. It no
longer rebuilds every session from the original intent while resetting the
saved target amount and target date to `null`.

Existing integrity rules remain unchanged:

- A target amount without a target date cannot produce an on-track claim.
- Goal progress uses canonical REAL net worth.
- Missing values remain unavailable instead of becoming zero.

## Verify

```bash
chmod +x scripts/verify-pc030m7b-trackable-goal-details.sh
bash scripts/verify-pc030m7b-trackable-goal-details.sh
```
