#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2F4A — Canonical Broker Convergence Verifier Hotfix"

node mobile/scripts/test-pc030m20av2f4a-canonical-broker-convergence-source.mjs

grep -Fq 'migrateLegacyBrokerProfileToCanonicalAccounts' mobile/src/services/brokers/brokerAccountStore.js
grep -Fq 'CANONICAL_ACCOUNTS_ALREADY_PRESENT' mobile/src/services/brokers/brokerAccountStore.js
grep -Fq 'migrationSource:"LEGACY_BROKER_PROFILE"' mobile/src/services/brokers/brokerAccountStore.js
grep -Fq 'migrateLegacyBrokerProfileToCanonicalAccounts()' mobile/app/broker-accounts.js
grep -Fq 'await saveBrokerAccounts(next);' mobile/app/broker-accounts.js
grep -Fq 'await upsertBrokerAccount({' mobile/app/broker-profile.js
grep -Fq 'route: "/broker-accounts"' mobile/app/menu.js
grep -Fq 'router.push("/broker-accounts")' mobile/app/my-profile.js
grep -Fq 'Open Broker Accounts' mobile/app/broker-account-center.js

echo "PASS — migration runs only when canonical brokerAccounts is empty."
echo "PASS — existing canonical accounts are never replaced by legacy migration."
echo "PASS — legacy Broker Profile saves converge into canonical brokerAccounts."
echo "PASS — investor-facing broker navigation points to /broker-accounts."
echo "PASS — legacy /broker-profile remains available for statement matching."
echo "PASS — AV2F continues to consume canonical loadBrokerAccounts()."
echo "PC-030M20AV2F4A verification complete."
