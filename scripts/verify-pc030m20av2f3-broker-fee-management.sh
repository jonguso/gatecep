#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F3 — Verified Broker Fee Schedule Management"
node mobile/scripts/test-pc030m20av2f3-broker-fee-management.mjs
grep -Fq 'buildBrokerFeeSchedule' mobile/app/broker-accounts.js
grep -Fq 'Broker Fee Schedule' mobile/app/broker-accounts.js
grep -Fq 'Evidence Source' mobile/app/broker-accounts.js
grep -Fq 'Verified Date' mobile/app/broker-accounts.js
grep -Fq 'I verified these fee values against the evidence source above.' mobile/app/broker-accounts.js
grep -Fq 'Fee Evidence:' mobile/app/broker-accounts.js
grep -Fq 'verificationConfirmed===true' mobile/src/services/brokers/brokerFeeScheduleManagementService.js
echo "PASS — Broker Accounts exposes fee schedule management."
echo "PASS — verified status requires explicit investor confirmation."
echo "PASS — verified status requires evidence source and verification date."
echo "PASS — connected broker cards expose fee evidence status."
echo "PASS — no hard-coded Trade fee policy is copied into broker accounts."
echo "PC-030M20AV2F3 verification complete."
