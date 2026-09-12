#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3C — Recovery & Wealth Journey Responsive Calibration"
python "$ROOT/scripts/patch_pc030m20av3c.py" "$ROOT"
echo "PC-030M20AV3C applied successfully."
