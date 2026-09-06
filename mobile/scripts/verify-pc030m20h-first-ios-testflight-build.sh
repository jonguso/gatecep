#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20H — FIRST IOS PREVIEW + TESTFLIGHT BUILD"
echo "============================================================"
node scripts/check-ios-testflight-build.mjs
node scripts/check-android-preview-build.mjs
echo "PC-030M20H iOS preview and TestFlight build verification complete."
