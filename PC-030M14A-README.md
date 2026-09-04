# PC-030M14A — Floating Coach G 2.0

Floating Coach G returns as a global, authenticated and read-only investing companion.

- Mounted once in the Expo Router root layout.
- Left-side floating `G` stays separate from the right-side Menu button.
- Hidden on authentication, onboarding, full Coach G, and Practice surfaces.
- Security-aware prompts such as `Explain ABSA` use the current verified quote.
- `/coach/ask` loads REAL holdings, broker cash, broker links and Coach G evidence on the authenticated backend.
- Client-supplied portfolio and cash are never trusted.
- No legacy `portfolio`, `availableCash`, or `simulatedTrades` keys are read.
- The endpoint is advisory and cannot modify holdings, cash, goals, orders, or Investor DNA.

Install this package from the GateCEP repository root because it contains both `backend/` and `mobile/` paths.
