#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M10G — COMPLETE NSE SECURITY MASTER VERIFICATION"
echo "============================================================"

node scripts/test-pc030m10g-complete-nse-security-master.mjs
node --check src/data/nseSecurityMaster.js
bash scripts/verify-pc030m10f-local-verified-eod.sh

echo "PC-030M10G complete NSE security master verification complete."
