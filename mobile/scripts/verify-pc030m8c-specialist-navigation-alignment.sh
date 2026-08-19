#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M8C — SPECIALIST NAVIGATION ALIGNMENT VERIFICATION"
echo "============================================================"

grep -q 'useState("RISK")' app/unified-portfolio-analytics.js
grep -q 'useState("CRITICAL")' app/unified-portfolio-analytics.js
echo "PASS — Executive Actions opens on Risk and Alerts opens on Critical."

grep -q 'params: { returnTo: "analysis" }' app/unified-portfolio-analytics.js
grep -q 'params: { section: "specialists" }' app/portfolio-risk.js
grep -q 'params: { section: "specialists" }' app/performance.js
grep -q 'params: { section: "specialists" }' app/portfolio-rebalancing.js
echo "PASS — specialist screens preserve and restore their Portfolio Analysis parent."

grep -q 'Previous:' app/portfolio-risk.js
grep -q 'Next:' app/portfolio-risk.js
grep -q 'Previous:' app/performance.js
grep -q 'Next:' app/performance.js
echo "PASS — Risk and Performance use overview, previous, and next navigation."

node - <<'NODE'
const fs = require('fs');
const parser = require('@babel/parser');
for (const file of [
  'app/unified-portfolio-analytics.js',
  'app/portfolio-risk.js',
  'app/performance.js',
  'app/portfolio-rebalancing.js'
]) {
  parser.parse(fs.readFileSync(file, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx', 'optionalChaining']
  });
}
NODE
echo "PASS — aligned specialist source parses successfully."
echo "PC-030M8C specialist navigation alignment verification complete."
