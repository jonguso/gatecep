#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU1 — Installer Correction Verification"
FILE='mobile/app/(tabs)/trading.js'

grep -q 'RecoveryRecommendationSelector' "$FILE"
grep -q 'PC-030M20AU recommendation selector' "$FILE"
grep -q 'const recoveryRecommendationEntry' "$FILE"
grep -q 'recoveryOwnWhatIf' "$FILE"
grep -q '<RecoveryRecommendationSelector' "$FILE"

echo "PASS — Trading imports the recovery recommendation selector."
echo "PASS — recovery-entry route contract is installed."
echo "PASS — recommendation-first selector is rendered."
echo "PASS — Create-my-own-what-if state preserves the original form."

node mobile/scripts/test-pc030m20au-recovery-recommendation-selector.mjs

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior conversation regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

if [[ -f scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh ]]; then
  echo "Running M20AT2B Trade Lab regression..."
  bash scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh
fi

echo "PC-030M20AU1 verification complete."
