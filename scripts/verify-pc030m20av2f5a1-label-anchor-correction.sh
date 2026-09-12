#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV2F5A1 — Broker Plan Label Anchor Correction"
node mobile/scripts/test-pc030m20av2f5a1-label-anchor.mjs
echo "PC-030M20AV2F5A1 verification complete."
