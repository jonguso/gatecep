#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M12B — BROKER SOURCE SELECTOR VERIFICATION"
echo "============================================================"

node scripts/test-pc030m12b-broker-source-selector.mjs
node --check src/features/portfolio-home/portfolioAccountCatalogService.js

grep -q 'derivePortfolioAccounts(allAccountsPortfolio)' src/features/portfolio-home/PortfolioHomeScreen.js
grep -q 'result?.availableCash' src/features/portfolio-home/PortfolioHomeScreen.js
grep -q 'COALESCE(h.broker, c.broker)' ../backend/src/modules/portfolio/portfolio.repository.js

echo "PASS — dropdown fallback and broker-scoped backend cash are active."
echo "PC-030M12B broker source selector verification complete."
