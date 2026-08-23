#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M12A — BROKER CASH + FEE ADVICE VERIFICATION"
echo "============================================================"

node scripts/test-pc030m12a-broker-cash-fee-advice.mjs
node --check src/services/portfolio/unifiedPortfolioApi.js
node --check src/features/wealth-journey/canonicalRealWealthContextService.js
node --check src/services/brokers/brokerFeeAdviceService.js

grep -q 'cashBalances' src/services/portfolio/unifiedPortfolioApi.js
grep -q 'Verified broker fee schedules are unavailable' src/services/brokers/brokerFeeAdviceService.js

echo "PASS — mobile cash and broker-fee source parses successfully."
echo "PC-030M12A broker cash + fee advice verification complete."
