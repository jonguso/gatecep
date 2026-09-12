# PC-030M20AV3W1 — Canonical Reachability & Legacy-Chain Audit

AV3W found an important limitation: a route can appear `ACTIVE_REFERENCED` only
because another legacy screen points to it. Example from AV3W:
`/execution-audit` was referenced only from `/execution-bridge`, while
`/execution-bridge` itself had no incoming route reference.

AV3W1 therefore computes transitive reachability from current canonical navigation
roots (menu, tabs, active investor surfaces, broker/import surfaces, Coach G roots)
instead of treating every incoming reference as proof of active use.

Classifications:
- CANONICALLY_REACHABLE
- LEGACY_CHAIN_CANDIDATE
- ORPHAN_LEGACY_CANDIDATE
- MISSING_FILE

This is discovery-only. It does not modify, rename, move, or delete application code.

Do not continue AV3V recovery until AV3W1 results are reviewed.
