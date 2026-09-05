#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20D — FIRST ANDROID PREVIEW BUILD"
echo "============================================================"
node scripts/test-pc030m20d-android-preview-build.mjs
node scripts/check-android-preview-build.mjs
echo "PC-030M20D Android preview build verification complete."
