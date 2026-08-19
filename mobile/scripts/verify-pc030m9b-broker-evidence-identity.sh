#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M9B — BROKER EVIDENCE IDENTITY VERIFICATION"
echo "============================================================"

node scripts/test-pc030m9b-broker-evidence-identity.cjs

grep -q 'Broker account identity' app/import-portfolio.js
grep -q 'User CDS Number' app/import-portfolio.js
grep -q 'VERIFIED_BROKER_FILENAME' app/import-portfolio.js
grep -q 'cloudBrokerProfile' src/features/broker-sync/brokerEvidenceIdentityService.js
grep -q 'Broker Client Account' app/import-portfolio.js
grep -q 'accountIdentity: fileInfo?.accountIdentity' app/review-portfolio-import.js
grep -q 'Cash evidence must match the valuation CDS' src/features/broker-sync/brokerSyncService.js
grep -q 'expectedAccountKey: mirror.brokerAccountKey' 'app/(tabs)/funds.js'

node - <<'NODE'
const fs = require('fs');
const babel = require('@babel/core');
[
  'app/import-portfolio.js',
  'app/review-portfolio-import.js',
  'app/(tabs)/funds.js',
  'src/features/broker-sync/brokerEvidenceIdentityService.js',
  'src/features/broker-sync/brokerSyncService.js'
].forEach((file) => babel.parseSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  babelrc: false,
  configFile: false,
  sourceType: 'module', parserOpts: { plugins: ['jsx'] }
}));
NODE

echo "PASS — valuation upload requires CDS, broker, and client-account identity."
echo "PASS — compatible profile stores preload CDS and a first filename match can establish it."
echo "PASS — cash evidence must match the verified valuation account."
echo "PASS — identity-gated source parses successfully."
echo "PC-030M9B broker evidence identity verification complete."
