#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AV3W — Active Route Usage & Legacy Candidate Audit"
node scripts/audit-pc030m20av3w-active-route-usage.mjs
