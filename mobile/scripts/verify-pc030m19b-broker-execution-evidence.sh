#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M19B — BROKER EXECUTION EVIDENCE"
echo "============================================================"
node scripts/test-pc030m19b-broker-execution-evidence.mjs
echo "PC-030M19B broker execution evidence verification complete."
