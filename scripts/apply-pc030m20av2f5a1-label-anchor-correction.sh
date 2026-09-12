#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F5A1 — Broker Plan Label Anchor Correction"
python "$ROOT/scripts/patch_pc030m20av2f5a1.py" "$ROOT"
echo "PRESERVED — AV2F5 cost contract."
echo "PRESERVED — Practice basket Active Value wording."
echo "PRESERVED — advisory/import-gated broker plan boundary."
echo "PC-030M20AV2F5A1 applied successfully."
