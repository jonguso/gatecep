#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F — Charges-Aware Diversified Basket Simulation"
python "$ROOT/scripts/patch_pc030m20av2f.py" "$ROOT"
echo "PRESERVED — recovery amount is the maximum scenario funding."
echo "PRESERVED — only verified broker fee schedules may create charge estimates."
echo "PRESERVED — no REAL/Practice/broker execution mutation."
echo "PC-030M20AV2F applied successfully."
