#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "PC-030M20AV2F5B — Broker Plan Verified Cost Transparency"
python scripts/patch_pc030m20av2f5b.py
echo "PC-030M20AV2F5B applied successfully."
