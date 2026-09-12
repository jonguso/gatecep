#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3E1 — Partial-Apply Recovery"
python "$ROOT/scripts/patch_pc030m20av3e1.py" "$ROOT"
echo "PC-030M20AV3E1 recovery applied successfully."
