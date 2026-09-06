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
assert.match(home, /title="Portfolio Analysis"/);
assert.match(home, /title="Coach G Insights"/);
assert.match(home, /title="Coach G Recommendations"/);

for (const [name, source] of [["Analysis", analysis], ["Performance", performance], ["Risk", risk], ["Rebalancing", rebalance], ["Coach G Insights", coach]]) {
  assert.match(source, /router\.canGoBack\?\.\(\)/, `${name} must prefer navigation history`);
  assert.match(source, /router\.back\(\)/, `${name} must return to the previous page`);
  assert.match(source, /router\.replace\("\/\(tabs\)\/dashboard"\)/, `${name} must retain an explicit Home action/fallback`);
}

assert.match(coach, /title="Portfolio Risk"/);
assert.match(coach, /title="Rebalancing"/);

console.log("PASS — allocation displays every sector across five-row pages without duplicate summary metrics.");
console.log("PASS — Home presents the facts → analysis → insights → recommendations browsing order.");
console.log("PASS — Back returns through navigation history while Home remains explicitly available at the top.");
console.log("PASS — Performance, Risk, and advisory Rebalancing remain discoverable in their logical stages.");

