#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV2F5B1 — Broker Plan Cost Transparency Anchor Correction"
node scripts/test-pc030m20av2f5b1-cost-transparency.mjs
