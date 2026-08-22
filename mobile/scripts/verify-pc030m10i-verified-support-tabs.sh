#!/usr/bin/env bash
set -euo pipefail
echo "============================================================"
echo "PC-030M10I — VERIFIED SUPPORT TAB ALIGNMENT"
echo "============================================================"
node scripts/test-pc030m10i-verified-support-tabs.mjs
node - <<'NODE'
const fs=require('fs');const parser=require('@babel/parser');
for(const file of ['app/(tabs)/trading.js','app/(tabs)/calendar.js','app/(tabs)/news.js','src/services/trade/tradingHubStore.js','src/services/calendar/calendarHubData.js','src/services/news/newsHubData.js']) parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});
console.log('PASS — aligned support-tab source parses successfully.');
NODE
echo "PC-030M10I verified support tab alignment complete."
