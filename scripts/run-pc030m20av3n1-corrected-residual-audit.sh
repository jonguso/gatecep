#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3N1 — Corrected Post-AV3 Residual Responsive Audit"
node scripts/audit-pc030m20av3n-responsive-residuals.mjs
echo
echo "Audit artifacts:"
echo "  mobile/.pc030m20av3n1-residual-audit.txt"
echo "  mobile/.pc030m20av3n1-residual-audit.json"
echo
echo "PASS — corrected residual classification audit completed."
