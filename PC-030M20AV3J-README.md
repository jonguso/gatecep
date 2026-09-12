# PC-030M20AV3J — Core Tabs Responsive Residual Calibration

The AV3J coverage audit found a much larger residual list than the earlier narrow
AV3F–AV3I waves. AV3J therefore does not mass-edit every file. This first residual
package calibrates the three active core tabs that were clearly identified by the
audit: Calendar, Funds, and News.

Targets:
- app/(tabs)/calendar.js
- app/(tabs)/funds.js
- app/(tabs)/news.js

Changes are layout-only:
- 960px centered desktop containment
- 128px bottom clearance
- flexible summary metrics / wrapping headers where discovered
- Calendar keeps its seven-column 14.2857% day geometry

Preserved contracts:
- Calendar uses verified calendar/corporate-action evidence.
- Funds keeps connected REAL broker cash read-only outside verified broker sync.
- Reconciliation evidence does not directly replace REAL cash before confirmation.
- News remains verified-source driven and never substitutes placeholder news.
- Existing portfolio-aware alert routes are unchanged.

The broader residual set remains for later grouped waves rather than one unsafe
mass patch. Legacy `watchlist-old.js`, demo, auth, and onboarding are not touched.
