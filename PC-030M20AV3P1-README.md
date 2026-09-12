# PC-030M20AV3P1 — AV3P Partial-Apply Recovery

The original AV3P stopped after successfully updating `app/alerts.js` because
`app/analysis-ready.js` did not match the exact one-line style string emitted by
the AV3O report.

AV3P1 is a recovery package:
- validates and preserves `alerts.js` if AV3P is already present;
- patches the remaining targets by locating each simple StyleSheet `content`
  object structurally rather than requiring identical whitespace/formatting;
- still requires the AV3O-discovered base padding, top padding, and each screen's
  exact pre-AV3P paddingBottom;
- stops if those safety anchors do not match;
- changes only responsive style properties.

Do not rerun the original AV3P apply script.

AV3P1 does not touch `dividend-center.js` or `monthly-review.js`.
