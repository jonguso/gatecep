#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M15A — VERIFIED APIFY NEWS BACKEND"
echo "============================================================"
node --check src/modules/verified-news/verifiedNews.normalizer.js
node --check src/modules/verified-news/newsQueryPolicy.js
node --check src/modules/verified-news/apifyNews.adapter.js
node --check src/modules/verified-news/verifiedNews.collector.js
node --check src/modules/verified-news/verifiedNews.repository.js
node --check src/modules/verified-news/verifiedNews.routes.js
node --check src/modules/verified-news/verifiedNews.scheduler.js
node --check src/server.js
node scripts/test-pc030m15a-verified-apify-news.mjs
echo "PC-030M15A backend verification complete."
