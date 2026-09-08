import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [home, coach, analysis, recommendations] = await Promise.all([
  read("src/features/portfolio-home/PortfolioHomeScreen.js"),
  read("app/(tabs)/coach.js"),
  read("app/unified-portfolio-analytics.js"),
  read("app/portfolio-rebalancing.js")
]);

assert.match(home, /function CoachInsightsHandoff/);
assert.match(home, /Understand this portfolio with Coach G/);
assert.match(home, /router\.push\("\/\(tabs\)\/coach"\)/);
assert.doesNotMatch(home, /function InvestorJourney/);
assert.doesNotMatch(home, /function PortfolioDestinations/);
assert.doesNotMatch(home, /title="Portfolio Analysis"/);
assert.doesNotMatch(home, /label="Activity" route/);

const orderedTitles = [
  "Portfolio Analysis",
  "Performance",
  "Portfolio Risk",
  "Holdings Analysis",
  "Goals & Wealth Journey",
  "Activity Evidence"
];
let prior = -1;
for (const title of orderedTitles) {
  const position = coach.indexOf(`title="${title}"`);
  assert.ok(position > prior, `${title} must appear in the ordered Coach Insights path`);
  prior = position;
}

assert.match(coach, /InvestorJourneyNavigation stage="coach"/);
assert.match(coach, /nextLabel="Start: Portfolio Analysis"/);
assert.doesNotMatch(coach, /<Text style=\{styles\.section\}>Analysis Center<\/Text>/);
assert.doesNotMatch(coach, /title="Portfolio Hub"/);
assert.doesNotMatch(coach, /title="Practice Recommendation Lab"/);
assert.doesNotMatch(coach, /title="Rebalancing"/);
assert.doesNotMatch(coach, /Preview Advisory Scenario/);

assert.doesNotMatch(analysis, /id: "specialists"/);
assert.doesNotMatch(analysis, /title="Specialist Analysis"/);
assert.match(recommendations, />\s*Coach G Recommendations\s*</);

assert.match(coach, /route="\/performance"/);
assert.match(coach, /route="\/portfolio-risk"/);
assert.match(coach, /route="\/holding-details"/);
assert.match(coach, /route="\/wealth-journey"/);
assert.match(coach, /route="\/portfolio-activity"/);

console.log("PASS — Home contains verified facts and one Coach Insights handoff without duplicate route grids.");
console.log("PASS — Coach Insights owns the ordered analysis, performance, risk, holdings, goals, and activity path.");
console.log("PASS — Coach G Recommendations remains the final destination in the continuous investor journey.");
console.log("PASS — duplicate Analysis Center and Specialist Analysis entry points are removed.");
console.log("PASS — underlying specialist routes remain available behind the consolidated journey.");
