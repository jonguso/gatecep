#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M8F — MARKET SHOCK DEFAULT VERIFICATION"
echo "============================================================"

grep -q 'useState("MARKET_SHOCK")' app/portfolio-risk.js
echo "PASS — Stress Testing opens with Market Shock selected."

for scenario in ALL MARKET_SHOCK SECTOR_SHOCK SINGLE_HOLDING_SHOCK INFLATION_SHOCK INTEREST_RATE_SHOCK; do
  grep -q "\"$scenario\"" app/portfolio-risk.js
done
echo "PASS — All and every specialist stress scenario remain available."

grep -q 'item?.scenarioType === scenarioFilter' app/portfolio-risk.js
grep -q 'worstScenario' app/portfolio-risk.js
echo "PASS — filtering and worst-scenario evidence remain intact."

node - <<'NODE'
const fs = require('fs');
const parser = require('@babel/parser');
parser.parse(fs.readFileSync('app/portfolio-risk.js', 'utf8'), {
  sourceType: 'module',
  plugins: ['jsx', 'optionalChaining']
});
NODE
echo "PASS — updated Risk source parses successfully."
echo "PC-030M8F Market Shock default verification complete."
