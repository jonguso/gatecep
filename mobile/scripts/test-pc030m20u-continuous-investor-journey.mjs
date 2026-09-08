import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [navigation, coach, analysis, performance, risk, holdings, goals, scenario, recommendations] = await Promise.all([
  read("src/components/mobile/InvestorJourneyNavigation.js"),
  read("app/(tabs)/coach.js"),
  read("app/unified-portfolio-analytics.js"),
  read("app/performance.js"),
  read("app/portfolio-risk.js"),
  read("app/holding-details.js"),
  read("app/wealth-journey.js"),
  read("app/goal-scenario-planner.js"),
  read("app/portfolio-rebalancing.js")
]);

const expectedRouteOrder = [
  ["coach", 1, "/(tabs)/dashboard", "/unified-portfolio-analytics"],
  ["analysis", 2, "/(tabs)/coach", "/performance"],
  ["performance", 3, "/unified-portfolio-analytics", "/portfolio-risk"],
  ["risk", 4, "/performance", "/holding-details"],
  ["holdings", 5, "/portfolio-risk", "/wealth-journey"],
  ["goals", 6, "/holding-details", "/goal-scenario-planner"],
  ["scenario", 7, "/wealth-journey", "/portfolio-rebalancing"],
  ["recommendations", 8, "/goal-scenario-planner", "/(tabs)/dashboard"]
];

let prior = -1;
for (const [stage, step, previous, next] of expectedRouteOrder) {
  const marker = `${stage}: { step: ${step}`;
  const position = navigation.indexOf(marker);
  assert.ok(position > prior, `${stage} must retain its canonical journey position`);
  prior = position;
  assert.ok(navigation.slice(position).startsWith(`${marker},`));
  assert.ok(navigation.slice(position, position + 220).includes(`previous: "${previous}"`));
  assert.ok(navigation.slice(position, position + 220).includes(`next: "${next}"`));
}

assert.match(navigation, />Home</);
assert.match(navigation, /previousLabel \|\| "‹ Back"/);
assert.match(navigation, /onRefresh \?/);
assert.match(navigation, /isLast \? "Finish: Home" : "Continue"/);

for (const [stage, source] of [
  ["coach", coach], ["analysis", analysis], ["performance", performance],
  ["risk", risk], ["holdings", holdings], ["goals", goals],
  ["scenario", scenario], ["recommendations", recommendations]
]) {
  assert.match(source, new RegExp(`InvestorJourneyNavigation stage="${stage}"`), `${stage} must render journey controls`);
}

assert.match(holdings, /!selectedSecurity \? <InvestorJourneyNavigation/);
assert.match(analysis, /activeSection \? \(/);
assert.match(performance, /activeSection \? <Pressable/);
assert.match(risk, /activeSection \? <Pressable/);
assert.match(recommendations, /activeSection \? <Pressable/);

console.log("PASS — one canonical eight-stage route map drives the complete investor journey.");
console.log("PASS — every journey overview provides Back, Home, and Continue or Finish controls.");
console.log("PASS — Refresh appears only when a page supplies an explicit data reload callback.");
console.log("PASS — focused details finish locally before advancing to the next investor page.");
console.log("PASS — Coach G Recommendations finishes the journey at Home.");
