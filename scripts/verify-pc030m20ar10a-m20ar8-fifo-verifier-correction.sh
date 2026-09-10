#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AR10A — M20AR8 FIFO Boundary Verifier Correction"

grep -q "M20AR10A_ARCHITECTURE_AWARE_FIFO_CHECK" scripts/verify-pc030m20ar8-projected-impact.sh
echo "PASS — M20AR8 verifier uses architecture-aware FIFO boundary validation."

bash scripts/verify-pc030m20ar8-projected-impact.sh

if [[ -f scripts/verify-pc030m20ar10-projected-impact-interpretation.sh ]]; then
  echo "Re-running M20AR10 regression..."
  bash scripts/verify-pc030m20ar10-projected-impact-interpretation.sh
fi

echo "PC-030M20AR10A verification complete."
