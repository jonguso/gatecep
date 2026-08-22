const fs = require("fs");
const vm = require("vm");
const babel = require("@babel/core");

const filename = "src/services/markets/canonicalNseQuoteService.js";
const source = fs.readFileSync(filename, "utf8");
const code = babel.transformSync(source, {
  filename,
  babelrc: false,
  configFile: false,
  presets: [[require.resolve("babel-preset-expo"), { lazyImports: false }]],
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")]
}).code;

const moduleValue = { exports: {} };
const sandbox = {
  module: moduleValue,
  exports: moduleValue.exports,
  require(request) {
    if (request.startsWith("@babel/runtime/")) return require(request);
    if (request.includes("apiConfig")) return { API_URL: "https://example.invalid" };
    if (request.includes("userStorage")) return { userGetItem: async () => null, userSetItem: async () => {} };
    throw new Error(`Unexpected dependency: ${request}`);
  },
  console,
  Date,
  Intl,
  fetch: async () => { throw new Error("Network unavailable"); },
  setTimeout,
  clearTimeout
};
vm.runInNewContext(code, sandbox, { filename });

const { overlayCanonicalNseQuotes, isNseMarketSessionOpen } = moduleValue.exports;
const original = [
  { symbol: "SCOM", quantity: 100, averagePrice: 20, marketPrice: 30, marketValue: 3000 },
  { symbol: "KCB", quantity: 25, averagePrice: 40, marketPrice: 50, marketValue: 1250 }
];
const result = overlayCanonicalNseQuotes(original, {
  status: "LIVE",
  source: "VERIFIED_NSE_VENDOR",
  generatedAt: "2026-08-20T10:00:00Z",
  quotes: [{ symbol: "SCOM", price: 32, quotedAt: "2026-08-20T10:00:00Z" }]
});

if (result.holdings[0].quantity !== 100 || result.holdings[0].averagePrice !== 20) throw new Error("Price refresh changed broker position evidence.");
if (result.holdings[0].marketPrice !== 32 || result.holdings[0].marketValue !== 3200) throw new Error("Verified quote was not applied.");
if (result.holdings[0].brokerMarketValue !== 3000) throw new Error("Broker valuation was not preserved.");
if (result.holdings[1].marketPrice !== 50 || result.holdings[1].marketPriceStatus !== "BROKER_VALUATION") throw new Error("Missing quote did not retain broker valuation.");
if (!isNseMarketSessionOpen(new Date("2026-08-24T07:00:00Z"))) throw new Error("NSE weekday session was not detected.");
if (isNseMarketSessionOpen(new Date("2026-08-22T07:00:00Z"))) throw new Error("Weekend was treated as an NSE session.");

console.log("PASS — verified quotes update price and value without changing quantity or cost basis.");
console.log("PASS — missing quotes retain explicitly labeled broker valuation evidence.");
console.log("PASS — automatic refresh is limited to the NSE trading session.");
