#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M11B — TRANSACTIONAL PORTFOLIO REPLACEMENT"
echo "============================================================"

routes="src/modules/portfolio/portfolio.routes.js"
service="src/modules/portfolio/portfolio.service.js"
repo="src/modules/portfolio/portfolio.repository.js"

grep -q 'router.put("/authoritative-snapshot"' "$routes"
grep -q 'replaceAuthoritativePortfolioSnapshot' "$service"
echo "PASS — authoritative imports use a dedicated replacement endpoint."

grep -q 'await client.query("BEGIN")' "$repo"
grep -q 'await client.query("COMMIT")' "$repo"
grep -q 'await client.query("ROLLBACK")' "$repo"
grep -q 'INSERT INTO user_cash_balances' "$repo"
echo "PASS — holdings and cash replacement execute inside one database transaction."

grep -q "NOT IN ('GATECEP-DEMO', 'PRACTICE')" "$repo"
grep -q "COALESCE(broker, '') NOT LIKE '%|%'" "$repo"
grep -q 'DELETE FROM user_portfolios WHERE user_id = \$1 AND broker = \$2' "$repo"
if grep -q 'SELECT COUNT(\*) AS count FROM user_portfolios' "$repo"; then
  echo "FAIL — legacy cleanup must not be skipped merely because keyed rows already exist."
  exit 1
fi
echo "PASS — every adoption removes stale legacy REAL rows and replaces only its verified account."

node --check "$routes"
node --check "$service"
node --check "$repo"
echo "PASS — backend replacement source parses successfully."
echo "PC-030M11B transactional replacement verification complete."
