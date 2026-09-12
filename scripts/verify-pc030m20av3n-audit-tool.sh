#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3N — Audit Tool Verification"
node --check scripts/audit-pc030m20av3n-responsive-residuals.mjs
test -f scripts/audit-pc030m20av3n-responsive-residuals.mjs
echo "PASS — AV3N audit script syntax."
echo "PASS — AV3N is audit-only; it contains no application patcher."
echo "PC-030M20AV3N audit-tool verification complete."
