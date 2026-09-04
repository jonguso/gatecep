#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M15B — VERIFIED CALENDAR MOBILE"
echo "============================================================"
node --check src/services/calendar/verifiedCalendarApi.js
node scripts/test-pc030m15b-verified-calendar.mjs
echo "PC-030M15B mobile verification complete."
