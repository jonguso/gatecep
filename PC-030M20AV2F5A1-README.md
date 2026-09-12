PC-030M20AV2F5A1 — Broker Plan Label Anchor Correction

The previous AV2F5A patch expected a static Indicative Value string. The live screen renders it conditionally as:
{brokerPlanMode ? "Indicative" : "Active"} Value KES ...

This hotfix targets that exact live source and changes only BROKER_PLAN wording to Planned Gross Purchases, while preserving Practice mode as Active Value.

No cost, fee, allocation, routing, or portfolio logic is changed.
