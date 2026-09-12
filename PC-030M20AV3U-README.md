# PC-030M20AV3U — Edit & Planning Responsive Calibration

AV3T completed the remaining ordinary General Investor residual screen.

AV3U moves to the AV3O EDIT_OR_PLANNING class and targets exactly:
- app/goal-details-edit.js
- app/goal-recovery-options.js
- app/investor-profile-edit.js

Responsive baseline:
- width: 100%
- maxWidth: 960
- alignSelf: center
- paddingBottom: 128

Goal Details and Goal Recovery Options already had centered 680/720px containment,
so AV3U widens them to the standard 960px investor desktop baseline while preserving
their existing form/content spacing.

Contracts preserved:
- Goal Details continues to load/save canonical goal evidence and explicitly excludes
  Practice Portfolio values.
- Goal Recovery Options remains advisory; it does not mutate the user's goal,
  contribution, holdings, cash, or broker instructions.
- Investor Profile Edit retains its existing goals, risk choices, authentication/profile
  behavior, and contained form structure.

No routes, services, financial calculations, portfolio mutations, broker instructions,
or goal recovery calculations are changed.
