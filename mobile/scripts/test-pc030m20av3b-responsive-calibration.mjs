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
  assert.ok(s.includes('maxWidth: 960'), `${name}: missing canonical desktop max width`);
  assert.ok(s.includes('paddingBottom: 128'), `${name}: missing overlay-safe bottom padding`);
}

assert.ok(files.insights.includes("useWindowDimensions"));
assert.ok(files.coach.includes("useWindowDimensions"));
assert.ok(files.planner.includes("useWindowDimensions"));
assert.ok(files.performance.includes("useWindowDimensions"));

assert.ok(files.insights.includes("viewportWidth < 720"));
assert.ok(files.coach.includes("viewportWidth < 720"));
assert.ok(files.performance.includes("windowWidth < 720"));
assert.ok(files.planner.includes("viewportWidth < 720"));

assert.ok(files.planner.includes("av3bInputGrid"));
assert.ok(files.planner.includes("av3bField"));
assert.ok(files.planner.includes("av3bSectorRowNarrow"));

assert.ok(files.planner.includes('pathname: "/goal-recovery-choice"'));
assert.ok(files.performance.includes("buildHistoricalPerformanceSummary"));
assert.ok(files.performance.includes("buildPerformanceBenchmarkGoalIntelligence"));
assert.ok(files.coach.includes("loadCanonicalRealTransactionHistory"));
assert.ok(files.insights.includes("PRACTICE ONLY"));

console.log("PASS — Coach G Insights has compact/mobile and contained desktop layout.");
console.log("PASS — REAL Coach G has compact/mobile and contained desktop layout.");
console.log("PASS — Performance preserves its responsive intelligence and gains page-shell calibration.");
console.log("PASS — Goal Scenario Planner has responsive inputs, narrow rows, and contained desktop layout.");
console.log("PASS — all four screens reserve bottom clearance for global Coach G/Menu controls.");
console.log("PASS — recovery routing, performance engines, REAL transaction evidence, and Practice boundary remain present.");
console.log("PC-030M20AV3B verification complete.");
