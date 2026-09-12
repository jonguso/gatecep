#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F5 — Preview -> Broker Plan Cost Contract Integrity"
python "$ROOT/scripts/patch_pc030m20av2f5.py" "$ROOT"
echo "PRESERVED — AV2F/AV2F2 fee evidence gate."
echo "PRESERVED — diversified recovery basket."
echo "PRESERVED — advisory/import-gated broker plan boundary."
echo "PC-030M20AV2F5 applied successfully."
