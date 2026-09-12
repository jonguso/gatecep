#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3N — Post-AV3 Residual Responsive Audit"
set +e
node scripts/audit-pc030m20av3n-responsive-residuals.mjs
STATUS=$?
set -e

echo
echo "Audit artifacts:"
echo "  mobile/.pc030m20av3n-residual-audit.txt"
echo "  mobile/.pc030m20av3n-residual-audit.json"

if [ "$STATUS" -eq 0 ]; then
  echo
  echo "PASS — AV3N found no residual investor-facing responsive candidates."
  exit 0
elif [ "$STATUS" -eq 2 ]; then
  echo
  echo "REVIEW — AV3N found residual candidate screens. No application files were changed."
  exit 0
else
  exit "$STATUS"
fi
