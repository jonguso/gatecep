#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AV3B — Responsive Screen Calibration"
node scripts/test-pc030m20av3b-responsive-calibration.mjs
