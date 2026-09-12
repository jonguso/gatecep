# PC-030M20AV2 — Goal-Preserving Diversified Recovery Allocation

AV2 corrects the UAT defect where recovery funding could be routed into one security
even when that security belonged to an already highly concentrated sector.

Key behavior:
- AV1's required-now recovery amount remains the scenario budget.
- Goal target, target date and monthly contribution remain unchanged.
- Canonical REAL holdings are the portfolio source.
- Existing Coach G investment opportunities are the security evidence source.
- Saved sector targets from Goal Recovery Simulator are carried forward.
- Existing Decision Lab 40% sector concentration guard is reused.
- A sector at/above its saved target is not eligible for new recovery capital.
- A candidate that would breach the concentration guard is not eligible.
- The allocator selects at most one leading candidate per sector first, so new money
  is distributed across distinct sectors rather than concentrated into one security.
- If fewer than two evidence-supported compatible sectors are available, GateCEP
  returns an evidence boundary rather than manufacturing a one-security basket.
- Scenario recovery funding is not written to REAL cash.
- No broker order is created in AV2. Basket simulation/execution handoff remains a
  separate subsequent boundary.

This package intentionally fixes recommendation quality upstream before Trade Lab.
