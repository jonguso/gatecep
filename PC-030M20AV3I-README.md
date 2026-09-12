# PC-030M20AV3I — Remaining Utility Responsive Calibration

Targets:
- app/investment-intelligence.js
- app/market-price-import.js
- app/broker-marketplace.js

Discovery showed no active route reference to `watchlist-old.js`, so it remains untouched.

Scope:
- Investment Intelligence: standard 960px desktop containment, 128px mobile bottom
  clearance, responsive hero/title, narrow metric cards and wrapping value rows.
- Market Price Import: already uses canonical `MobileScreen` / `StickyActionBar`;
  AV3I only hardens local evidence rows/checksum against narrow-screen overflow.
- Broker Marketplace: standard 960px desktop containment, 128px mobile bottom
  clearance and responsive title/padding.

No recommendation logic, portfolio/cash mutation behavior, market import validation,
market evidence publication, broker routing, broker account state, or trade execution
logic is changed.

Verifier includes a real Expo web export smoke test.
