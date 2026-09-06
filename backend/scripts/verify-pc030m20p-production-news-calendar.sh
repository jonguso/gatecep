#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20P — PRODUCTION NEWS + CALENDAR"
echo "============================================================"
node scripts/test-pc030m20p-production-news-calendar.mjs
node --check src/database/migrate.js
node --check src/modules/verified-news/verifiedNews.scheduler.js
node --check src/modules/verified-news/verifiedNews.routes.js
echo "PC-030M20P production News and Calendar verification complete."

