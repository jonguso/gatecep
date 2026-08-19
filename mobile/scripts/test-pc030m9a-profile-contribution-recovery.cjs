const fs = require("fs");
const path = require("path");
const vm = require("vm");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");

function loadModule(relativePath, dependencies = {}) {
  const file = path.join(root, relativePath);
  const code = babel.transformFileSync(file, {
    plugins: ["@babel/plugin-transform-modules-commonjs"],
    sourceType: "module",
    babelrc: false,
    configFile: false
  }).code;
  const testModule = { exports: {} };
  const context = vm.createContext({
    module: testModule,
    exports: testModule.exports,
    require(request) {
      if (dependencies[request]) return dependencies[request];
      if (request.startsWith("../") || request.startsWith("../../")) return {};
      throw new Error(`Unexpected dependency: ${request}`);
    },
    Date,
    Math,
    Number,
    Object,
    Array,
    String,
    JSON
  });
  vm.runInContext(code, context, { filename: file });
  return testModule.exports;
}

const canonical = loadModule(
  "src/features/wealth-journey/canonicalRealWealthContextService.js"
);
const progressEngine = loadModule(
  "src/features/wealth-journey/goalProgressIntelligenceEngine.js"
);
const planner = loadModule(
  "src/features/wealth-journey/goalGapRecoveryPlanner.js",
  { "./goalProgressIntelligenceEngine": progressEngine }
);

const monthly = canonical.extractCanonicalContributionBehavior({
  profile: { contribution: "Monthly", amount: 10000 }
});
if (monthly.monthlyContribution !== 10000) {
  throw new Error("Saved monthly profile amount did not reach the contribution contract.");
}
if (monthly.practiceUsed) throw new Error("Practice cannot provide contribution evidence.");

const quarterly = canonical.extractCanonicalContributionBehavior({
  profile: { contribution: "Quarterly", amount: 12000 }
});
if (quarterly.monthlyContribution !== 4000) {
  throw new Error("Quarterly amount was not normalized to a monthly planning value.");
}

const trajectory = progressEngine.calculateGoalRequiredTrajectory({
  goal: {
    name: "FINANCIAL_FREEDOM",
    targetAmount: 2500000,
    targetDate: "2030-12-31",
    currency: "KES"
  },
  currentPosition: { currentGoalValue: 1174834.4 },
  contributionBehavior: monthly,
  planningAssumptions: { annualReturnPercentage: 8 },
  asOfDate: "2026-08-19"
});

if (trajectory.monthlyContribution !== 10000) {
  throw new Error("Goal projection dropped the current monthly contribution.");
}
if (!(trajectory.projectedValue > 1639883.24)) {
  throw new Error("Contribution-aware projection did not improve on the growth-only baseline.");
}

const scenario = planner.buildContributionRecoveryScenario({
  progress: {
    goal: { currency: "KES" },
    trajectory: {
      ...trajectory,
      requiredMonthlyContribution: 13980.37
    }
  },
  contributionBehavior: monthly
});

if (scenario.impact.monthlyContributionIncrease !== 3980.37) {
  throw new Error("Recovery impact must be the additional contribution, not the total contribution.");
}
if (!scenario.description.includes("KES 10000") || !scenario.description.includes("KES 13980.37")) {
  throw new Error("Recovery copy does not explain the current and proposed monthly amounts.");
}

console.log("PASS — Monthly KES 10,000 profile evidence reaches Wealth Journey.");
console.log("PASS — recurring contributions increase the projected goal value.");
console.log("PASS — recovery options calculate only the additional amount required.");
console.log("PASS — quarterly compatibility and Practice exclusion remain explicit.");
