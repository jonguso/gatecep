#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20F1 — WEALTH JOURNEY COACH DEDUPLICATION"
echo "============================================================"

node scripts/check-pc030m20f1-journey-coach-dedup.mjs
bash scripts/verify-pc030m20f-production-mobile-acceptance.sh

echo "PC-030M20F1 wealth journey Coach G deduplication complete."
