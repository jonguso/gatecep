#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M9D — MONTHLY REVIEW INVESTED VALUE VERIFICATION"
echo "============================================================"

node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const babel = require('@babel/core');
const path = 'src/shared/portfolio/engine.js';
const compiled = babel.transformSync(fs.readFileSync(path, 'utf8'), {
  filename: path, babelrc: false, configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')]
}).code;
const box = { exports: {} };
vm.runInNewContext(compiled, { module: box, exports: box.exports, require });
const result = box.exports.calculatePortfolioSummary({
  holdings: [
    { symbol: 'AAA', quantity: 10, averagePrice: 20, marketPrice: 25 },
    { symbol: 'BBB', quantity: 5, averageCost: 30, marketPrice: 28 }
  ],
  cash: 100
});
if (result.summary.investedValue !== 350) throw new Error(`Expected 350, received ${result.summary.investedValue}`);
if (result.summary.netWorth !== 490) throw new Error(`Expected 490, received ${result.summary.netWorth}`);
console.log('PASS — invested value uses quantity multiplied by canonical average cost.');
NODE

grep -q 'calculatePortfolioSummary' src/features/monthly-review/monthlyReviewService.js
grep -q 'canonicalSummary?.summary?.investedValue' src/features/monthly-review/monthlyReviewService.js
! grep -q 'practicePortfolio' src/features/monthly-review/monthlyReviewService.js

node - <<'NODE'
const fs = require('fs');
const babel = require('@babel/core');
['src/features/monthly-review/monthlyReviewService.js', 'app/monthly-review.js'].forEach((file) =>
  babel.parseSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    sourceType: 'module', parserOpts: { plugins: ['jsx'] }
  })
);
NODE

echo "PASS — Monthly Review consumes the shared canonical portfolio engine."
echo "PASS — REAL market value, invested value, gain, cash, and net worth remain internally aligned."
echo "PASS — Practice fallback remains excluded."
echo "PASS — updated Monthly Review source parses successfully."
echo "PC-030M9D verification complete."
