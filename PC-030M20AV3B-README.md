# PC-030M20AV3B — Responsive Screen Calibration

First responsive-calibration wave for:
- `app/coach-insights.js`
- `app/(tabs)/coach.js`
- `app/performance.js`
- `app/goal-scenario-planner.js`

Layout contract:
- Phone: compact padding and wrapped headers/actions.
- Narrow phone: reduced title size and additional side-space protection.
- Tablet/Desktop: centered content with a 960px maximum page width.
- Global overlays: compact bottom clearance for Floating Coach G and Menu.
- Goal Scenario Planner: fields wrap with available width; sector rows stack on very narrow screens.
- Performance: existing chart sizing, focused detail panels, and historical integrity are preserved.

No business logic, portfolio calculations, goal math, performance history,
fee evidence, Broker Action Plan, or reconciliation behavior is changed.
