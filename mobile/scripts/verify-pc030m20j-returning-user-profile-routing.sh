#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M20J — RETURNING USER PROFILE ROUTING"
echo "============================================================"
node scripts/test-pc030m20j-returning-user-profile-routing.mjs
echo "PC-030M20J returning-user profile routing verification complete."
