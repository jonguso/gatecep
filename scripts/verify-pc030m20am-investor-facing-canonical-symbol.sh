#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" || ! -d "$ROOT/backend" ]]; then
  echo "ERROR — run this from the GateCEP project root."
  exit 1
fi

python - <<'PY'
from pathlib import Path
import re, sys
root = Path.cwd()

must_have = {
    "mobile/app/(tabs)/markets.js": '"EQT"',
    "mobile/app/first-trade.js": 'symbol: "EQT"',
    "mobile/app/watchlist.js": '"EQT"',
    "mobile/src/features/broker-sync/brokerSyncService.js": '"EQT"',
    "mobile/src/features/fundamentals/seeds/nseFundamentalSeed.js": '"EQT"',
    "mobile/src/features/practice/PracticePortfolio.jsx": 'symbol: "EQT"',
    "mobile/src/services/dashboard/dashboardHomeData.js": 'mostActive: "EQT"',
    "mobile/src/services/trade/marketDepthData.js": 'EQT:',
    "mobile/src/utils/demoMarketEngine.js": 'EQT:',
    "backend/src/modules/dividends/dividend.service.js": 'EQT:',
}

for rel, token in must_have.items():
    p = root / rel
    if not p.exists() or token not in p.read_text(encoding="utf-8"):
        raise SystemExit(f"FAIL — expected canonical EQT in {rel}")
print("PASS — investor-facing/internal Equity references use canonical EQT.")

# Alias/provider boundaries must remain capable of accepting/translating EQTY.
allowed_checks = {
    "mobile/src/features/trading/securityIdentityService.js": "EQTY",
    "mobile/src/services/markets/canonicalNseQuoteService.js": 'EQT: "EQTY"',
    "backend/src/data/nseSecurityMaster.js": 'aliases: ["EQTY"]',
    "backend/src/modules/market-cache/marketCache.service.js": 'EQT: "EQTY"',
    "backend/src/services/marketData/MyStocksCsvNormalizer.js": 'EQT: "EQTY"',
}
for rel, token in allowed_checks.items():
    p = root / rel
    if not p.exists() or token not in p.read_text(encoding="utf-8"):
        raise SystemExit(f"FAIL — external alias/provider compatibility missing in {rel}")
print("PASS — EQTY remains accepted only at canonical alias/provider boundaries.")

# No known investor-facing/default target may still carry EQTY.
consumer_files = [root / rel for rel in must_have]
leaks=[]
for p in consumer_files:
    txt=p.read_text(encoding='utf-8')
    if re.search(r'\bEQTY\b', txt):
        leaks.append(str(p.relative_to(root)))
if leaks:
    raise SystemExit("FAIL — investor-facing EQTY leakage remains in: " + ", ".join(leaks))
print("PASS — no EQTY leakage remains in the targeted investor-facing/default consumers.")

# Guard canonical alias identity.
sec=(root/'mobile/src/features/trading/securityIdentityService.js').read_text(encoding='utf-8')
if 'canonicalSymbol: "EQT"' not in sec and 'EQT:' not in sec:
    raise SystemExit('FAIL — mobile canonical security identity for EQT not found')
if 'EQTY' not in sec or 'EQTYO0000' not in sec:
    raise SystemExit('FAIL — historical/external Equity aliases are no longer preserved')
print("PASS — raw EQTY/EQTYO0000 aliases remain preserved for provenance and normalization.")
PY

# Run M20AL and earlier regression chain if present.
if [[ -x mobile/scripts/verify-pc030m20al-canonical-security-identity.sh ]]; then
  echo "Running M20AL and prior regressions..."
  (cd mobile && bash scripts/verify-pc030m20al-canonical-security-identity.sh)
fi

echo "PC-030M20AM verification complete."
