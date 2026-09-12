#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV3B1 — Responsive Calibration Partial-Apply Recovery"
node scripts/test-pc030m20av3b1-responsive-recovery.mjs
