# PC-030M20AV3E1 — Partial-Apply Recovery

The original AV3E stopped after writing Holdings because the rebalancing healthHero JSX
uses a multiline style prop, while the first patch expected a one-line anchor.

This recovery package:
- validates the already-applied Holdings changes rather than reapplying them
- completes Rebalancing using the exact multiline healthHero anchor
- applies Risk and Unified Portfolio Analytics responsive calibration
- preserves Performance AV3B and the canonical Portfolio Hub re-export
- runs contract verification plus a real Expo web export smoke test

Do not rerun the original AV3E package after applying AV3E1.
