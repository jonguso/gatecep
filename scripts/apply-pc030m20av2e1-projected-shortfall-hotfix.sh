#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "PC-030M20AV2E1 — Projected Shortfall Handoff Hotfix"
python "$ROOT/scripts/patch_pc030m20av2e1.py" "$ROOT"

echo "PRESERVED — AV2 allocation logic."
echo "PRESERVED — projected portfolio preview."
echo "PRESERVED — Broker Action Plan/import-gated boundary."
echo "PC-030M20AV2E1 applied successfully."
