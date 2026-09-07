#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20R — DEFENSIVE INVESTMENT POLICY"
echo "============================================================"
node scripts/test-pc030m20r-defensive-investment-policy.mjs
node --check src/features/risk/riskProfiles.js
node --check src/features/risk/riskStore.js
node --check src/features/rebalancing/allocationTemplates.js
node --check src/features/rebalancing/rebalanceStore.js
node --check src/features/rebalancing/driftAnalysisService.js
node --check src/features/rebalancing/rebalanceRecommendationService.js
echo "PC-030M20R defensive investment policy verification complete."
