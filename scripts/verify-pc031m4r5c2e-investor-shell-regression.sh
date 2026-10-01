#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/mobile"

echo "===== PC-031M4R5C2E INVESTOR SHELL REGRESSION ====="

node scripts/test-pc031m4r5c2e-investor-shell-regression.mjs

echo
echo "===== ANDROID EXPORT BUILD GATE ====="

rm -rf /tmp/gatecep-r5c2e-export

npx expo export \
  --platform android \
  --output-dir /tmp/gatecep-r5c2e-export

echo
echo "===== PC-031M4R5C2E COMPLETE ====="
