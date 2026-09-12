#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "PC-030M20AV2C — Recovery Basket -> Broker Action Plan Bridge"
python "$ROOT/scripts/patch_pc030m20av2c.py" "$ROOT"
echo "PRESERVED — existing BROKER_PLAN review screen."
echo "PRESERVED — canonical brokerActionPlanStore."
echo "PRESERVED — advisory/import-gated execution boundary."
echo "PC-030M20AV2C applied successfully."
