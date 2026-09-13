# GateCEP Architecture Status

Updated: 2026-09-12

## Status Labels

- ACTIVE: Currently used by app/backend.
- STABLE: Production-ready and verified.
- DEV: Actively being enhanced.
- DEPRECATED: Still exists but should not be extended.
- OBSOLETE: No longer used; candidate for archive.
- ARCHIVED: Historical reference only.

## Current Release State

GateCEP is in **UAT / release stabilization**.

The current operating rule is:

> UAT → reproduce defect → identify the canonical active implementation → make the smallest correction → verify protected contracts → run Expo web bundle smoke → return to UAT.

Large architecture refactors are not part of the current phase unless a UAT defect proves they are required.

## Current Foundation Direction

GateCEP uses:

- `backend/` for APIs and services
- `mobile/` for the Expo mobile app
- `frontend/` for web
- `shared/` for reusable business logic, constants, market/security data, portfolio calculations, and Coach G engines

Business logic should converge on shared/domain services while presentation clients remain presentation-focused.

## Canonical Investor-Facing Ownership

| Surface | Owns |
|---|---|
| Dashboard | Current snapshot |
| Portfolio Hub | Holdings, allocation, factual portfolio exploration |
| Coach G | Advice, recommendations, simulation, strategy |
| Performance | Historical returns and analytics |
| Transactions | Activity/audit trail |
| Goals / Goal Scenario Planner | Wealth planning and scenarios |
| Trading | Execution and execution preview |
| Profile | User/investor/account management |
| Broker Account / Sync / Reconciliation | Broker connectivity, evidence and reconciliation |

## Responsive UAT Closure

Responsive/mobile-alignment UAT was closed on **2026-09-12** by `PC-030M20AV3AQ`.

Final closure audit:

| Classification | Count |
|---|---:|
| Active screens audited | 98 |
| PASS_STATIC_REVIEW | 37 |
| PASS_VERIFIED_CALIBRATION | 51 |
| PASS_SHARED_RESPONSIVE_CONTAINER | 10 |
| UAT_VERIFY | 0 |
| Excluded non-active/review routes | 27 |

`REMAINING_UAT_VERIFY: 0`

The Expo web bundle smoke passed after final responsive closure.

Responsive layout is now a **frozen UAT baseline**. Reopen responsive work only when UAT reproduces a new visual defect.

## Route / Legacy Handling

Route audits established that self-reference does not make a route active. Compatibility redirects and zero-evidence/review routes are excluded from automatic responsive work.

Confirmed compatibility redirects include:

- `/coach-dashboard` → `/(tabs)/coach`
- `/portfolio-analysis` → `/(tabs)/coach`
- `/portfolio-command-center` → `/portfolio-hub`
- `/portfolio-performance` → `/performance`

Legacy/review files should be archived before deletion. Status headers are supporting evidence only because historical status-header maintenance was inconsistent.

## Historical Integrity Rules

Performance and portfolio history must remain evidence-based:

- Never fabricate missing portfolio history.
- Practice-only data must not create REAL historical performance.
- Benchmark/goal outputs use N/A when evidence is insufficient.
- Canonical REAL portfolio snapshots remain the source for historical performance.

Historical security lots/FIFO follow the executed-trade rule:

- Only executed broker trades create or consume lots.
- Accepted completed statuses include `FULLY TRADED`, `FILLED`, `COMPLETED`, and `SETTLED`.
- Rejected/refused/non-executed orders never affect the historical lot ledger or FIFO simulation.

## Rules Going Forward

1. No new hardcoded market prices.
2. No duplicated broker lists.
3. No duplicated investor questionnaire logic.
4. Shared business logic belongs in `shared/` or the canonical domain service.
5. Status headers should be maintained on major files we touch, but current runtime evidence takes precedence over stale historical headers.
6. Obsolete files are archived, not deleted immediately.
7. Do not reactivate legacy/review routes merely to make them responsive.
8. During UAT, prefer the smallest verified correction over broad refactoring.

<!-- AV3DC:FINAL_RELEASE_READINESS:BEGIN -->
## Production Release Reconciliation — 2026-09-13

GateCEP has completed technical release validation, production deployment,
production functional UAT, and post-cutover runtime verification for the
current canonical release.

### Release verification

- Responsive UAT: **CLOSED**
- Repository/source hygiene: **CLOSED**
- Clean-stage dependency/install validation: **PASS**
- Expo web export validation: **PASS**
- Installed-runtime backend DB probe + bounded boot smoke: **PASS**
- Historical integrity / no-fabrication contracts: **PASS**
- Practice vs REAL separation: **PASS**
- Executed-only FIFO lot ledger contract: **PASS**
- Average Cost advisory-only contract: **PASS**
- Semantic static-price production gate: **PASS**
- Source-completeness / import closure: **PASS**
- Deterministic hardened-stage reproducibility: **PASS**
- Final current-source release regression: **PASS**
- Railway production backend deployment: **PASS**
- Vercel canonical Expo Web deployment: **PASS**
- Production functional smoke/UAT: **PASS**
- Production-only CORS cleanup: **PASS**

### Final hardened production stage

- File count: **848**
- Deterministic tree SHA256:
  `2bde3a51ea22c50a85bfa284c6a672beeb1b65d3b780db7dbe82eb2fc4a71665`

Canonical production targets:

- Web: `https://gatecep-mobile.vercel.app`
- Backend: `https://gatecep-trader-production.up.railway.app`

### Historical-integrity contracts

The production release preserves the following non-negotiable contracts:

- REAL portfolio history must never be fabricated.
- Practice-only activity must not create REAL historical performance.
- Only confirmed executed broker trades may create or consume historical
  security lots.
- Rejected, refused, cancelled, or otherwise non-executed orders must not
  affect FIFO or historical lot evidence.
- Average Cost mode remains advisory/preview-only and must not itself create
  a REAL trade.
- Preview and Broker Action Plan records are not proof of broker execution.

### Preserved product-intent routes

`/live-dashboard` and `/queue-manager` remain intentionally preserved pending
an explicit product decision. Weak historical route evidence alone is not
sufficient reason to archive them.

### Runtime / deployment state

The canonical universal client is the Expo Router application under `mobile/`.

- Web is deployed through Vercel.
- Backend/API is deployed through Railway.
- PostgreSQL remains the production database.
- Git source reconciliation is separate from production deployment.
- Production deployment is no longer pending; it was completed and verified
  on 2026-09-13.

The legacy React `frontend/` remains a deliberate reference/rollback artifact
until separately retired. It must not be treated as the canonical production
client.

### Database SSL runtime contract

`DB_SSL` remains explicit:

- `DB_SSL=true` enables PostgreSQL SSL.
- `DB_SSL=false` disables PostgreSQL SSL where the server does not support it.
- when unset, production preserves the established production SSL behavior.

### Legal / compliance status

Technical production deployment does not replace qualified legal, privacy, or
compliance review. Existing product semantics remain:

- Practice/simulation is not a live transaction.
- Coach G is informational decision support, not individualized investment advice.
- Preview/action-plan records are not proof of execution.
- REAL portfolio history must not be fabricated.
- Only confirmed broker execution evidence may be treated as executed trading activity.

This block supersedes earlier release-readiness language that described
production deployment as not yet executed.
<!-- AV3DC:FINAL_RELEASE_READINESS:END -->
