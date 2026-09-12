# PC-030M20AV3X — Reconciliation Conversation Responsive Calibration

AV3W1 confirmed `/reconciliation-conversation` is canonically reachable from
the current Wealth Journey via `CoachGReconciliationCard`.

This package intentionally targets only:
- app/reconciliation-conversation.js

Responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

The patch requires the audited current baseline (`paddingBottom: 40`) and stops
rather than applying a broad fallback if the structure has changed.

Protected business semantics:
- Coach G saves investor explanation as confirmed clarification evidence.
- Investor DNA is not changed automatically.
- A single response does not automatically rewrite Investor DNA, place trades,
  or change the portfolio.

Legacy candidates identified by AV3W1 are not touched.
