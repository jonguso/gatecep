#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3AA — Import Portfolio Responsive Calibration"
python "$ROOT/scripts/patch_pc030m20av3aa.py"
