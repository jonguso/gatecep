#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F5A — Broker Action Plan Gross Label Alignment"
python "$ROOT/scripts/patch_pc030m20av2f5a.py" "$ROOT"
echo "PRESERVED — AV2F5 cost contract."
echo "PRESERVED — verified fee evidence gating."
echo "PRESERVED — advisory/import-gated execution boundary."
echo "PC-030M20AV2F5A applied successfully."
