# PC-031A3-V2 — Verifier Maintenance After A4

Purpose:
- Update the PC-031A3 verifier so it remains valid after PC-031A4 intentionally added REAL broker routing.
- Preserve the original A3 execution-mode checks.
- Replace the stale global `placeBrokerOrder` prohibition with checks that broker submission is centralized behind `routeExecutionOrderByMode`.
- Confirm Practice returns before REAL adapter routing.
- Confirm REAL routing still does not fabricate `BROKER_RECEIVED`.

This patch changes verification only. It does not modify runtime application code.
