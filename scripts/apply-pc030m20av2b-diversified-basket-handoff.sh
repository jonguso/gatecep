#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/mobile/app/goal-recovery-allocation.js"

echo "PC-030M20AV2B — Diversified Basket Handoff + Scenario Funding"
[[ -f "$TARGET" ]] || { echo "ERROR — goal-recovery-allocation.js missing"; exit 1; }

python "$ROOT/scripts/patch_pc030m20av2b.py" "$TARGET"

echo "PRESERVED — AV2 allocation quality and concentration guards."
echo "PRESERVED — external broker execution/import boundary."
echo "PC-030M20AV2B applied successfully."
