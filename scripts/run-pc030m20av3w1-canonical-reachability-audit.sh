#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AV3W1 — Canonical Reachability & Legacy-Chain Audit"
node scripts/audit-pc030m20av3w1-canonical-reachability.mjs
