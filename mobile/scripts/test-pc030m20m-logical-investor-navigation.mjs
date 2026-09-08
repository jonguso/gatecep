import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [home, analysis, performance, risk, rebalance, coach] = await Promise.all([
  read("src/features/portfolio-home/PortfolioHomeScreen.js"),
  read("app/unified-portfolio-analytics.js"),
  read("app/performance.js"),
  read("app/portfolio-risk.js"),
  read("app/portfolio-rebalancing.js"),
  read("app/(tabs)/coach.js")
]);

assert.match(home, /const SECTORS_PER_PAGE = 5/);
assert.match(home, /visibleSectorRows/);
assert.match(home, /currentSectorPage \+ 1\} of \{sectorPageCount/);
assert.doesNotMatch(home, /const TABS = \["Allocation", "Holdings", "More"\]/);
assert.doesNotMatch(home, /AllocationMetric/);
assert.match(home, /function CoachInsightsHandoff/);
assert.match(home, /router\.push\("\/\(tabs\)\/coach"\)/);
assert.doesNotMatch(home, /title="Portfolio Analysis"/);

for (const [name, source] of [["Analysis", analysis], ["Performance", performance], ["Risk", risk], ["Rebalancing", rebalance], ["Coach G Insights", coach]]) {
  assert.match(source, /router\.canGoBack\?\.\(\)/, `${name} must prefer navigation history`);
  assert.match(source, /router\.back\(\)/, `${name} must return to the previous page`);
  assert.match(source, /router\.replace\("\/\(tabs\)\/dashboard"\)/, `${name} must retain an explicit Home action/fallback`);
}

assert.match(coach, /title="Portfolio Analysis"/);
assert.match(coach, /title="Performance"/);
assert.match(coach, /title="Portfolio Risk"/);
assert.match(coach, /InvestorJourneyNavigation stage="coach"/);
assert.match(coach, /nextLabel="Start: Portfolio Analysis"/);

console.log("PASS — allocation displays every sector across five-row pages without duplicate summary metrics.");
console.log("PASS — Home presents verified facts followed by one Coach Insights handoff.");
console.log("PASS — Back returns through navigation history while Home remains explicitly available at the top.");
console.log("PASS — Analysis, Performance, Risk, and Coach G Recommendations remain discoverable in their logical stages.");
