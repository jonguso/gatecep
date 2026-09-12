#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3A — Menu Default Collapse"
python "$ROOT/scripts/patch_pc030m20av3a.py" "$ROOT"
echo "PC-030M20AV3A applied successfully."
