#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M15A — VERIFIED APIFY NEWS MOBILE"
echo "============================================================"
node --check src/services/news/verifiedNewsApi.js
node scripts/test-pc030m15a-verified-apify-news.mjs
echo "PC-030M15A mobile verification complete."
