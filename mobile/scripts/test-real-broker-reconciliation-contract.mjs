import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const context = vm.createContext({
  console,
  Date,
  Map,
  Set,
  Array,
  Number,
  String,
  Math,
  Object
});

const realPortfolio = {
  id: "ALL",
  type: "ALL",
  name: "All Accounts",
  isReal: true,
  isPractice: false,
  holdings: [
    { symbol: "SCOM", quantity: 10, marketPrice: 20, marketValue: 200 }
  ],
  availableCash: 100,
  totalValue: 300
};

const practicePortfolio = {
  holdings: [
    { symbol: "FAKE", quantity: 999, marketPrice: 999, marketValue: 998001 }
  ]
};

const brokerMirror = {
  broker: "Connected Broker",
  accountName: "REAL Account",
  cashBalance: 100,
  holdingsValue: 250,
  totalValue: 350,
  holdings: [
    { symbol: "SCOM", quantity: 10, marketPrice: 20, marketValue: 200 },
    { symbol: "EQTY", quantity: 5, marketPrice: 10, marketValue: 50 }
  ]
};

function moduleFrom(code, identifier) {
  return new vm.SourceTextModule(code, { context, identifier });
}

const sourcePath = new URL(
  "../src/features/broker-sync/brokerReconciliationService.js",
  import.meta.url
);
const source = await readFile(sourcePath, "utf8");
const service = moduleFrom(source, sourcePath.href);

const realModule = moduleFrom(
  `export async function loadCanonicalRealBrokerPortfolio() {
     return globalThis.__realPortfolio;
   }`,
  "mock:canonical-real"
);
const mirrorModule = moduleFrom(
  `export async function loadBrokerMirror() {
     return globalThis.__brokerMirror;
   }`,
  "mock:broker-mirror"
);

context.__realPortfolio = realPortfolio;
context.__practicePortfolio = practicePortfolio;
context.__brokerMirror = brokerMirror;

await service.link(async (specifier) => {
  if (specifier === "./canonicalRealBrokerPortfolioService") return realModule;
  if (specifier === "./brokerSyncService") return mirrorModule;
  throw new Error(`Unexpected dependency: ${specifier}`);
});
await realModule.evaluate();
await mirrorModule.evaluate();
await service.evaluate();

const result = await service.namespace.buildBrokerReconciliation();

assert.equal(result.realPortfolio.totalValue, 300);
assert.equal(result.practicePortfolio, undefined);
assert.equal(result.holdings.some((holding) => holding.symbol === "FAKE"), false);
assert.equal(result.holdings.find((holding) => holding.symbol === "SCOM").status, "MATCHED");
assert.equal(result.holdings.find((holding) => holding.symbol === "EQTY").status, "EXTRA_AT_BROKER");
assert.equal(result.summary.extraAtBroker, 1);

console.log("PASS — reconciliation reads canonical REAL All Accounts.");
console.log("PASS — Practice holdings cannot enter reconciliation.");
console.log("PASS — broker-only REAL discrepancies remain reviewable.");
