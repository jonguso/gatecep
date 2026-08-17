const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { transformSync } = require("@babel/core");

const root = path.resolve(__dirname, "..");

function loadModule(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const code = transformSync(source, {
    filename,
    plugins: ["@babel/plugin-transform-modules-commonjs"]
  }).code;
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require(specifier) {
      if (Object.prototype.hasOwnProperty.call(mocks, specifier)) {
        return mocks[specifier];
      }
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    console,
    Date,
    Map,
    Number,
    String,
    Object,
    Array,
    Boolean,
    JSON,
    Math,
    Promise,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(code, sandbox, { filename });
  return module.exports;
}

const canonical = loadModule(
  "src/features/wealth-journey/canonicalRealWealthContextService.js",
  {
    "../investor/investorContextStore": { loadInvestorContext: async () => ({}) },
    "../../portfolio/unifiedPortfolioApi": { loadUnifiedPortfolio: async () => ({}) },
    "../../portfolio/syncStatus": { buildSyncStatus: async () => ({}) },
    "../portfolio-cash/canonicalPortfolioCashService": {
      loadCanonicalRealAvailableCash: async () => 0
    },
    "../portfolio-source/portfolioSourcePolicy": {
      PORTFOLIO_SOURCE_TYPES: {
        BROKER: "BROKER",
        IMPORTED: "IMPORTED",
        PRACTICE: "PRACTICE"
      },
      buildPortfolioSourceCatalog: () => ({}),
      determineDefaultPortfolioSource: () => null,
      classifyWealthActivation: () => ({ active: false })
    }
  }
);

const extracted = canonical.extractCanonicalTrackableGoals({
  profile: {
    goals: [{
      id: "GOAL_FINANCIAL_FREEDOM",
      name: "FINANCIAL_FREEDOM",
      targetAmount: 2500000,
      targetDate: "2032-12-31"
    }]
  },
  investorDNA: { goal: "FINANCIAL_FREEDOM" }
});

assert.strictEqual(extracted.length, 1);
assert.strictEqual(extracted[0].targetAmount, 2500000);
assert.strictEqual(extracted[0].targetDate, "2032-12-31");
assert.strictEqual(extracted[0].completeness, "PLANNABLE");
console.log("PASS — canonical context preserves saved structured goal details.");

const adapter = loadModule(
  "src/features/wealth-journey/realWealthActivationAdapter.js",
  {
    "./canonicalRealWealthContextService": {
      buildCanonicalRealWealthContext: async () => ({
        investor: {
          goalIntent: "FINANCIAL_FREEDOM",
          investorDNA: {},
          goals: extracted
        },
        wealthActivation: { active: true, status: "ACTIVE" },
        portfolioSources: {
          allAccounts: {
            totalValue: 1000000,
            holdingsValue: 900000,
            availableCash: 100000,
            holdings: []
          }
        }
      })
    },
    "../portfolio-source/portfolioSourcePolicy": {
      PORTFOLIO_SOURCE_TYPES: { ALL: "ALL" }
    }
  }
);

adapter.loadActivatedWealthJourneyContext().then((result) => {
  assert.strictEqual(result.advisorInput.goals.length, 1);
  assert.strictEqual(result.advisorInput.goals[0].targetAmount, 2500000);
  assert.strictEqual(result.advisorInput.goals[0].targetDate, "2032-12-31");
  console.log("PASS — REAL activation uses structured goals instead of resetting them.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
