#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F3A — Broker Fee Management Style-Anchor Hotfix"
python "$ROOT/scripts/patch_pc030m20av2f3a.py" "$ROOT"
echo "PRESERVED — AV2F3 evidence-verification contract."
echo "PRESERVED — AV2F/AV2F2 charges remain evidence-gated."
echo "PRESERVED — no hard-coded Trade fee policy promoted to broker evidence."
echo "PC-030M20AV2F3A applied successfully."
