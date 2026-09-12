#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2E — Diversified Recovery Portfolio Preview"
node mobile/scripts/test-pc030m20av2e-recovery-portfolio-preview.mjs
grep -Fq 'pathname: "/goal-recovery-preview"' mobile/app/goal-recovery-allocation.js
grep -Fq 'Review projected portfolio' mobile/app/goal-recovery-allocation.js
grep -Fq 'Continue to Broker Action Plan' mobile/app/goal-recovery-preview.js
grep -Fq 'loadCanonicalRealWealthMetrics' mobile/app/goal-recovery-preview.js
grep -Fq 'buildDiversifiedRecoveryPortfolioPreview' mobile/app/goal-recovery-preview.js
grep -Fq 'saveBrokerActionPlan' mobile/app/goal-recovery-preview.js
grep -Fq 'scenarioFundingOnly:true' mobile/src/features/wealth-journey/goalRecoveryPortfolioPreviewService.js
grep -Fq 'chargesInvented:false' mobile/src/features/wealth-journey/goalRecoveryPortfolioPreviewService.js
echo "PASS — projected portfolio preview occurs before Broker Action Plan."
echo "PASS — preview uses canonical REAL holdings/cash baseline."
echo "PASS — full diversified basket is modeled together."
echo "PASS — sector exposures are shown current vs projected."
echo "PASS — no fee estimate is fabricated."
echo "PASS — preview remains read-only/advisory."
echo "PC-030M20AV2E verification complete."
