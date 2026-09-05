#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20F — PRODUCTION MOBILE ACCEPTANCE"
echo "============================================================"

node scripts/check-production-mobile-acceptance.mjs
node scripts/check-production-readiness.mjs
node scripts/check-android-preview-build.mjs
node scripts/test-pc030m20e1-pdf-statement-date.mjs

echo "PC-030M20F production mobile acceptance verification complete."
