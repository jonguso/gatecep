#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M14B — COACH G VOICE BACKEND"
echo "============================================================"
node --check src/modules/coach/coach.routes.js
node scripts/test-pc030m14b-coach-g-voice.mjs
echo "PC-030M14B backend voice verification complete."
