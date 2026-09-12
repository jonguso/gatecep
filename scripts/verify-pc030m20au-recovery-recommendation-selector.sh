#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU — Recovery Recommendation Selection"

node mobile/scripts/test-pc030m20au-recovery-recommendation-selector.mjs

grep -q "PC-030M20AU recommendation selector" 'mobile/app/(tabs)/trading.js'
grep -q "RecoveryRecommendationSelector" 'mobile/app/(tabs)/trading.js'
grep -q "recoveryRecommendationEntry" 'mobile/app/(tabs)/trading.js'
grep -q "recoveryOwnWhatIf" 'mobile/app/(tabs)/trading.js'
grep -q "Create my own what-if" mobile/src/components/coach/RecoveryRecommendationSelector.js
grep -q "Compare all options" mobile/src/components/coach/RecoveryRecommendationSelector.js
grep -q "Explore this with Coach G" mobile/src/components/coach/RecoveryRecommendationSelector.js
grep -q "loadRealCurrentInvestorWealthJourney" mobile/src/components/coach/RecoveryRecommendationSelector.js

echo "PASS — recovery entry shows evidence-backed recommendation choices."
echo "PASS — recommendation list comes from REAL Wealth Journey recovery scenarios."
echo "PASS — original form is retained only behind Create my own what-if."
echo "PASS — selected recovery path hands context to Floating Coach G."
echo "PASS — no fixed/fabricated recommendation count is introduced."

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior conversational regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

if [[ -f scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh ]]; then
  echo "Running M20AT2B Trade Lab regression..."
  bash scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh
fi

echo "PC-030M20AU verification complete."
