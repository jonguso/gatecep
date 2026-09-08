import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGoalDiversificationScenario } from "../src/features/wealth-journey/goalDiversificationScenarioService.js";

const result = buildGoalDiversificationScenario({
  currentValue: 855231.9,
  targetAmount: 1000000,
  targetDate: "2026-12-31",
  monthlyContribution: 15000,
  annualReturnPercentage: 8,
  defensiveTargetPercentage: 5,
  currentDefensiveValue: 0,
  asOfDate: "2026-09-08",
  sectors: [
    { sector: "Banking", value: 324000 },
    { sector: "Telecom", value: 185000 },
    { sector: "Energy", value: 155000 },
    { sector: "Insurance", value: 112000 },
    { sector: "Consumer", value: 85000 }
  ]
});

assert.equal(result.valid, true);
assert.ok(result.goalGap > 0, "the goal shortfall must remain visible");
assert.ok(result.defensivePlan.gap > 0, "the defensive investment gap must be calculated separately");
assert.notEqual(result.goalGap, result.defensivePlan.gap, "goal and defensive gaps must never be conflated");
assert.equal(Number((result.contributionPlan.defensive + result.contributionPlan.equitySectors).toFixed(2)), result.contributionPlan.total);
assert.ok(result.requiredMonthlyContribution > result.trajectory.monthlyContribution);
assert.ok(result.sectorPlan.find((row) => row.sector === "Banking").directedContribution < result.sectorPlan.find((row) => row.sector === "Telecom").directedContribution);
assert.equal(result.safeguards.realPortfolioChanged, false);
assert.equal(result.safeguards.goalChanged, false);
assert.equal(result.safeguards.tradesCreated, false);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [navigation, goals, planner, recommendations] = await Promise.all([
  read("src/components/mobile/InvestorJourneyNavigation.js"),
  read("app/wealth-journey.js"),
  read("app/goal-scenario-planner.js"),
  read("app/portfolio-rebalancing.js")
]);

assert.match(navigation, /goals: \{ step: 6[\s\S]*next: "\/goal-scenario-planner"/);
assert.match(navigation, /scenario: \{ step: 7[\s\S]*next: "\/portfolio-rebalancing"/);
assert.match(navigation, /recommendations: \{ step: 8[\s\S]*previous: "\/goal-scenario-planner"/);
assert.match(goals, /Continue to Goal Recovery Simulation/);
assert.match(planner, /Monthly contribution \(KES\)/);
assert.match(planner, /Target date \(YYYY-MM-DD\)/);
assert.match(planner, /Expected annual return \(%\)/);
assert.match(planner, /Defensive\/MMF target \(%\)/);
assert.match(planner, /Diversification simulation/);
assert.match(planner, /No trades, transfers, goal updates, contribution changes, or REAL portfolio changes/);
assert.match(recommendations, /GOAL-AWARE SCENARIO/);
assert.match(recommendations, /Coach G treats the goal shortfall and the/);

console.log("PASS — the projected goal shortfall remains separate from the defensive/MMF allocation gap.");
console.log("PASS — scenarios recalculate contributions, dates, targets, returns, and defensive allocation without mutating REAL data.");
console.log("PASS — future funding is divided between defensive investments and underweight equity sectors.");
console.log("PASS — Banking concentration can fall through redirected contributions without fabricating a sale.");
console.log("PASS — Wealth Journey flows through simulation into a goal-aware Coach G recommendation summary.");
