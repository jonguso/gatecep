import fs from "node:fs";
import assert from "node:assert/strict";

const files = {
  insights: fs.readFileSync("app/coach-insights.js", "utf8"),
  coach: fs.readFileSync("app/(tabs)/coach.js", "utf8"),
  performance: fs.readFileSync("app/performance.js", "utf8"),
  planner: fs.readFileSync("app/goal-scenario-planner.js", "utf8"),
};

for (const [name, s] of Object.entries(files)) {
  assert.ok(s.includes("PC-030M20AV3B RESPONSIVE CALIBRATION"), `${name}: missing AV3B styles`);
  assert.ok(s.includes("av3bContentWide"), `${name}: missing desktop containment`);
  assert.ok(s.includes("av3bContentCompact"), `${name}: missing compact containment`);
  assert.ok(s.includes("av3bContentNarrow"), `${name}: missing narrow containment`);
  assert.ok(s.includes('maxWidth: 960'), `${name}: missing canonical 960px desktop containment`);
  assert.ok(s.includes('paddingBottom: 128'), `${name}: missing global overlay bottom clearance`);
}

assert.match(files.insights, /useWindowDimensions/);
assert.match(files.coach, /useWindowDimensions/);
assert.match(files.planner, /useWindowDimensions/);
assert.match(files.performance, /useWindowDimensions/);

assert.match(files.planner, /key=\{row\.sector\}\s+style=\{\[styles\.sectorRow,\s*viewportWidth < 480 && styles\.av3bSectorRowNarrow\]\}/);
assert.ok(files.planner.includes("av3bInputGrid"));
assert.ok(files.planner.includes("av3bField"));
assert.ok(files.planner.includes("av3bSectorRowNarrow"));
assert.ok(files.planner.includes('pathname: "/goal-recovery-choice"'));

assert.ok(files.performance.includes("buildHistoricalPerformanceSummary"));
assert.ok(files.performance.includes("buildPerformanceBenchmarkGoalIntelligence"));
assert.ok(files.performance.includes("calculateResponsivePanelHeight"));
assert.ok(files.performance.includes("timelineWidth"));
assert.ok(files.performance.includes("windowWidth < 600"));

assert.ok(files.coach.includes("loadCanonicalRealTransactionHistory"));
assert.ok(files.insights.includes("PRACTICE ONLY"));

console.log("PASS — original partial apply is recovered safely.");
console.log("PASS — Coach G Insights responsive calibration remains installed.");
console.log("PASS — REAL Coach G responsive calibration remains installed.");
console.log("PASS — Goal Scenario Planner uses the corrected inline sector-row anchor.");
console.log("PASS — Performance responsive page/header shell is now installed.");
console.log("PASS — Performance existing chart/detail responsive behavior remains present.");
console.log("PASS — Goal recovery route and Coach G REAL/Practice evidence boundaries remain present.");
console.log("PC-030M20AV3B1 verification complete.");
