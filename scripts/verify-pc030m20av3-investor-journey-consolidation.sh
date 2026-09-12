#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV3 — Investor Journey Consolidation"
node scripts/test-pc030m20av3-investor-journey-consolidation.mjs
