import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/features/portfolio-home/PortfolioHomeScreen.js");
const realCoach = read("app/(tabs)/coach.js");
const practiceCoach = read("app/coach-insights.js");

assert.match(
  dashboard,
  /Coach G|Understand this portfolio with Coach G/i,
  "Portfolio Home should expose a Coach G handoff"
);
assert.match(
  dashboard,
  /const route = isPractice/,
  "Portfolio Home Coach G handoff should be source-aware"
);
assert.match(
  dashboard,
  /\? "\/coach-insights"\s*:\s*"\/\(tabs\)\/coach"/,
  "Practice should route to Practice Coach G while REAL routes to canonical REAL Coach G"
);
assert.match(
  dashboard,
  /<CoachInsightsHandoff isPractice=\{isPractice\}/,
  "Portfolio Home should pass its resolved Practice/REAL source to Coach G"
);

assert.match(
  practiceCoach,
  /Practice|Simulation|Coach G/i,
  "Practice Coach surface should remain clearly separate from REAL Coach G"
);
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
assert.match(
  practiceCoach,
  /loadInvestorContext/,
  "Practice Coach must read the canonical user-scoped investor context"
);
assert.match(
  practiceCoach,
  /investorContext\?\.practicePortfolio/,
  "Practice Coach must read the canonical Practice Portfolio"
);
assert.match(
  practiceCoach,
  /practice\?\.availableCash/,
  "Practice Coach must use canonical Practice available cash"
);
assert.doesNotMatch(
  practiceCoach,
  /loadUnifiedPortfolio\s*\(/,
  "Practice Coach must not load holdings through the unified REAL portfolio API"
);
assert.doesNotMatch(
  practiceCoach,
  /loadUnifiedPortfolioRuntime/,
  "Practice Coach must never call the canonical REAL runtime"
);
assert.match(
  practiceCoach,
  /Simulations use your Practice Portfolio as the baseline/,
  "Practice Coach copy must identify Practice as its analysis baseline"
);

assert.match(
  practiceCoach,
  /investorContext\?\.investorDNA/,
  "Practice Coach must consume canonical Investor DNA"
);

assert.match(
  practiceCoach,
  /investorContext\?\.wealthBlueprint/,
  "Practice Coach must consume canonical Wealth Blueprint"
);

assert.match(
  practiceCoach,
  /assessmentSource: "INVESTOR_DNA_WEALTH_BLUEPRINT"/,
  "Practice recommendation must retain its canonical assessment source"
);

assert.doesNotMatch(
  practiceCoach,
  /setGoal\(/,
  "Practice simulator must not ask a beginner to self-select the assessed goal"
);

assert.doesNotMatch(
  practiceCoach,
  /setScenario\(/,
  "Practice simulator must not ask a beginner to self-select a risk scenario"
);

assert.doesNotMatch(
  practiceCoach,
  /setIntensity\(/,
  "Practice simulator must not ask a beginner to self-select rebalance intensity"
);

assert.match(
  practiceCoach,
  /Amount to Simulate/,
  "Investor must retain control of the hypothetical simulation amount"
);

assert.match(
  practiceCoach,
  /does not change your Investor DNA/,
  "Practice proposal must not masquerade as a new DNA assessment"
);

assert.doesNotMatch(
  practiceCoach,
  /Risk Direction: IMPROVING/,
  "Practice simulator must not claim risk improvement without calculated evidence"
);

assert.doesNotMatch(
  practiceCoach,
  />Projected Value<\/Text>/,
  "Hypothetical capital addition must not be labeled as a projected investment value"
);

assert.doesNotMatch(
  practiceCoach,
  />Buy Recommendations<\/Text>/,
  "Diversification heuristic must not be labeled as authoritative buy recommendations"
);

assert.match(
  practiceCoach,
  /Portfolio Value After Hypothetical Addition/,
  "Practice result must accurately describe current value plus hypothetical capital"
);

assert.match(
  practiceCoach,
  /not a return forecast/,
  "Practice result must explicitly avoid presenting hypothetical capital as forecast return"
);

assert.match(
  practiceCoach,
  /Practice Allocation Proposal/,
  "Practice diversification heuristic must be presented as a proposal"
);

assert.match(
  practiceCoach,
  /executionMode: "PRACTICE"/,
  "Coach G Practice basket must remain explicitly PRACTICE execution"
);

assert.match(
  practiceCoach,
  /brokerId: "GATECEP_PRACTICE"/,
  "Coach G Practice basket must remain assigned to the Practice broker"
);

assert.match(
  practiceCoach,
  /createBasketExecution\(\{[\s\S]*?forceNew:\s*true[\s\S]*?\}\)/,
  "A newly saved Coach G Practice basket must create a fresh execution rather than reuse an older active execution"
);

assert.match(
  practiceCoach,
  /if \(!nextExecution\?\.orders\?\.length\)/,
  "Coach G Practice basket must fail closed when execution orders cannot be created"
);

assert.match(
  practiceCoach,
  /router\.push\("\/basket-execution"\)/,
  "Coach G Practice basket must open the canonical basket execution review"
);

assert.doesNotMatch(
  practiceCoach,
  /router\.push\("\/\(tabs\)\/trading"\)/,
  "Coach G Practice basket must not lose its source context in the generic Trading Decision Lab"
);

assert.doesNotMatch(
  practiceCoach,
  /pathname:\s*"\/basket-execution"\s*,\s*params:\s*\{\s*mode:\s*"BROKER_PLAN"/,
  "Practice Coach basket must not enter the advisory-only BROKER_PLAN path"
);

assert.doesNotMatch(
  practiceCoach,
  /practice\?\.availableCash\s*\|\|\s*investorContext\?\.investorDNA\?\.amount/,
  "Practice cash must not be treated as hypothetical simulation capital"
);

console.log("PASS — Dashboard Coach G handoff preserves source: Practice opens Practice Coach G and REAL opens canonical REAL Coach G.");
console.log("PASS — Practice order and trade records are absent from the REAL Coach G Analysis Center.");
console.log("PASS — the recommendation simulator is visibly and persistently Practice-only.");
console.log("PASS — Practice strategy history cannot enter canonical REAL Coach G history.");
console.log("PASS — Practice Coach holdings and cash come only from the canonical Practice Portfolio.");
console.log("PASS — Practice simulator consumes Investor DNA / Wealth Blueprint instead of asking beginners to self-select risk.");
console.log("PASS — hypothetical simulation amount remains investor-controlled and separate from Practice cash.");
console.log("PASS — Practice simulation results make no unsupported risk-improvement or return-forecast claim.");
console.log("PASS — Practice diversification output is labeled as a proposal.");
console.log("PASS — Coach G Practice basket retains explicit PRACTICE execution and broker evidence.");
console.log("PASS — Coach G Practice basket opens canonical Practice Basket Simulation instead of generic Trading.");
console.log("PASS — each newly saved Coach G Practice basket creates a fresh execution and fails closed if no review orders are created.");
