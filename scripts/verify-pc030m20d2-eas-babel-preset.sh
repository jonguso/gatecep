#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20D2 — EAS ANDROID BABEL PRESET FIX"
echo "============================================================"

node scripts/check-android-babel-build.mjs
node scripts/check-android-preview-build.mjs

echo "PASS — Android preview bundling no longer depends on a transitive Babel preset."
echo "PC-030M20D2 EAS Android Babel preset verification complete."
