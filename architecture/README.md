# GateCEP Architecture

Updated: 2026-09-12

## Status

ACTIVE — UAT / release stabilization baseline.

## Purpose

This folder describes the current GateCEP system architecture. `docs/` owns governance, roadmap, UAT status, release evidence and technical-debt reconciliation. `architecture/` owns platform boundaries, canonical domains, data flows and integrity contracts.

## Current Architecture Rule

- Backend APIs own authenticated production data and external integration boundaries.
- Mobile/web are presentation clients and orchestration surfaces.
- Reusable business logic belongs in canonical shared/domain services.
- Transitional compatibility bridges may remain until their replacement package/runtime boundary is proven.
- Current runtime evidence takes precedence over stale historical status headers.
- During UAT, avoid broad architecture changes unless a reproduced defect requires them.

## Canonical Investor Domains

Dashboard = snapshot; Portfolio Hub = portfolio facts; Coach G = advice; Performance = history/analytics; Transactions = audit trail; Goals = wealth planning; Trading = execution; Profile = user management; Broker Sync/Reconciliation = broker evidence and resolution.

## Integrity Boundaries

REAL historical performance is evidence-based and must never be fabricated. Practice-only activity cannot create REAL performance history.

Historical security lots are execution-derived. Only completed broker executions (`FULLY TRADED`, `FILLED`, `COMPLETED`, `SETTLED`) may create/consume lots. Rejected/refused/non-executed orders do not alter FIFO history.

## Responsive Baseline

PC-030M20AV3AQ closed responsive UAT on 2026-09-12: 98 active screens accounted for, 27 non-active/review routes excluded, `REMAINING_UAT_VERIFY: 0`, Expo web bundle smoke PASS.
