# PC-030M20AV3H — Multi-Period Filing Responsive Calibration

Discovery confirmed `app/multi-period-filing-extraction.js` needs responsive calibration.

The remaining no-useWindowDimensions report also listed broker-marketplace.js,
investment-intelligence.js, market-price-import.js, and watchlist-old.js. They are intentionally
excluded: watchlist-old is legacy and canonical Watchlist is already AV3F; the other three require
their own exact-source/contract discovery before modification.

AV3H is layout-only: 960px centered desktop containment, 128px mobile bottom clearance,
responsive title/padding, very-narrow metric stacking, and long comparison-row wrap protection.

It does not alter comparison math, source evidence, duplicate/outlier checks, filing-ready JSON,
submission mode, approval, promotion, portfolio, cash, broker, or execution behavior.

Verifier includes a real Expo web export smoke test.
