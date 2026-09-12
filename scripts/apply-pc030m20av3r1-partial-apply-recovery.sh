#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3R1 — AV3R Partial-Apply Recovery"
python "$ROOT/scripts/patch_pc030m20av3r1.py"
