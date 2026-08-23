# PC-030M12B — Broker Source Selector

This correction keeps **All Accounts** as the default while ensuring every REAL
broker account remains selectable.

- The `/user-portfolio/accounts` response remains the preferred catalog.
- If that catalog fails or is incomplete, authoritative ALL-account holdings and
  cash balances rebuild the missing broker entries.
- A selected broker reads `availableCash` from its scoped backend response.
- Practice and GateCEP Demo accounts remain excluded.
