#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3G — Fundamental Operations & Filing Workflow Responsive Calibration"
python "$ROOT/scripts/patch_pc030m20av3g.py" "$ROOT"
echo "PC-030M20AV3G applied successfully."
