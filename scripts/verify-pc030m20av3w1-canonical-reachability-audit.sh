#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV3W1 — Audit Package Verification"
node --check scripts/audit-pc030m20av3w1-canonical-reachability.mjs
test -f scripts/run-pc030m20av3w1-canonical-reachability-audit.sh
if find scripts -maxdepth 1 -type f -name '*patch*av3w1*' | grep -q .; then
  echo "FAIL — patcher found in discovery-only package."
  exit 1
fi
echo "PASS — audit syntax valid."
echo "PASS — discovery-only package; no application patcher included."
