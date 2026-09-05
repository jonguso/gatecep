#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20B — PRODUCTION BRAND ASSETS"
echo "============================================================"
node scripts/check-production-readiness.mjs
echo "PC-030M20B production brand asset verification complete."
