#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3J — Core Tabs Responsive Residual Calibration"
python "$ROOT/scripts/patch_pc030m20av3j.py" "$ROOT"
