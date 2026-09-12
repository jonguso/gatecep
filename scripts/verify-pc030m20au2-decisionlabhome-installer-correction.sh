#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU2 — DecisionLabHome-anchored verification"

python - <<'PY'
from pathlib import Path
s = Path("mobile/app/(tabs)/trading.js").read_text(encoding="utf-8")
home = s.find("function DecisionLabHome")
state = s.find("PC-030M20AU recommendation selector", home)
helper = s.find("const recoveryRecommendationEntry", home)
selector = s.find("<RecoveryRecommendationSelector", home)
assert home >= 0, "DecisionLabHome missing"
assert state > home, "AU state is not inside DecisionLabHome"
assert helper > home, "recoveryRecommendationEntry is not inside DecisionLabHome"
assert selector > home, "selector is not inside DecisionLabHome"
print("PASS — AU state is scoped inside DecisionLabHome.")
print("PASS — recovery selector is rendered inside DecisionLabHome.")
PY

node mobile/scripts/test-pc030m20au-recovery-recommendation-selector.mjs

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior conversational regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

if [[ -f scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh ]]; then
  echo "Running M20AT2B Trade Lab regression..."
  bash scripts/verify-pc030m20at2b-existingholding-init-order-hotfix.sh
fi

echo "PC-030M20AU2 verification complete."
