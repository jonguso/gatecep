#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20A — RELEASE BUILD FOUNDATION"
echo "============================================================"
node scripts/check-production-readiness.mjs
echo "PC-030M20A release build foundation verification complete."
