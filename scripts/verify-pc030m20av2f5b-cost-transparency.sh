#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../mobile"
echo "PC-030M20AV2F5B — Broker Plan Verified Cost Transparency"
node scripts/test-pc030m20av2f5b-cost-transparency.mjs
