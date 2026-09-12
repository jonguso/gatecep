#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3P1 — AV3P Partial-Apply Recovery"
python "$ROOT/scripts/patch_pc030m20av3p1.py"
