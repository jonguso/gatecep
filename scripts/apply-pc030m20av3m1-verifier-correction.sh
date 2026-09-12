#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AV3M1 — AV3M Verifier Route-Formatting Correction"
cp "$ROOT/mobile/scripts/test-pc030m20av3m-responsive-calibration.mjs"    "$ROOT/mobile/scripts/test-pc030m20av3m-responsive-calibration.mjs.pc030m20av3m1.bak"
cp "$ROOT/mobile/scripts/test-pc030m20av3m-responsive-calibration.mjs.pc030m20av3m1.new"    "$ROOT/mobile/scripts/test-pc030m20av3m-responsive-calibration.mjs"
echo "UPDATED — AV3M verifier now accepts equivalent multiline router.push/router.replace formatting."
echo "PRESERVED — no application source files are modified by AV3M1."
echo "PC-030M20AV3M1 applied successfully."
