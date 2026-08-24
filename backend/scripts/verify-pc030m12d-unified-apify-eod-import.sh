#!/usr/bin/env bash
set -euo pipefail
echo "============================================================"
echo "PC-030M12D — UNIFIED APIFY EOD IMPORT VERIFICATION"
echo "============================================================"
node scripts/test-pc030m12d-unified-apify-eod-import.mjs
grep -q 'STALE_MARKET_SNAPSHOT' src/modules/market-cache/manualMarketImport.service.js
grep -q 'latest?.payloadHash === snapshot.checksum' src/modules/market-cache/manualMarketImport.service.js
grep -q 'saveVerifiedEodSnapshot(snapshot)' src/modules/market-cache/manualMarketImport.service.js
grep -q 'LOCAL_VERIFIED_EOD' src/modules/market-cache/marketEod.repository.js
grep -q 'normalizeDatabaseMarketDate(snapshot.market_date)' src/modules/market-cache/marketEod.repository.js
echo "PASS — stale and equivalent imports cannot replace or duplicate the latest snapshot."
echo "PASS — confirmed Apify exports publish transactionally as LOCAL_VERIFIED_EOD."
echo "PASS — database dates compare in canonical YYYY-MM-DD form."
echo "PC-030M12D unified Apify EOD import verification complete."
