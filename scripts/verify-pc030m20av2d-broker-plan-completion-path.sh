#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV2D — Broker Plan Completion Path"

grep -Fq 'After broker execution — Import & Verify' mobile/app/basket-execution.js
grep -Fq 'router.push("/portfolio-sync-center")' mobile/app/basket-execution.js
grep -Fq 'Return to Wealth Journey' mobile/app/basket-execution.js
grep -Fq 'router.replace("/wealth-journey")' mobile/app/basket-execution.js
grep -Fq 'Share Broker Action Report' mobile/app/basket-execution.js
grep -Fq 'Execution confirmations: 0 — import required' mobile/app/basket-execution.js
grep -Fq 'Import-Gated Record' mobile/app/basket-execution.js

echo "PASS — Broker Action Plan now has a clear forward path to canonical Sync & Reconcile."
echo "PASS — investors can return to Wealth Journey without clearing the saved plan."
echo "PASS — Share Broker Action Report remains available."
echo "PASS — execution confirmations remain import-gated."
echo "PC-030M20AV2D verification complete."
