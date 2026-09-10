#!/usr/bin/env bash
set -euo pipefail

echo "PC-030M20AQ3B — Verification Correction"
[[ -f scripts/verify-pc030m20aq3-trading-ui-consolidation.sh ]] || { echo "FAIL — corrected M20AQ3 verifier missing"; exit 1; }

grep -q 'mobile/app/broker-accounts.js' scripts/verify-pc030m20aq3-trading-ui-consolidation.sh || {
  echo "FAIL — corrected verifier does not validate dedicated broker route support"; exit 1;
}

if grep -q 'assert "broker-accounts" in s' scripts/verify-pc030m20aq3-trading-ui-consolidation.sh; then
  echo "FAIL — stale Trading-file broker-accounts assertion remains"; exit 1
fi

echo "PASS — stale Trading-file broker route assertion removed."
echo "PASS — dedicated broker route preservation is now verified at architecture level."
bash scripts/verify-pc030m20aq3-trading-ui-consolidation.sh

echo "PC-030M20AQ3B verification complete."
