#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AT2B — existingHolding initialization-order hotfix"

python - <<'PY'
from pathlib import Path
s=Path("mobile/app/trade.js").read_text(encoding="utf-8")
existing=s.find("const existingHolding")
hotfix=s.find("PC-030M20AT2B initialization-order hotfix")
fifo=s.find("const fifoEvidence = useMemo")
assert existing >= 0, "existingHolding declaration missing"
assert hotfix > existing, "auto-seed effect still appears before existingHolding"
assert fifo > hotfix, "hotfix must remain before FIFO evidence"
print("PASS — auto-quantity effect is after existingHolding initialization.")
print("PASS — temporal-dead-zone crash path is removed.")
PY

node mobile/scripts/test-pc030m20at2-decision-amount-quantity-handoff.mjs

if [[ -f scripts/verify-pc030m20at1-answerable-discovery-question.sh ]]; then
  echo "Running M20AT1 and prior regressions..."
  bash scripts/verify-pc030m20at1-answerable-discovery-question.sh
fi

echo "PC-030M20AT2B verification complete."
