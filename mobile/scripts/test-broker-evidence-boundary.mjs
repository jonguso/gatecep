import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map(),
  accounts: []
};

const context = vm.createContext({
  console,
  Date,
  Error,
  JSON,
  Array,
  Number,
  String,
  Set,
  Map
});
context.__state = state;

function sourceModule(code, identifier) {
  return new vm.SourceTextModule(code, { context, identifier });
}

const servicePath = new URL(
  "../src/features/broker-sync/brokerSyncService.js",
  import.meta.url
);
const service = sourceModule(await readFile(servicePath, "utf8"), servicePath.href);

const storage = sourceModule(
  `export async function userGetItem(key) { return globalThis.__state.storage.get(key) || null; }
   export async function userSetItem(key, value) { globalThis.__state.storage.set(key, value); }
   export async function userRemoveItem(key) { globalThis.__state.storage.delete(key); }`,
  "mock:storage"
);
const accounts = sourceModule(
  `export async function loadBrokerAccounts() { return globalThis.__state.accounts; }`,
  "mock:accounts"
);
const sync = sourceModule(
  `export async function syncBrokerPortfolio() { throw new Error("adapter should not run"); }`,
  "mock:sync"
);

await service.link(async (specifier) => {
  if (specifier === "../../auth/userStorage") return storage;
  if (specifier === "../../services/brokers/brokerAccountStore") return accounts;
  if (specifier === "../../services/brokers/brokerPortfolioSync") return sync;
  throw new Error(`Unexpected dependency: ${specifier}`);
});
await storage.evaluate();
await accounts.evaluate();
await sync.evaluate();
await service.evaluate();

state.storage.set(
  "brokerMirrorPortfolio",
  JSON.stringify({
    broker: "GateCEP Broker Sandbox",
    runtimeMode: "UNVERIFIED",
    holdings: [{ symbol: "FAKE", quantity: 100 }]
  })
);

assert.equal(await service.namespace.loadBrokerMirror(), null);
assert.equal(state.storage.has("brokerMirrorPortfolio"), false);
assert.equal(state.storage.has("quarantinedLegacyBrokerMirror"), true);

const verified = await service.namespace.saveVerifiedUploadedBrokerMirror({
  holdings: [{ symbol: "SCOM", quantity: 10, marketPrice: 20 }],
  fileName: "broker-statement.xlsx"
});

assert.equal(verified.runtimeMode, "REAL_VERIFIED_UPLOAD");
assert.equal(verified.source, "BROKER_VALUATION_UPLOAD");
assert.equal(verified.cashEvidenceAvailable, false);
assert.equal((await service.namespace.loadBrokerMirror()).holdings[0].symbol, "SCOM");

const withCash = await service.namespace.attachVerifiedBrokerCashEvidence({
  cashBalance: 2500,
  fileName: "cash-ledger.xlsx"
});
assert.equal(withCash.cashEvidenceAvailable, true);
assert.equal(withCash.cashBalance, 2500);
assert.equal(withCash.cashEvidenceFileName, "cash-ledger.xlsx");

state.accounts = [{ brokerId: "SIM", connectionMode: "DEMO" }];
await assert.rejects(
  () => service.namespace.syncConnectedBrokerMirror(),
  /No connected broker account/
);

console.log("PASS — legacy Sandbox mirrors are quarantined.");
console.log("PASS — verified uploads create REAL read-only broker evidence.");
console.log("PASS — broker cash evidence completes the independent mirror.");
console.log("PASS — demo broker accounts cannot enter connected REAL sync.");
