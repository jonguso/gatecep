# PC-030M20AV3B1 — Responsive Calibration Partial-Apply Recovery

The original AV3B apply stopped at Goal Scenario Planner because the patch expected:

`<View style={styles.sectorRow}>`

but the real source renders that row inline:

`<View key={row.sector} style={styles.sectorRow}>`

Because the patch is sequential, Coach G Insights and REAL Coach G had already
been written, while Goal Scenario Planner and Performance were not completed.

AV3B1:
- validates the already-applied Coach G files;
- patches the actual inline Goal Scenario Planner sector-row anchor;
- completes Goal Scenario Planner responsive styles;
- applies the previously-unreached Performance page/header calibration;
- preserves all existing business and evidence logic.
