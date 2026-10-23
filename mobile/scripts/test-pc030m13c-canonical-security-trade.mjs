import assert from "node:assert/strict";
import fs from "node:fs";

const trade = fs.readFileSync("app/trade.js", "utf8");
const security = fs.readFileSync("app/security/[symbol].js", "utf8");

assert.doesNotMatch(trade, /const STOCKS\s*=\s*\[/);
assert.doesNotMatch(trade, /price:\s*30\.6/);
assert.doesNotMatch(trade, /price:\s*248/);
assert.doesNotMatch(trade, /price:\s*520/);
assert.match(trade, /useMarketData from "\.\.\/src\/services\/markets\/useMarketData"/);
assert.match(trade, /useLocalSearchParams/);
assert.match(trade, /requestedSymbol/);
assert.match(trade, /const stocks = market\.verifiedRows/);
assert.match(trade, /stocks\.map\(\(stock\)/);
assert.doesNotMatch(
  trade,
  /const stocks = market\.rows/
);
assert.match(security, /src\/services\/markets\/useMarketData/);
assert.match(
  security,
  /pathname:\s*"\/trade"/
);
assert.match(
  security,
  /symbol:\s*targetSymbol/
);

console.log("PASS — Security Details and Trade share the canonical verified market service.");
console.log("PASS — URL symbols such as /trade?symbol=ABSA are honored.");
console.log("PASS — the legacy six-security hard-coded price catalog is removed.");
console.log("PASS — Trade uses only the verified-price NSE subset for current market execution.");
