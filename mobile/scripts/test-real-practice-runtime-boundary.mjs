import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  token: null,
  cache: new Map(),
  response: null
};

const context = vm.createContext({
  console,
  Date,
  Error,
  JSON,
  encodeURIComponent,
  fetch: async () => state.response
});

function sourceModule(code, identifier) {
  return new vm.SourceTextModule(code, { context, identifier });
}

const servicePath = new URL(
  "../src/services/portfolio/unifiedPortfolioApi.js",
  import.meta.url
);
const service = sourceModule(await readFile(servicePath, "utf8"), servicePath.href);

const config = sourceModule(
  `export const API_URL = "https://gatecep.test";`,
  "mock:config"
);
const auth = sourceModule(
  `export async function getStoredAccessToken() { return globalThis.__state.token; }`,
  "mock:auth"
);
const storage = sourceModule(
  `export async function userGetItem(key) {
     return globalThis.__state.cache.get(key) || null;
   }
   export async function userSetItem(key, value) {
     globalThis.__state.cache.set(key, value);
   }`,
  "mock:storage"
);

context.__state = state;

await service.link(async (specifier) => {
  if (specifier === "../../config/apiConfig") return config;
  if (specifier === "../../features/auth/storage/authStorage") return auth;
  if (specifier === "../auth/userStorage") return storage;
  throw new Error(`Unexpected dependency: ${specifier}`);
});
await config.evaluate();
await auth.evaluate();
await storage.evaluate();
await service.evaluate();

await assert.rejects(
  () => service.namespace.loadUnifiedPortfolio(),
  (error) => error?.code === "AUTH_REQUIRED"
);

state.token = "expired-token";
state.cache.set("lastVerifiedRealPortfolio:ALL", JSON.stringify({
  ok: true,
  holdings: [{ symbol: "SCOM", quantity: 10 }],
  source: "ALL",
  runtimeStatus: "LIVE",
  verifiedAt: "2026-08-15T00:00:00.000Z"
}));
state.response = {
  status: 401,
  ok: false,
  text: async () => JSON.stringify({ ok: false, error: "Authentication expired" })
};

await assert.rejects(
  () => service.namespace.loadUnifiedPortfolio(),
  (error) => error?.code === "AUTH_EXPIRED"
);

const staleReal = await service.namespace.loadUnifiedPortfolioRuntime();
assert.equal(staleReal.runtimeStatus, "AUTH_EXPIRED");
assert.equal(staleReal.stale, true);
assert.equal(staleReal.holdings[0].symbol, "SCOM");
assert.equal(staleReal.practicePortfolio, undefined);

state.token = "valid-token";
state.response = {
  status: 200,
  ok: true,
  text: async () =>
    JSON.stringify({
      ok: true,
      holdings: [{ symbol: "EQTY", quantity: 5 }],
      summary: { totalValue: 500 }
    })
};

const liveReal = await service.namespace.loadUnifiedPortfolioRuntime();
assert.equal(liveReal.runtimeStatus, "LIVE");
assert.equal(liveReal.holdings[0].symbol, "EQTY");
assert.equal(
  JSON.parse(state.cache.get("lastVerifiedRealPortfolio:ALL")).holdings[0].symbol,
  "EQTY"
);

state.response = {
  status: 200,
  ok: true,
  text: async () =>
    JSON.stringify({
      ok: true,
      holdings: [{ symbol: "KCB", quantity: 3 }],
      summary: { totalValue: 300 }
    })
};

await service.namespace.loadUnifiedPortfolioRuntime({ broker: "AIB" });
assert.equal(
  JSON.parse(state.cache.get("lastVerifiedRealPortfolio:AIB")).holdings[0].symbol,
  "KCB"
);
assert.equal(
  JSON.parse(state.cache.get("lastVerifiedRealPortfolio:ALL")).holdings[0].symbol,
  "EQTY"
);

console.log("PASS — missing authentication fails closed.");
console.log("PASS — expired authentication cannot select Practice.");
console.log("PASS — stale REAL cache remains explicitly labeled.");
console.log("PASS — successful REAL responses replace the verified cache.");
console.log("PASS — verified REAL caches remain scoped by account selection.");
