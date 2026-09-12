# PC-030M20AV3P — Read-Mostly Investor Responsive Calibration

AV3O identified 13 READ_MOSTLY_INVESTOR residual screens. AV3P intentionally
takes the safer 11-screen subset and leaves the two stateful record workflows
`dividend-center.js` and `monthly-review.js` for a later contract-specific wave.

Targets:
- alerts
- analysis-ready
- behavior-analytics
- corporate-actions
- investor-home
- investor-timeline
- live-dashboard
- portfolio-activity
- progress
- recommendation-history
- security/[symbol]

Change scope is style-only:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128
- preserve each screen's existing padding and top spacing

The patcher requires the exact AV3O-discovered content style for every target.
It stops instead of using a broad fallback if current source differs.

No routes, services, state updates, portfolio evidence, market data, corporate
actions, watchlists, security research, or transaction-history behavior are
changed.

`dividend-center.js` is excluded because it has save/delete/receive workflows.
`monthly-review.js` is excluded because it persists review snapshots.
