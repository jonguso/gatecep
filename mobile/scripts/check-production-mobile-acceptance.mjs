import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");
const exists = (name) => access(new URL(name, root)).then(() => true, () => false);

const [login, api, eas, app, pdfApi, cashPolicy, portfolioPolicy, tradeBoundary] = await Promise.all([
  read("app/login.js"), read("src/config/apiConfig.js"), read("eas.json"), read("app.json"),
  read("src/services/brokers/brokerPdfExtractionApi.js"),
  read("src/features/broker-sync/brokerCashEvidencePolicy.js"),
  read("src/features/broker-sync/brokerCashEvidencePolicy.js"),
  read("app/trade.js")
]);

assert.match(login, /gatecep-brand-master\.png/);
assert.match(login, /accessibilityLabel="GateCEP logo"/);
assert.match(login, /backgroundColor: "#08A9E6"/);
assert.equal(await exists("assets/gatecep-brand-master.png"), true);
assert.match(api, /https:\/\/gatecep-trader-production\.up\.railway\.app/);
assert.match(pdfApi, /Authorization: `Bearer \$\{token\}`/);
assert.match(cashPolicy, /statementEffectiveDate/);
assert.match(portfolioPolicy, /hasConnectedRealBrokerAccount/);
assert.match(tradeBoundary, /PRACTICE/);
const easJson = JSON.parse(eas);
const appJson = JSON.parse(app);
assert.equal(easJson.build?.preview?.android?.buildType, "apk");
assert.equal(easJson.build?.production?.android?.buildType, "app-bundle");
assert.equal(appJson.expo?.android?.package, "com.gatecep.mobile");
assert.equal(appJson.expo?.ios?.bundleIdentifier, "com.gatecep.mobile");

for (const route of [
  "app/(tabs)/dashboard.js", "app/(tabs)/markets.js", "app/(tabs)/trading.js",
  "app/(tabs)/calendar.js", "app/(tabs)/news.js", "app/unified-portfolio-analytics.js"
]) assert.equal(await exists(route), true, `${route} must exist`);

console.log("PASS — approved blue GateCEP logo and accessible branding appear on Login.");
console.log("PASS — production API, authenticated PDF evidence, and cash-date controls remain wired.");
console.log("PASS — REAL holdings protection and Practice trade boundary remain present.");
console.log("PASS — core investor routes and Android/iOS release identities are present.");
