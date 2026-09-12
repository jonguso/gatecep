#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3H — Multi-Period Filing Responsive Calibration"
python "$ROOT/scripts/patch_pc030m20av3h.py" "$ROOT"
