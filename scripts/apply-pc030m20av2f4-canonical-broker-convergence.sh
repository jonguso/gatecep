#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F4 — Canonical Broker Account Convergence"
python "$ROOT/scripts/patch_pc030m20av2f4.py" "$ROOT"
echo "PRESERVED — canonical accounts win when already present."
echo "PRESERVED — legacy broker profile remains for compatibility."
echo "PRESERVED — existing feeSchedule survives canonical upsert."
echo "PRESERVED — AV2F fee engine remains unchanged."
echo "PC-030M20AV2F4 applied successfully."
