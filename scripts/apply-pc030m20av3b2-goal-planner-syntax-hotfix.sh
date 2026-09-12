#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3B2 — Goal Scenario Planner Syntax Hotfix"
python "$ROOT/scripts/patch_pc030m20av3b2.py" "$ROOT"
echo "PC-030M20AV3B2 applied successfully."
