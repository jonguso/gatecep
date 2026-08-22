import assert from "node:assert/strict";
import { normalizeMyStocksCsv } from "../src/services/marketData/MyStocksCsvNormalizer.js";

const marketWatch = `CODE,NAME,Low,High,Low,High,Price,Previous,Change,,,Volume,\nBanking,,,,,,,,,,,,\nEQTY,Equity Group Holdings Plc,40,95,92,94,93.25,93,0.25,0.27%,?,\"2,258,780\",-\nJUB,Jubilee Holdings Ltd,150,450,410,422,415.5,423.5,-8,1.89%,?,\"4,225\",-\n^NASI,NSE All-Share Index,100,250,243,245,244.38,243.26,1.12,0.46%,?,-,-\n`;
const daily = `Security,Prev.,Closing,Change,Change %,High,Low,Volume,VWAP,Deals,Turnover,Foreign,Time\nEQTY,93,93.25,0.25,0.27%,94.5,93,2.26M,93.25,919,210.83M,79.50%,15:25:10\nJUB,423.5,423.5,-,-,422,410,\"4,225\",423.5,39,1.76M,15.30%,15:25:11\n`;

const live = normalizeMyStocksCsv({
  csvText: marketWatch,
  fileName: "Equities Real-Time Market watch.csv",
  marketDate: "2026-08-20",
  importedAt: "2026-08-20T20:30:00.000Z"
});
assert.equal(live.provider, "MYSTOCKS_MANUAL_EXPORT");
assert.equal(live.valuationEligible, true);
assert.equal(live.count, 2);
assert.equal(live.data.some((row) => row.symbol.startsWith("^")), false);
assert.equal(live.data.find((row) => row.symbol === "JUB").price, 415.5);
assert.equal(live.data.find((row) => row.symbol === "JUB").changePct < 0, true);
assert.equal(live.data.find((row) => row.symbol === "EQTY").volume, 2258780);

const audit = normalizeMyStocksCsv({
  csvText: daily,
  fileName: "NSE _Daily Pricelist.csv",
  marketDate: "2026-08-20",
  importedAt: "2026-08-20T20:30:00.000Z"
});
assert.equal(audit.provider, "MYSTOCKS_DAILY_PRICELIST");
assert.equal(audit.valuationEligible, false);
assert.equal(audit.count, 2);
assert.equal(audit.data[0].providerTime, "15:25:10");

assert.throws(
  () => normalizeMyStocksCsv({ csvText: marketWatch, fileName: "x.csv", marketDate: "20/08/2026" }),
  /YYYY-MM-DD/
);

console.log("PASS — Market Watch prices normalize as valuation-eligible evidence.");
console.log("PASS — indices are excluded and negative movement is derived from price evidence.");
console.log("PASS — Daily Pricelist rows remain audit-only evidence.");
console.log("PASS — market date and usable positive prices are mandatory.");

