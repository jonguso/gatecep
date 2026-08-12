#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../../.." 2>/dev/null || cd ~/gatecep/mobile

echo "===== PC-028N DASHBOARD CANDIDATES ====="

grep -Rnil \
  "Net Worth\|Goal Progress\|Portfolio Value\|Wealth Journey\|Coach G" \
  app \
  --include="*.js" \
  --include="*.jsx" \
  | grep -v \
  "PC-028" \
  | head -n 80

echo
echo "Look for the screen matching the main Dashboard screenshot."
