const fs = require("fs");
const path = require("path");
const vm = require("vm");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(
  root,
  "src/features/wealth-journey/goalRecoveryOptionsService.js"
);

const scenarios = Array.from({ length: 5 }, (_, index) => ({
  id: `OPTION_${index + 1}`,
  title: `Recovery option ${index + 1}`,
  feasibilityScore: 90 - index,
  impact: { projectedValue: 1200000 + index }
}));

const runtimeResult = {
  experience: {
    journey: {
      goalAdvice: [
        {
          goal: { id: "GOAL_1", name: "FINANCIAL_FREEDOM" },
          progress: { status: "SIGNIFICANT_GAP" },
          recovery: {
            recoveryNeeded: true,
            scenarios,
            recommendedScenarioId: "OPTION_3",
            safeguards: { advisoryOnly: true }
          }
        }
      ],
      topPriorityGoal: null
    }
  }
};

const transformed = babel.transformFileSync(sourcePath, {
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
    if (request === "./realWealthJourneyRuntime") {
      return {
        loadRealCurrentInvestorWealthJourney: async () => runtimeResult
      };
    }
    throw new Error(`Unexpected dependency: ${request}`);
  }
});

vm.runInContext(transformed, context, { filename: sourcePath });

(async () => {
  const result = await testModule.exports.loadCurrentGoalRecoveryOptions({
    goalId: "GOAL_1"
  });

  if (!result.available) throw new Error("Recovery options should be available.");
  if (result.scenarios.length !== 5) throw new Error("The five runtime scenarios were not preserved.");
  if (result.recommendedScenarioId !== "OPTION_3") throw new Error("Recommended option was not preserved.");
  if (result.goal?.id !== "GOAL_1") throw new Error("Requested goal was not selected.");
  if (!result.safeguards.advisoryOnly) throw new Error("Recovery review must remain advisory-only.");
  if (result.safeguards.goalChanged || result.safeguards.portfolioChanged || result.safeguards.contributionChanged) {
    throw new Error("Review must not mutate the goal, contribution, or portfolio.");
  }
  if (result.safeguards.practiceUsed) throw new Error("Practice data cannot enter recovery planning.");

  console.log("PASS — existing ranked recovery scenarios reach the focused review route.");
  console.log("PASS — the recommended scenario and goal selection are preserved.");
  console.log("PASS — review remains advisory-only and excludes Practice data.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
