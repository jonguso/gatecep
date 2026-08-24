#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M13A — INTERACTIVE MARKET DEPTH VERIFICATION"
echo "============================================================"

node scripts/test-pc030m13a-interactive-market-depth.mjs

node - <<'NODE'
const fs = require("fs");
const babel = require("@babel/core");
for (const filename of [
  "app/(tabs)/markets.js",
  "src/components/markets/MarketDepthModal.js",
  "src/services/markets/marketHubData.js"
]) {
  babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    presets: ["babel-preset-expo"]
  });
}
console.log("PASS — interactive Markets source parses successfully.");
NODE

echo "PC-030M13A interactive market depth verification complete."
