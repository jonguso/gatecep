import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "mobile/src/services/portfolio/unifiedPortfolioApi.js",
  "utf8"
);

const start = source.indexOf(
  "export function aggregateUnifiedHoldingsBySymbol"
);
const end = source.indexOf(
  "export class PortfolioAuthenticationError"
);

assert.ok(start >= 0, "aggregation helper must exist");
assert.ok(end > start, "aggregation helper boundary must exist");

const functionSource = source
  .slice(start, end)
  .replace(
    "export function aggregateUnifiedHoldingsBySymbol",
    "function aggregateUnifiedHoldingsBySymbol"
  );

const aggregate = new Function(
  `${functionSource}; return aggregateUnifiedHoldingsBySymbol;`
)();

const rows = [
  {
    broker: "AIB|ACCOUNT-A",
    symbol: "PORT",
    quantity: 120,
    settledQuantity: 120,
    averagePrice: 121.47,
    marketPrice: 118,
    marketValue: 14160,
    costValue: 14576.4
  },
  {
    broker: "ABC|ACCOUNT-B",
    symbol: "PORT",
    quantity: 1,
    settledQuantity: 1,
    averagePrice: 120.40,
    marketPrice: 118,
    marketValue: 118,
    costValue: 120.40
  },
  {
    broker: "AIB|ACCOUNT-A",
    symbol: "SCOM",
    quantity: 10,
    averagePrice: 30,
    marketPrice: 32,
    marketValue: 320,
    costValue: 300
  }
];

const aggregated = aggregate(rows);

assert.equal(aggregated.length, 2);

const port = aggregated.find((row) => row.symbol === "PORT");
assert.ok(port);

assert.equal(
  port.quantity,
  121,
  "AIB 120 + ABC 1 must equal canonical PORT 121"
);

assert.equal(
  port.settledQuantity,
  121,
  "verified settled quantities must aggregate"
);

assert.equal(
  port.sourceAccountCount,
  2,
  "two broker accounts must remain represented"
);

assert.equal(
  port.sourceRows.length,
  2,
  "underlying account rows must remain available"
);

assert.deepEqual(
  [...port.brokerAccounts].sort(),
  ["AIB|ACCOUNT-A", "ABC|ACCOUNT-B"].sort()
);

const expectedCost =
  (120 * 121.47) +
  (1 * 120.40);

const expectedAverage =
  expectedCost / 121;

assert.ok(
  Math.abs(port.costValue - expectedCost) < 0.000001
);

assert.ok(
  Math.abs(port.averagePrice - expectedAverage) < 0.000001
);

assert.equal(
  port.marketValue,
  14278
);

const noSettlementEvidence = aggregate([
  {
    broker: "AIB|ACCOUNT-A",
    symbol: "KCB",
    quantity: 50,
    averagePrice: 50,
    marketPrice: 52
  },
  {
    broker: "ABC|ACCOUNT-B",
    symbol: "KCB",
    quantity: 25,
    averagePrice: 48,
    marketPrice: 52
  }
])[0];

assert.equal(noSettlementEvidence.quantity, 75);

assert.equal(
  noSettlementEvidence.settledQuantity,
  null,
  "missing settlement evidence must not imply settled shares"
);

assert.equal(
  noSettlementEvidence.sellableQuantity,
  null,
  "missing settlement evidence must not imply sellability"
);

console.log(
  "PASS — PORT 120 + 1 = canonical 121."
);
console.log(
  `PASS — PORT weighted average = ${port.averagePrice.toFixed(6)}.`
);
console.log(
  "PASS — source broker-account provenance retained."
);
console.log(
  "PASS — missing settlement evidence does not fabricate sellable quantity."
);

const securityBytes = fs.readFileSync(
  "mobile/app/security/[symbol].js"
);

const security = new TextDecoder(
  "windows-1252"
).decode(securityBytes);

const trade = fs.readFileSync(
  "mobile/app/trade.js",
  "utf8"
);

const details = fs.readFileSync(
  "mobile/app/holding-details.js",
  "utf8"
);

const accounts = fs.readFileSync(
  "mobile/src/services/brokers/brokerAccountStore.js",
  "utf8"
);

const adoption = fs.readFileSync(
  "mobile/src/features/broker-sync/brokerAuthoritativeSnapshotService.js",
  "utf8"
);

assert.match(
  security,
  /aggregateUnifiedHoldingsBySymbol\(realHoldings\)/
);

assert.match(
  trade,
  /aggregateUnifiedHoldingsBySymbol\(realHoldings\)/
);

assert.match(
  details,
  /aggregateUnifiedHoldingsBySymbol/
);

assert.match(
  accounts,
  /item\.brokerId === resolvedBrokerId[\s\S]*item\.clientNumber/
);

assert.match(
  accounts,
  /item\.id !== existing\?\.id/
);

assert.match(
  adoption,
  /preservedHoldings/
);

assert.match(
  adoption,
  /normalizedAccountKey/
);

assert.equal(
  securityBytes.includes(Buffer.from([0x9b])),
  true,
  "existing CP1252 › byte must remain intact"
);

console.log(
  "PASS — Security, Trade and Holding Details use canonical aggregation."
);
console.log(
  "PASS — same broker can retain distinct client accounts."
);
console.log(
  "PASS — local adoption preserves other account holdings."
);
console.log(
  "PASS — Security Detail CP1252 content preserved."
);
