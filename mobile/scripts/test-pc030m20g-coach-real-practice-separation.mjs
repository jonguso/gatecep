import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/features/portfolio-home/PortfolioHomeScreen.js");
const realCoach = read("app/(tabs)/coach.js");
const practiceCoach = read("app/coach-insights.js");

assert.match(dashboard, /Coach G Insights" route="\/\(tabs\)\/coach"/);
assert.doesNotMatch(dashboard, /Coach G Insights" route="\/coach-insights"/);

assert.match(realCoach, /Practice Recommendation Lab/);
assert.doesNotMatch(realCoach, /QuickCard title="Order Book"/);
assert.doesNotMatch(realCoach, /QuickCard title="Trade History"/);

assert.match(practiceCoach, /Practice Coach G Lab/);
assert.match(practiceCoach, /PRACTICE ONLY/);
assert.match(practiceCoach, /Create Practice Trade Basket/);
assert.match(practiceCoach, /practiceCoachRecommendationHistory/);
assert.match(practiceCoach, /source: "PRACTICE_COACH_G_SIMULATION"/);
assert.match(practiceCoach, /isPractice: true/);
assert.match(practiceCoach, /isReal: false/);
assert.doesNotMatch(practiceCoach, /userGetItem\("recommendationHistory"\)/);
assert.doesNotMatch(practiceCoach, /loadCanonicalRealTransactionHistory/);

console.log("PASS — Dashboard and portfolio guidance open the canonical REAL Coach G page.");
console.log("PASS — Practice order and trade records are absent from the REAL Coach G Analysis Center.");
console.log("PASS — the recommendation simulator is visibly and persistently Practice-only.");
console.log("PASS — Practice strategy history cannot enter canonical REAL Coach G history.");
