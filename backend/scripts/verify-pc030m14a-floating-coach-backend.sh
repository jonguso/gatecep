#!/usr/bin/env bash
set -euo pipefail
echo "============================================================"
echo "PC-030M14A — FLOATING COACH G BACKEND"
echo "============================================================"
node --check src/modules/coach/coach.routes.js
node scripts/test-pc030m14a-floating-coach-backend.mjs
echo "PC-030M14A backend verification complete."
