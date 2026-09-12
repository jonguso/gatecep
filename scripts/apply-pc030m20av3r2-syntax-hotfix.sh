#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3R2 — Investor Alert Review Syntax Hotfix"
python "$ROOT/scripts/patch_pc030m20av3r2.py"
