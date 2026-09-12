#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "PC-030M20AV2D — Broker Plan Completion Path"
python "$ROOT/scripts/patch_pc030m20av2d.py" "$ROOT"

echo "PRESERVED — Share Broker Action Report."
echo "PRESERVED — Broker Action Plan stays REVIEW/advisory-only."
echo "PRESERVED — no execution, fill, cash, holdings, goal or DNA mutation."
echo "PC-030M20AV2D applied successfully."
