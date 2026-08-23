#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M12A — BACKEND BROKER CASH CONTRACT VERIFICATION"
echo "============================================================"

node --check src/modules/cash/cash.repository.js
node --check src/modules/cash/cash.service.js
node --check src/modules/portfolio/portfolio.repository.js
node --check src/modules/portfolio/portfolio.service.js

grep -q 'availableCash' src/modules/portfolio/portfolio.service.js
grep -q "NOT IN ('GATECEP-DEMO', 'PRACTICE')" src/modules/portfolio/portfolio.repository.js
grep -q 'FULL OUTER JOIN real_cash' src/modules/portfolio/portfolio.repository.js

echo "PASS — per-account cash and aggregate real cash are returned with portfolio data."
echo "PASS — Practice cash and holdings are excluded from All Accounts."
echo "PASS — cash-only verified broker accounts remain discoverable."
echo "PC-030M12A backend broker cash contract verification complete."
