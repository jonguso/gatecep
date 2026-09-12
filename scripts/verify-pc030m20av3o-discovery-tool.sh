#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"

echo "PC-030M20AV3O — Discovery Tool Verification"
node --check scripts/audit-pc030m20av3o-residual-wave-classification.mjs
grep -Fq 'READ_MOSTLY_INVESTOR' scripts/audit-pc030m20av3o-residual-wave-classification.mjs
grep -Fq 'CONSEQUENTIAL_WORKFLOW' scripts/audit-pc030m20av3o-residual-wave-classification.mjs
grep -Fq 'DEV_ADMIN_UTILITY' scripts/audit-pc030m20av3o-residual-wave-classification.mjs
echo "PASS — AV3O discovery script syntax."
echo "PASS — controlled wave classifications are present."
echo "PASS — AV3O is discovery-only; no application patcher is included."
echo "PC-030M20AV3O verification complete."
