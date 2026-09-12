# PC-030M20AV3Z — Manual Portfolio Entry Responsive Calibration

AV3W1 confirmed `/manual-portfolio-entry` is canonically reachable from the
current menu, broker surfaces, and Portfolio Sync Center.

This package targets only:
- app/manual-portfolio-entry.js

Responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

Protected integrity boundaries:
- Manual entry is for initial REAL portfolio setup before connecting a broker.
- Connected REAL broker holdings remain read-only on this screen.
- Connected users are sent to `/portfolio-sync-center` for verified broker sync.
- Existing canonical snapshot trigger reason `MANUAL_PORTFOLIO_ENTRY` remains unchanged.
- Existing `savePortfolio` behavior is not modified.

No broker synchronization, cash evidence, transaction evidence, or trade execution behavior is added.
