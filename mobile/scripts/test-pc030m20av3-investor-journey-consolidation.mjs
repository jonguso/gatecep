import fs from "node:fs";
import assert from "node:assert/strict";

const nav = fs.readFileSync("src/components/mobile/InvestorJourneyNavigation.js", "utf8");
const risk = fs.readFileSync("app/portfolio-risk.js", "utf8");
const menu = fs.readFileSync("app/menu.js", "utf8");
const holdings = fs.readFileSync("app/holding-details.js", "utf8");
const rebalance = fs.readFileSync("app/portfolio-rebalancing.js", "utf8");
const scenario = fs.readFileSync("app/goal-scenario-planner.js", "utf8");

assert.ok(nav.includes('risk: { step: 4, title: "Portfolio Risk", previous: "/performance", next: "/wealth-journey" }'));
assert.ok(nav.includes('goals: { step: 5, title: "Goals & Wealth Journey", previous: "/portfolio-risk", next: "/goal-scenario-planner" }'));
assert.ok(nav.includes('scenario: { step: 6, title: "Goal Recovery Simulation"'));
assert.ok(!nav.includes('holdings: { step:'));
assert.ok(!nav.includes('recommendations: { step:'));
assert.ok(!nav.includes('OF 8'));
assert.ok(nav.includes('OF {Object.keys(INVESTOR_JOURNEY).length}'));

assert.ok(risk.includes('nextLabel="Continue to Goals & Wealth Journey"'));
assert.ok(!risk.includes('nextLabel="Continue to Holdings"'));

assert.ok(menu.includes('title: "Holdings"'));
assert.ok(menu.includes('route: "/holding-details"'));
assert.ok(menu.includes('title: "Portfolio Rebalancing"'));
assert.ok(menu.includes('route: "/portfolio-rebalancing"'));

assert.ok(holdings.includes('REAL holdings'));
assert.ok(rebalance.includes('buildCoachGRebalancingAdvice'));
assert.ok(rebalance.includes('getOrCreateRebalanceTarget'));
assert.ok(scenario.includes('continueToRecommendations'));

console.log("PASS — canonical journey now has 6 compulsory stages.");
console.log("PASS — Holdings is no longer a numbered Investor Journey stage.");
console.log("PASS — Portfolio Rebalancing is no longer a numbered Investor Journey stage.");
console.log("PASS — Portfolio Risk advances directly to Goals & Wealth Journey.");
console.log("PASS — Holdings remains available through the main menu.");
console.log("PASS — Portfolio Rebalancing remains available through the main menu.");
console.log("PASS — Holdings and rebalancing implementation files/services remain intact.");
console.log("PASS — Goal Recovery Simulation keeps its existing custom recovery handoff.");
console.log("PC-030M20AV3 verification complete.");
