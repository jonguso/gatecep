#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3B — Responsive Screen Calibration"
python "$ROOT/scripts/patch_pc030m20av3b.py" "$ROOT"
echo "PC-030M20AV3B applied successfully."
