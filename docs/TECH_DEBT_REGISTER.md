# GateCEP Technical Debt Register

Updated: 2026-09-12

## Purpose

Tracks duplicated logic, obsolete files, static data, migration targets, and documentation items that still require verification.

## Status Labels

- OPEN
- IN PROGRESS
- RESOLVED
- DEFERRED
- VERIFY CURRENT CODE

## Important Reconciliation Note

The earlier register was not consistently updated as implementation progressed. An old `OPEN` or `IN PROGRESS` label must **not** be interpreted as proof that the code is still unfinished.

For the entries below, current runtime/code evidence takes precedence. Items that have not yet been re-audited are marked `VERIFY CURRENT CODE` rather than being reopened.

## Register

| ID | Area | Historical Issue | Current Status | Target / Evidence |
|---|---|---|---|---|
| TD-001 | Market | Static prices remained in Smart Portfolio | VERIFY CURRENT CODE | ENG-MKT-001; responsive UAT intentionally did not alter market-data logic |
| TD-002 | Broker | Broker lists duplicated in some mobile screens | VERIFY CURRENT CODE | `shared/constants/brokers.js`; broker journeys are implemented and responsive-verified |
| TD-003 | Portfolio | Multiple valuation calculations across screens | VERIFY CURRENT CODE | ENG-PORT-001; canonical unified portfolio/runtime services are in active use |
| TD-004 | Investor | Questionnaire/profile/edit shape not fully shared | VERIFY CURRENT CODE | INV-001; current onboarding/profile journeys are implemented and responsive-verified |
| TD-005 | Cash | Cash calculations not yet in shared cash engine | VERIFY CURRENT CODE | ENG-CASH-001; user-owned cash and cash-statement flows exist |
| TD-006 | Monorepo | Mobile used a temporary shared engine bridge because Metro could not import root shared directly | VERIFY CURRENT CODE | `@gatecep/shared`; do not remove a bridge until the package boundary is proven operational |
| TD-007 | Runtime | Backend/mobile could not safely consume root `shared/` until package boundary completion | VERIFY CURRENT CODE | Runtime/package-boundary verification required before declaring obsolete |

## UAT-Closed Technical Debt

| ID | Area | Issue | Status | Evidence |
|---|---|---|---|---|
| TD-008 | Mobile UX | Active-screen responsive/mobile alignment uncertainty | RESOLVED | PC-030M20AV3AK–AV3AQ; 98 active screens accounted for; `REMAINING_UAT_VERIFY: 0` |
| TD-009 | Route audit | Legacy/self-referencing routes could be mistaken for active responsive targets | RESOLVED | AV3AI/AV3AJ; self-reference does not establish active status; review routes excluded |

## Cleanup Rule

Do not delete a file merely because equivalent logic exists elsewhere.

Classify it first as one of:

- active canonical
- active migration debt
- compatibility
- transitional bridge
- deprecated
- obsolete
- archive candidate

Obsolete files should be archived before deletion.

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
