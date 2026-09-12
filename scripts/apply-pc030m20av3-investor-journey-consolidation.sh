#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3 — Investor Journey Consolidation"
python "$ROOT/scripts/patch_pc030m20av3.py" "$ROOT"
echo "PC-030M20AV3 applied successfully."
