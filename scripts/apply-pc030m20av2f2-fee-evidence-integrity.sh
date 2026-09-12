#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F2 — Fee Evidence + Residual Funding Integrity"
python "$ROOT/scripts/patch_pc030m20av2f2.py" "$ROOT"
echo "PRESERVED — existing AV2F fee calculation engine."
echo "PRESERVED — fee estimates require verified broker fee schedules."
echo "PRESERVED — no hard-coded Trade screen fee policy is promoted to broker evidence."
echo "PRESERVED — no REAL/Practice/broker execution mutation."
echo "PC-030M20AV2F2 applied successfully."
