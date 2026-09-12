# PC-030M20AV3N — Post-AV3 Residual Responsive Audit

Purpose: perform a fresh live audit after AV3K, AV3L and AV3M rather than relying
on the older pre-calibration screen inventory.

This package does not patch GateCEP application code.

It scans active `mobile/app` route-like files and reports:
- investor-facing residual screens lacking structural desktop containment and/or
  bottom clearance;
- auth/onboarding/setup surfaces separately;
- explicit legacy exclusions;
- all screens carrying AV3 responsive-calibration markers.

Structural pass rules:
- desktop containment: `maxWidth: 960`, canonical `MobileScreen`, `contentWide`,
  or a thin re-export wrapper;
- bottom safety: `paddingBottom: 128`, `MobileScreen`, `StickyActionBar`, or a
  thin re-export wrapper.

Known intentional legacy exclusion:
- `app/watchlist-old.js`

Outputs:
- `mobile/.pc030m20av3n-residual-audit.txt`
- `mobile/.pc030m20av3n-residual-audit.json`

Exit handling:
- the audit command prints `PASS` when no residual investor screens remain;
- it prints `REVIEW` when candidates remain, but still exits successfully so the
  user can send the report back for the next controlled patch wave.

This is a structural responsive audit only; it does not alter or certify business
logic.
