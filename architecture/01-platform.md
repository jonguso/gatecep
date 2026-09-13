# 01 — GateCEP Platform Architecture

Updated: 2026-09-12

## Status

ACTIVE — GateCEP 5.0 UAT / Release Stabilization

## Vision

GateCEP is a broker-agnostic, multi-client investment and wealth-management platform composed of backend APIs, mobile/web clients, canonical domain services, Coach G intelligence, broker integration/reconciliation, and market-data integration.

## Architectural Principle

Production data is owned behind authenticated backend/API boundaries. Reusable business rules belong in canonical shared/domain services. Clients should present and orchestrate rather than independently redefine portfolio, market, cash, risk, goal, performance or execution rules.

Transitional bridges are allowed when required by runtime/package constraints; they are not removed until the replacement boundary is verified.

## High-Level Architecture

```text
                         GateCEP
                            |
        +-------------------+-------------------+
        |                   |                   |
      Mobile               Web               Backend
        |                   |                   |
        +--------- canonical domain/API --------+
                            |
       +--------------------+--------------------+
       | Portfolio | Cash | Market | Investor   |
       | Goals | Performance | Coach G | Trading|
       | Broker Sync / Reconciliation / Evidence|
       +--------------------+--------------------+
                            |
          PostgreSQL / user-owned production data
                            |
           Broker APIs / Market Data Providers
```

## Canonical Ownership

| Domain | Canonical responsibility |
|---|---|
| Dashboard | Current snapshot |
| Portfolio Hub | Holdings/allocation/facts |
| Coach G | Advice/recommendations/simulation/strategy |
| Performance | Evidence-based historical analytics |
| Transactions | Activity/audit trail |
| Goals | Wealth planning/scenarios |
| Trading | Preview/execution/action planning |
| Broker | Linking/sync/reconciliation/evidence |
| Profile | User/investor/account management |

## UAT Architecture Rules

1. Find the active/canonical implementation before changing code.
2. Self-reference or stale docs do not establish active status.
3. Compatibility redirects do not become new canonical destinations.
4. Prefer the smallest UAT correction over broad refactoring.
5. Preserve REAL vs Practice semantics.
6. Preserve historical-performance and executed-lot integrity.
7. Archive obsolete implementations before deletion.
8. Responsive/mobile layout is frozen after AV3AQ unless a new UAT defect is reproduced.

## Current Responsive Evidence

- Active screens audited: 98
- Static review pass: 37
- Verified calibration: 51
- Shared responsive container: 10
- Remaining UAT verify: 0
- Excluded non-active/review: 27
- Expo web bundle smoke: PASS
