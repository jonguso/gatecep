#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20D1 — ANDROID PREVIEW CHANNEL FIX"
echo "============================================================"
node scripts/test-pc030m20d-android-preview-build.mjs
node scripts/check-android-preview-build.mjs
echo "PC-030M20D1 Android preview channel fix verification complete."
