#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2E — Diversified Recovery Portfolio Preview"
python "$ROOT/scripts/patch_pc030m20av2e.py" "$ROOT"
echo "PRESERVED — AV2 diversified allocation logic."
echo "PRESERVED — canonical REAL metrics baseline."
echo "PRESERVED — Broker Action Plan and import-gated execution boundary."
echo "PC-030M20AV2E applied successfully."
