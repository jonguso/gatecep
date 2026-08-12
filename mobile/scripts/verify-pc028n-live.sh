#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== DASHBOARD LIVE SOURCE ====="
grep -n   "selectedPortfolioAccount\|portfolioAccounts\|selectPortfolioAccount\|PORTFOLIO VIEW\|Practice Net Worth\|ALL ACCOUNTS"   app/'(tabs)'/dashboard.js

echo
echo "===== PORTFOLIO HUB LIVE SOURCE ====="
grep -n   "sourceAccounts\|Practice Portfolio\|realHoldings\|setSelectedAccount(practiceAccount)"   app/portfolio-hub.js

echo
echo "===== SYNTAX CHECK ====="
node --check app/'(tabs)'/dashboard.js
node --check app/portfolio-hub.js

echo
echo "PC-028N LIVE verification complete."
