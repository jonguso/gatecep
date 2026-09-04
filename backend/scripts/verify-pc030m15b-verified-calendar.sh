#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M15B — VERIFIED CALENDAR BACKEND"
echo "============================================================"
node --check src/modules/verified-news/verifiedCalendar.extractor.js
node --check src/modules/verified-news/verifiedNews.collector.js
node --check src/modules/verified-news/verifiedNews.repository.js
node --check src/modules/verified-news/verifiedNews.routes.js
node scripts/test-pc030m15b-verified-calendar.mjs
echo "PC-030M15B backend verification complete."
