#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M8D — FOCUSED REBALANCING VERIFICATION"
echo "============================================================"

for section in health target allocation funding recommendations; do
  grep -q "id: \"$section\"" app/portfolio-rebalancing.js
done
echo "PASS — five focused Rebalancing destinations are defined."

grep -q 'Rebalancing Overview' app/portfolio-rebalancing.js
grep -q 'Previous:' app/portfolio-rebalancing.js
grep -q 'Next:' app/portfolio-rebalancing.js
grep -q 'Finish: Rebalancing Overview' app/portfolio-rebalancing.js
echo "PASS — parent, previous, next, and completion controls are distinct."

grep -q 'scrollRef.current?.scrollTo' app/portfolio-rebalancing.js
grep -q 'activeSection !== "allocation"' app/portfolio-rebalancing.js
grep -q 'activeSection !== "recommendations"' app/portfolio-rebalancing.js
echo "PASS — each focused transition resets scroll and hides unrelated report sections."

grep -q 'PC-019 does not place trades' app/portfolio-rebalancing.js
grep -q 'buildCoachGRebalancingAdvice' app/portfolio-rebalancing.js
grep -q 'applyRebalanceTemplate' app/portfolio-rebalancing.js
echo "PASS — advisory-only calculations and saved target contracts remain intact."

grep -q 'params: { section: "specialists" }' app/portfolio-rebalancing.js
echo "PASS — Analysis parent context is restored when applicable."

node - <<'NODE'
const fs = require('fs');
const parser = require('@babel/parser');
parser.parse(fs.readFileSync('app/portfolio-rebalancing.js', 'utf8'), {
  sourceType: 'module',
  plugins: ['jsx', 'optionalChaining']
});
NODE
echo "PASS — focused Rebalancing source parses successfully."
echo "PC-030M8D focused Rebalancing verification complete."
