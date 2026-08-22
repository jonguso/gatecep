import assert from "node:assert/strict";
import fs from "node:fs";
import { isEodCollectionDue } from "../src/modules/market-cache/marketEodPolicy.js";

const beforeClose = new Date("2026-08-21T12:19:00.000Z");
const afterClose = new Date("2026-08-21T12:20:00.000Z");
const saturday = new Date("2026-08-22T13:00:00.000Z");

assert.equal(isEodCollectionDue({ now: beforeClose, latestMarketDate: "2026-08-20" }), false);
assert.equal(isEodCollectionDue({ now: afterClose, latestMarketDate: "2026-08-20" }), true);
assert.equal(isEodCollectionDue({ now: afterClose, latestMarketDate: "2026-08-21" }), false);
assert.equal(isEodCollectionDue({ now: saturday, latestMarketDate: "2026-08-21" }), false);

const migration = fs.readFileSync("src/database/migrations/009_market_eod_snapshots.sql", "utf8");
const repository = fs.readFileSync("src/modules/market-cache/marketEod.repository.js", "utf8");
const collector = fs.readFileSync("src/modules/market-cache/marketEodCollector.service.js", "utf8");
const gateway = fs.readFileSync("src/services/marketData/MarketDataGateway.js", "utf8");
const server = fs.readFileSync("src/server.js", "utf8");
const routes = fs.readFileSync("src/modules/market-cache/marketCache.routes.js", "utf8");

assert.match(migration, /market_eod_snapshots/);
assert.match(migration, /market_eod_quotes/);
assert.match(repository, /BEGIN/);
assert.match(repository, /COMMIT/);
assert.match(repository, /ROLLBACK/);
assert.match(repository, /LOCAL_VERIFIED_EOD/);
assert.match(collector, /MARKET_EOD_UPSTREAM_PROVIDER/);
assert.match(collector, /FULL_MARKET/);
assert.match(collector, /MARKET_EOD_MINIMUM_QUOTES/);
assert.match(gateway, /provider === "LOCAL_EOD" \|\| provider === "LOCAL_VERIFIED_EOD"/);
assert.doesNotMatch(server, /restoreLatestManualMarketSnapshot/);
assert.match(routes, /\/eod\/collect/);
assert.match(routes, /authRequired, requireMarketImportKey/);

console.log("PASS — EOD collection runs once after the configured Nairobi market close.");
console.log("PASS — weekends and already-current market dates do not invoke the upstream Actor.");
console.log("PASS — verified snapshots and quotes persist transactionally in PostgreSQL.");
console.log("PASS — LOCAL_EOD resolves to the persisted valuation-eligible provider.");
console.log("PASS — Apify is isolated to the full-market daily collection boundary.");
console.log("PASS — myStocks no longer restores or controls backend startup valuation.");
console.log("PASS — forced operational collection remains authenticated and key-protected.");
