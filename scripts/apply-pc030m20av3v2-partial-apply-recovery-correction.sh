#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3V2 — AV3V Partial-Apply Recovery Correction"
python "$ROOT/scripts/patch_pc030m20av3v2.py"
