#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3O — Residual Screen Discovery & Wave Classification"
node scripts/audit-pc030m20av3o-residual-wave-classification.mjs
echo
echo "Audit artifacts:"
echo "  mobile/.pc030m20av3o-residual-discovery.txt"
echo "  mobile/.pc030m20av3o-residual-discovery.json"
echo
echo "PASS — AV3O discovery completed. No application files were changed."
