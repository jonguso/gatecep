#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F5B1 — Broker Plan Cost Transparency Anchor Correction"
python "$ROOT/scripts/patch_pc030m20av2f5b1.py" "$ROOT"
echo "PC-030M20AV2F5B1 applied successfully."
