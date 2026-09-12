#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F5A — Broker Action Plan Gross Label Alignment"
node mobile/scripts/test-pc030m20av2f5a-label.mjs
echo "PC-030M20AV2F5A verification complete."
