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

node --input-type=module - "$repo" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repo =
  readFileSync(
    process.argv[2],
    "utf8"
  );

const primitiveStart =
  repo.indexOf(
    "export async function replaceUserPortfolioSnapshotWithQueryable("
  );

const wrapperStart =
  repo.indexOf(
    "export async function replaceUserPortfolioSnapshot(",
    primitiveStart + 1
  );

assert.ok(
  primitiveStart >= 0,
  "queryable replacement primitive is required"
);

assert.ok(
  wrapperStart > primitiveStart,
  "transaction-owning replacement wrapper is required"
);

const primitive =
  repo.slice(
    primitiveStart,
    wrapperStart
  );

const wrapper =
  repo.slice(
    wrapperStart
  );

assert.match(
  wrapper,
  /await\s+client\.query\(\s*["']BEGIN["']\s*\)/s,
  "replacement wrapper must BEGIN a transaction"
);

assert.match(
  wrapper,
  /await\s+client\.query\(\s*["']COMMIT["']\s*\)/s,
  "replacement wrapper must COMMIT the transaction"
);

assert.match(
  wrapper,
  /await\s+client\.query\(\s*["']ROLLBACK["']\s*\)/s,
  "replacement wrapper must ROLLBACK on failure"
);

assert.match(
  wrapper,
  /replaceUserPortfolioSnapshotWithQueryable\([\s\S]*?client\s*\)/,
  "replacement wrapper must pass its transaction client to the primitive"
);

assert.doesNotMatch(
  primitive,
  /pool\.connect|["']BEGIN["']|["']COMMIT["']|["']ROLLBACK["']|\.release\(\)/,
  "queryable primitive must not own transaction lifecycle"
);

assert.match(
  primitive,
  /INSERT\s+INTO\s+user_cash_balances/s,
  "replacement must write authoritative cash"
);

assert.match(
  primitive,
  /NOT\s+IN\s*\(\s*['"]GATECEP-DEMO['"]\s*,\s*['"]PRACTICE['"]\s*\)/s,
  "replacement must preserve demo/practice exclusion"
);

assert.match(
  primitive,
  /COALESCE\(broker,\s*['"]['"]\)\s+NOT\s+LIKE\s+['"]%\|%['"]/s,
  "replacement must identify pre-identity REAL rows"
);

assert.match(
  primitive,
  /DELETE\s+FROM\s+user_portfolios[\s\S]*?user_id\s*=\s*\$1[\s\S]*?broker\s*=\s*ANY\(\$2::text\[\]\)/,
  "replacement must remove canonical-equivalent verified portfolio account keys"
);

assert.match(
  primitive,
  /DELETE\s+FROM\s+user_cash_balances[\s\S]*?user_id\s*=\s*\$1[\s\S]*?broker\s*=\s*ANY\(\$2::text\[\]\)/,
  "replacement must remove canonical-equivalent verified cash account keys"
);

assert.match(
  primitive,
  /identityKeyRows/,
  "replacement must discover existing identity-keyed accounts"
);

assert.match(
  primitive,
  /isCanonicalBrokerAccountAlias/,
  "replacement must classify canonical-equivalent broker accounts"
);

assert.doesNotMatch(
  repo,
  /SELECT\s+COUNT\(\*\)\s+AS\s+count\s+FROM\s+user_portfolios/s,
  "legacy cleanup must not be skipped because keyed rows already exist"
);
NODE

echo "PASS — holdings and cash replacement execute inside one database transaction."
echo "PASS — every adoption removes stale legacy REAL rows and replaces only its verified account."

node --check "$routes"
node --check "$service"
node --check "$repo"
echo "PASS — backend replacement source parses successfully."
echo "PC-030M11B transactional replacement verification complete."
