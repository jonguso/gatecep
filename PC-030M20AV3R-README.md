# PC-030M20AV3R — General Investor Navigation & Profile Responsive Calibration

AV3Q completed the entire READ_MOSTLY_INVESTOR residual group.

AV3R begins the GENERAL_INVESTOR group with the three lower-impact navigation/
profile surfaces:
- app/existing-portal.js
- app/investor-alert-review.js
- app/my-profile.js

Style-only responsive changes:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

The package deliberately excludes:
- app/dna-update-review.js — confirmation/submission workflow
- app/portfolio-simulator.js — persisted scenario workflow
- app/queue-manager.js — order/execution mutation behavior
- app/index.js — bootstrap/routing entry point with no ordinary content style

Those require separate contract-specific treatment.

No routes, services, state updates, profile data, broker data, cash data, portfolio
data, scenario handoffs, or trade handoffs are changed.
