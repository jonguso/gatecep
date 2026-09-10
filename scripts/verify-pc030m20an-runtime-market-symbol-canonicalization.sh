#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" ]]; then
  echo "ERROR — run this script from the GateCEP project root (~/gatecep)." >&2
  exit 1
fi

MASTER="mobile/src/utils/nseSecurityMaster.js"
QUOTE="mobile/src/services/markets/canonicalNseQuoteService.js"
TRADE="mobile/app/trade.js"
IDENTITY="mobile/src/features/trading/securityIdentityService.js"

node --input-type=module <<'NODE'
import fs from 'node:fs';
const master = fs.readFileSync('mobile/src/utils/nseSecurityMaster.js', 'utf8');
const quote = fs.readFileSync('mobile/src/services/markets/canonicalNseQuoteService.js', 'utf8');
const trade = fs.readFileSync('mobile/app/trade.js', 'utf8');
const identity = fs.readFileSync('mobile/src/features/trading/securityIdentityService.js', 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(`FAIL — ${message}`);
  console.log(`PASS — ${message}`);
}

ok(master.includes('aliases: ["EQTY", "EQTYO0000"]'), 'NSE security master declares EQTY/EQTYO0000 as aliases of canonical EQT.');
ok(master.includes('Array.isArray(item.aliases)') && master.includes('normalizeNseSymbol(alias) === value'), 'NSE security master resolves aliases generically instead of only exact symbols.');
ok(quote.includes('canonicalSecuritySymbol') && !quote.includes('return ({ EQT: "EQTY", IM: "IMH" })[normalized] || normalized;'), 'canonical quote snapshots no longer emit provider EQTY as the investor-facing symbol.');
ok(identity.includes('aliases: Object.freeze(["EQT", "EQTY", "EQTYO0000"])'), 'M20AL raw/provider alias provenance remains accepted by the central identity registry.');
ok(trade.includes('canonicalSecuritySymbol(item.symbol) === target'), 'Trade route selection matches market rows by canonical identity.');
ok((trade.match(/canonicalSecuritySymbol\(item\.symbol\) ===/g) || []).length >= 3, 'Trade canonicalizes market, Practice and REAL holding identity comparisons.');
ok(trade.includes('symbol: canonicalSecuritySymbol(verified.symbol)'), 'Trade selected-stock state stores canonical symbol after runtime quote selection.');
ok(trade.includes('const canonical = canonicalSecuritySymbol(stock?.symbol);'), 'Trade security-picker selection canonicalizes provider aliases before state update.');
NODE

# Preserve intentional external/provider boundaries from M20AM/M20AL.
grep -q 'aliases: Object.freeze(\["EQT", "EQTY", "EQTYO0000"\])' "$IDENTITY"

echo "Static runtime identity checks complete."

if [[ -x scripts/verify-pc030m20am-investor-facing-canonical-symbol.sh ]]; then
  echo "Running M20AM and prior regressions..."
  bash scripts/verify-pc030m20am-investor-facing-canonical-symbol.sh
elif [[ -x mobile/scripts/verify-pc030m20al-canonical-security-identity.sh ]]; then
  echo "Running M20AL and prior regressions..."
  (cd mobile && bash scripts/verify-pc030m20al-canonical-security-identity.sh)
fi

echo "PC-030M20AN verification complete."
