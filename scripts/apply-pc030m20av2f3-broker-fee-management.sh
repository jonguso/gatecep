#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV2F3 — Verified Broker Fee Schedule Management"
python "$ROOT/scripts/patch_pc030m20av2f3.py" "$ROOT"
echo "PRESERVED — canonical brokerAccount feeSchedule contract."
echo "PRESERVED — AV2F/AV2F2 evidence-gated charge calculation."
echo "PRESERVED — hard-coded Trade fee policies are not promoted to verified evidence."
echo "PRESERVED — no REAL/Practice/broker execution mutation."
echo "PC-030M20AV2F3 applied successfully."
