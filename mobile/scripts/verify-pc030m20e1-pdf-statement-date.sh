#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20E1 — PDF STATEMENT EFFECTIVE DATE"
echo "============================================================"

node scripts/test-pc030m20e1-pdf-statement-date.mjs
bash scripts/verify-pc030m20e-mobile-broker-pdf.sh

echo "PC-030M20E1 PDF statement effective-date verification complete."
