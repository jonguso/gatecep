#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" ]]; then
  echo "ERROR — run this script from the GateCEP project root (~/gatecep)." >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import re

root = Path.cwd()


def patch_exact(path_rel, replacements):
    path = root / path_rel
    if not path.exists():
        raise SystemExit(f"ERROR — missing expected file: {path_rel}")
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new, label in replacements:
        if new in text:
            continue
        if old not in text:
            raise SystemExit(f"ERROR — {path_rel}: expected source fragment not found for {label}")
        text = text.replace(old, new, 1)
    if text != original:
        backup = path.with_suffix(path.suffix + ".pc030m20an.bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(text, encoding="utf-8")
        print(f"UPDATED — {path_rel}")
    else:
        print(f"UNCHANGED — {path_rel} (already canonicalized)")

# 1) Make the NSE security master honor aliases generically.
patch_exact("mobile/src/utils/nseSecurityMaster.js", [
    (
        '{ symbol: "EQT", name: "Equity Group", sector: "Banking" },',
        '{ symbol: "EQT", aliases: ["EQTY", "EQTYO0000"], name: "Equity Group", sector: "Banking" },',
        "EQT aliases",
    ),
    (
        '''  return (\n    NSE_SECURITIES.find((item) => normalizeNseSymbol(item.symbol) === value) || {\n      symbol: value,\n      name: value,\n      sector: "Unknown"\n    }\n  );''',
        '''  return (\n    NSE_SECURITIES.find((item) => {\n      if (normalizeNseSymbol(item.symbol) === value) return true;\n      return (Array.isArray(item.aliases) ? item.aliases : []).some(\n        (alias) => normalizeNseSymbol(alias) === value\n      );\n    }) || {\n      symbol: value,\n      name: value,\n      sector: "Unknown"\n    }\n  );''',
        "generic alias resolution",
    ),
])

# 2) Quote snapshots must expose GateCEP canonical symbols, not provider aliases.
patch_exact("mobile/src/services/markets/canonicalNseQuoteService.js", [
    (
        'import { userGetItem, userSetItem } from "../auth/userStorage";',
        'import { userGetItem, userSetItem } from "../auth/userStorage";\nimport { canonicalSecuritySymbol } from "../../features/trading/securityIdentityService";',
        "security identity import",
    ),
    (
        '''const symbol = (value) => {\n  const normalized = clean(value).toUpperCase().replace(/\\.NR$/i, "");\n  return ({ EQT: "EQTY", IM: "IMH" })[normalized] || normalized;\n};''',
        '''const symbol = (value) =>\n  canonicalSecuritySymbol(\n    clean(value).toUpperCase().replace(/\\.NR$/i, "")\n  );''',
        "canonical quote symbol normalization",
    ),
])

# Preserve the explicit outbound provider-symbol boundary required by M20AM.
quote_path = root / "mobile/src/services/markets/canonicalNseQuoteService.js"
quote_text = quote_path.read_text(encoding="utf-8")
provider_helper = '''\nexport function nseProviderSymbol(value) {\n  const canonical = symbol(value);\n  return ({ EQT: "EQTY", IM: "IMH" })[canonical] || canonical;\n}\n'''
if 'EQT: "EQTY"' not in quote_text:
    marker = '''const symbol = (value) =>\n  canonicalSecuritySymbol(\n    clean(value).toUpperCase().replace(/\\.NR$/i, "")\n  );\n'''
    if marker not in quote_text:
        raise SystemExit("ERROR — canonicalNseQuoteService.js: canonical symbol helper not found")
    quote_text = quote_text.replace(marker, marker + provider_helper, 1)
    quote_path.write_text(quote_text, encoding="utf-8")
    print("UPDATED — mobile/src/services/markets/canonicalNseQuoteService.js provider boundary")

# 3) Trade must compare canonical identities on both sides.
trade_path = root / "mobile/app/trade.js"
if not trade_path.exists():
    raise SystemExit("ERROR — missing expected file: mobile/app/trade.js")
text = trade_path.read_text(encoding="utf-8")
original = text

imp = 'import { canonicalSecuritySymbol } from "../src/features/trading/securityIdentityService";'
if imp not in text:
    anchor = 'import { loadBrokerLotHistoryEvidence } from "../src/features/trading/brokerLotHistoryEvidenceService";'
    if anchor not in text:
        raise SystemExit("ERROR — mobile/app/trade.js: broker lot-history import anchor not found")
    text = text.replace(anchor, anchor + "\n" + imp, 1)

if 'canonicalSecuritySymbol(item.symbol) === target' not in text:
    pattern = re.compile(
        r'const target = String\(\s*requestedSymbol \|\| selectedStock\?\.symbol \|\| ""\s*\)\s*\.trim\(\)\s*\.toUpperCase\(\);\s*'
        r'const verified =\s*stocks\.find\(\s*\(item\) => String\(item\.symbol\)\.toUpperCase\(\) === target\s*\)\s*\|\| \(!target \? stocks\[0\] : null\);',
        re.S,
    )
    repl = """const target = canonicalSecuritySymbol(
      requestedSymbol || selectedStock?.symbol || ""
    );

    const verified =
      stocks.find(
        (item) => canonicalSecuritySymbol(item.symbol) === target
      ) || (!target ? stocks[0] : null);"""
    text, count = pattern.subn(repl, text, count=1)
    if count != 1:
        raise SystemExit("ERROR — mobile/app/trade.js: route-to-market selection block not recognized")

canonical_set = """setSelectedStock({
      ...verified,
      providerSymbol:
        verified.providerSymbol ||
        (canonicalSecuritySymbol(verified.symbol) !== String(verified.symbol || "").toUpperCase()
          ? verified.symbol
          : undefined),
      symbol: canonicalSecuritySymbol(verified.symbol)
    });"""
if canonical_set not in text:
    if 'setSelectedStock(verified);' not in text:
        raise SystemExit("ERROR — mobile/app/trade.js: selected verified stock assignment not found")
    text = text.replace('setSelectedStock(verified);', canonical_set, 1)

if 'const normalizedSymbol = canonicalSecuritySymbol(normalized.symbol);' not in text:
    pattern = re.compile(
        r'const stock =\s*stocks\.find\(\(item\) => item\.symbol === normalized\.symbol\) \|\| \{\s*symbol: normalized\.symbol,\s*name: normalized\.name \|\| normalized\.symbol,',
        re.S,
    )
    repl = """const normalizedSymbol = canonicalSecuritySymbol(normalized.symbol);
    const stock =
      stocks.find(
        (item) => canonicalSecuritySymbol(item.symbol) === normalizedSymbol
      ) || {
        symbol: normalizedSymbol,
        name: normalized.name || normalizedSymbol,"""
    text, count = pattern.subn(repl, text, count=1)
    if count != 1:
        raise SystemExit("ERROR — mobile/app/trade.js: basket stock lookup block not recognized")

if 'const canonical = canonicalSecuritySymbol(stock?.symbol);' not in text:
    pattern = re.compile(
        r'function selectStock\(stock\) \{\s*setSelectedStock\(stock\);\s*setLimitPrice\(String\(stock\.price\)\);',
        re.S,
    )
    repl = """function selectStock(stock) {
    const canonical = canonicalSecuritySymbol(stock?.symbol);
    setSelectedStock({
      ...stock,
      providerSymbol:
        stock?.providerSymbol ||
        (canonical !== String(stock?.symbol || "").toUpperCase() ? stock.symbol : undefined),
      symbol: canonical
    });
    setLimitPrice(String(stock.price));"""
    text, count = pattern.subn(repl, text, count=1)
    if count != 1:
        raise SystemExit("ERROR — mobile/app/trade.js: picker selection block not recognized")

comparison = re.compile(
    r'String\(item\.symbol \|\| ""\)\.toUpperCase\(\)\s*===\s*String\(selectedStock\.symbol \|\| ""\)\.toUpperCase\(\)',
    re.S,
)
text, replaced = comparison.subn(
    'canonicalSecuritySymbol(item.symbol) ===\n          canonicalSecuritySymbol(selectedStock.symbol)',
    text,
)
if replaced == 0 and text.count('canonicalSecuritySymbol(item.symbol) ===') < 3:
    raise SystemExit("ERROR — mobile/app/trade.js: holding symbol comparisons not recognized")

if text != original:
    backup = trade_path.with_suffix(trade_path.suffix + ".pc030m20an.bak")
    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
    trade_path.write_text(text, encoding="utf-8")
    print("UPDATED — mobile/app/trade.js")
else:
    print("UNCHANGED — mobile/app/trade.js (already canonicalized)")
PY

echo "PC-030M20AN runtime market symbol canonicalization applied."
