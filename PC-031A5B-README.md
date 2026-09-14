# PC-031A5B — Verified Receipt Boundary + Shared Orders Review

Purpose:
- Harden the generic `markBrokerReceived()` helper so a REAL order cannot be manually advanced to BROKER_RECEIVED.
- Keep PRACTICE broker receipt behavior available.
- Remove the stale unused `markBrokerReceived` import from `orders.js`.
- Make Orders Review reflect the execution mode instead of always saying Practice.

This is intentionally a small boundary-hardening patch before REAL order-entry is connected from Trade/Coach G.

Safety:
- No new REAL order creation yet.
- No REAL fill.
- No REAL portfolio/cash/FIFO mutation.
- No commit.
- No push.
