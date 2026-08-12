import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE = path.join(
  ROOT,
  "src/features/performance/performanceBenchmarkGoalIntelligenceService.js"
);

let benchmarkResult;
let wealthJourneyResult;
let realMetricsResult;

const context = vm.createContext({
  console,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Promise
});

function synthetic(identifier, exports) {
  const names = Object.keys(exports);
  return new vm.SyntheticModule(
    names,
    function initialize() {
      for (const name of names) this.setExport(name, exports[name]);
    },
    { context, identifier }
  );
}

const dependencies = new Map([
  [
    "./benchmarkComparisonService",
    synthetic("benchmark", {
      DEFAULT_BENCHMARK_CODE: "NSE_ALL_SHARE",
      buildPortfolioBenchmarkSummary: async () => benchmarkResult
    })
  ],
  [
    "../wealth-journey/realWealthJourneyRuntime",
    synthetic("journey", {
      loadRealCurrentInvestorWealthJourney: async () => wealthJourneyResult
    })
  ],
  [
    "../wealth-journey/canonicalRealWealthMetricsService",
    synthetic("metrics", {
      loadCanonicalRealWealthMetrics: async () => realMetricsResult
    })
  ]
]);

const module = new vm.SourceTextModule(
  fs.readFileSync(SERVICE, "utf8"),
  { context, identifier: SERVICE }
);

await module.link(async (specifier) => {
  const dependency = dependencies.get(specifier);
  if (!dependency) throw new Error(`Unexpected dependency: ${specifier}`);
  return dependency;
});
await module.evaluate();

const build = module.namespace.buildPerformanceBenchmarkGoalIntelligence;

function goalJourney(goalProgress = null) {
  return {
    status: "READY",
    experience: {
      journey: {
        topPriorityGoal: goalProgress,
        goalAdvice: goalProgress ? [goalProgress] : []
      }
    }
  };
}

async function run(name, configure, verify) {
  benchmarkResult = {
    status: "BENCHMARK_NOT_AVAILABLE",
    message: "No genuine benchmark history."
  };
  wealthJourneyResult = goalJourney();
  realMetricsResult = { active: false, netWorth: null };
  configure();
  const result = await build();
  verify(result);
  console.log(`PASS ${name}`);
}

await run("benchmark unavailable is N/A", () => {}, (result) => {
  assert.equal(result.benchmark.available, false);
  assert.equal(result.benchmark.relativeStatus, "NOT_AVAILABLE");
  assert.equal(result.benchmark.portfolioReturnPercentage, null);
});

await run("2-4 matched observations remain N/A", () => {
  benchmarkResult = {
    status: "INSUFFICIENT_HISTORY",
    matchedObservations: 4,
    portfolioReturnPercentage: 3,
    benchmarkReturnPercentage: 2,
    activeReturnPercentage: 1,
    message: "At least 5 observations are required."
  };
}, (result) => {
  assert.equal(result.benchmark.available, false);
  assert.equal(result.benchmark.relativeStatus, "NOT_AVAILABLE");
  assert.match(result.benchmark.message, /required/i);
});

await run("preliminary genuine history is available", () => {
  benchmarkResult = {
    status: "PRELIMINARY",
    matchedObservations: 5,
    portfolioReturnPercentage: 3,
    benchmarkReturnPercentage: 2,
    activeReturnPercentage: 1
  };
}, (result) => {
  assert.equal(result.benchmark.available, true);
  assert.equal(result.benchmark.relativeStatus, "AHEAD");
});

await run("sufficient benchmark can be behind", () => {
  benchmarkResult = {
    status: "UNDERPERFORMING",
    matchedObservations: 25,
    portfolioReturnPercentage: 4,
    benchmarkReturnPercentage: 7,
    activeReturnPercentage: -3
  };
}, (result) => {
  assert.equal(result.benchmark.available, true);
  assert.equal(result.benchmark.relativeStatus, "BEHIND");
});

await run("missing goal remains unavailable", () => {
  realMetricsResult = { active: true, netWorth: 250000 };
}, (result) => {
  assert.equal(result.goal.available, false);
  assert.equal(result.goal.status, "NOT_ENOUGH_DATA");
});

await run("amount-only goal has progress but no track status", () => {
  realMetricsResult = { active: true, netWorth: 250000 };
  wealthJourneyResult = goalJourney({
    progress: { goal: { id: "g1", targetAmount: 1000000, targetDate: null } }
  });
}, (result) => {
  assert.equal(result.goal.available, true);
  assert.equal(result.goal.currentProgressPercentage, 25);
  assert.equal(result.goal.remainingAmount, 750000);
  assert.equal(result.goal.status, "TARGET_DATE_REQUIRED");
  assert.equal(result.goal.hasTrajectoryEvidence, false);
});

await run("dated valid goal preserves on-track evidence", () => {
  realMetricsResult = { active: true, netWorth: 500000 };
  wealthJourneyResult = goalJourney({
    progress: {
      goal: { id: "g2", targetAmount: 1000000, targetDate: "2030-12-31" },
      trajectory: {
        valid: true,
        monthsRemaining: 52,
        projectedValue: 1010000,
        projectedGap: 10000,
        requiredMonthlyContribution: 7500
      },
      classification: { status: "ON_TRACK", label: "On track" }
    }
  });
}, (result) => {
  assert.equal(result.goal.status, "ON_TRACK");
  assert.equal(result.goal.hasTrajectoryEvidence, true);
  assert.equal(result.goal.requiredMonthlyContribution, 7500);
});

await run("achieved goal needs no fabricated trajectory", () => {
  realMetricsResult = { active: true, netWorth: 1200000 };
  wealthJourneyResult = goalJourney({
    progress: { goal: { id: "g3", targetAmount: 1000000, targetDate: null } }
  });
}, (result) => {
  assert.equal(result.goal.achieved, true);
  assert.equal(result.goal.status, "ACHIEVED");
  assert.equal(result.goal.remainingAmount, 0);
});

await run("Practice-only context cannot create goal progress", () => {
  wealthJourneyResult = {
    status: "PRACTICE_ONLY",
    experience: { journey: { topPriorityGoal: null, goalAdvice: [] } }
  };
  realMetricsResult = { active: false, netWorth: null };
}, (result) => {
  assert.equal(result.goal.available, false);
  assert.equal(result.goal.currentNetWorth, null);
  assert.equal(result.safeguards.practiceIncluded, false);
});

console.log("PC-030C2C8 runtime contract scenarios complete.");
