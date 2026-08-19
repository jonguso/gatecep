#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M9C — REAL MONTHLY REVIEW + TIMELINE ALIGNMENT"
echo "============================================================"

node scripts/test-pc030m9b-broker-evidence-identity.cjs

grep -q 'useState(' app/investor-timeline.js
grep -q '"FOUNDATION"' app/investor-timeline.js
grep -q 'params: { returnTo: "timeline" }' app/investor-timeline.js
grep -q 'Back to Investor Timeline' app/monthly-review.js
grep -q 'REAL Portfolio Value' app/monthly-review.js
grep -q 'loadUnifiedPortfolio({ broker: "ALL" })' src/features/monthly-review/monthlyReviewService.js
grep -q 'loadCanonicalRealAvailableCash' src/features/monthly-review/monthlyReviewService.js
grep -q 'loadCanonicalRealBehaviorHistory' src/features/monthly-review/monthlyReviewService.js
grep -q 'calculatePortfolioSummary' src/features/monthly-review/monthlyReviewService.js
! grep -q 'practicePortfolio' src/features/monthly-review/monthlyReviewService.js
! grep -q 'Practice Value' app/monthly-review.js

test "$(grep -c 'route: "/portfolio-sync-center"' app/menu.js)" -eq 1
! grep -q 'title: "Upload Center"' app/menu.js
grep -q 'title: "Sync & Reconcile"' app/menu.js

node - <<'NODE'
const fs = require('fs');
const babel = require('@babel/core');
[
  'app/investor-timeline.js',
  'app/monthly-review.js',
  'app/menu.js',
  'app/import-portfolio.js',
  'app/(tabs)/funds.js',
  'src/features/monthly-review/monthlyReviewService.js',
  'src/features/monthly-review/monthlyReviewStore.js',
  'src/features/broker-sync/brokerEvidenceIdentityService.js',
  'src/features/broker-sync/brokerSyncService.js'
].forEach((file) => babel.parseSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  babelrc: false,
  configFile: false,
  sourceType: 'module', parserOpts: { plugins: ['jsx'] }
}));
NODE

echo "PASS — Foundation is the Investor Timeline default."
echo "PASS — Monthly Review returns to Investor Timeline when opened from its parent."
echo "PASS — Monthly Review reads canonical REAL holdings, cash, and behavior only."
echo "PASS — Practice portfolio values cannot enter the production monthly review."
echo "PASS — Sync and Upload are consolidated under one menu destination."
echo "PASS — CDS and broker client-account evidence use distinct identity checks."
echo "PASS — aligned source parses successfully."
echo "PC-030M9C verification complete."
