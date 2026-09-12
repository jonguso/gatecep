#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV3W — Audit Package Verification"
node --check scripts/audit-pc030m20av3w-active-route-usage.mjs
test -f scripts/run-pc030m20av3w-active-route-usage-audit.sh
if grep -Eq 'writeFileSync\(.*app/' scripts/audit-pc030m20av3w-active-route-usage.mjs; then
  echo "FAIL — audit appears to write into app source."
  exit 1
fi
echo "PASS — audit syntax valid."
echo "PASS — discovery-only package; no application patcher included."
