#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M19F — CONNECTED BROKER HOLDINGS LOCK"
echo "============================================================"
node scripts/test-pc030m19f-connected-broker-holdings-lock.mjs
echo "PC-030M19F connected broker holdings lock verification complete."
