#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "PC-030M20AV2E2 — Projection Context Continuity"
python "$ROOT/scripts/patch_pc030m20av2e2.py" "$ROOT"

echo "PRESERVED — canonical projected shortfall from Goal Scenario Planner."
echo "PRESERVED — canonical projected value from Goal Scenario Planner."
echo "PRESERVED — AV2E portfolio projection calculations and Broker Action Plan boundary."
echo "PC-030M20AV2E2 applied successfully."
