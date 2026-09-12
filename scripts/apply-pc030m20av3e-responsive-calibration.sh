#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3E — Portfolio Analysis & Risk Responsive Calibration"
python "$ROOT/scripts/patch_pc030m20av3e.py" "$ROOT"
echo "PC-030M20AV3E applied successfully."
