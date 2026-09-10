#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" ]]; then
  echo "ERROR — run this script from the GateCEP project root (~/gatecep)." >&2
  exit 1
fi
python3 - <<'PY'
from pathlib import Path
root = Path.cwd()

# 1) Historical lot ledger: use the existing M20AJ normalizer for sorting and
# derive normalized date metadata, but preserve the existing acquisitionDate/saleDate contract.
p = root / "mobile/src/features/trading/historicalSecurityLotLedgerService.js"
text = p.read_text(encoding="utf-8")
orig = text
imp = 'import { normalizeEvidenceDate } from "./transactionDateNormalizationService.js";'
if imp not in text:
    anchor = 'import { canonicalSecuritySymbol } from "./securityIdentityService.js";'
    if anchor not in text:
        raise SystemExit("ERROR — historical ledger import anchor not found")
    text = text.replace(anchor, anchor + "\n" + imp, 1)

old = '''function dateKey(value) {\n  const direct = new Date(value || 0).getTime();\n  if (Number.isFinite(direct)) return direct;\n  const match = String(value || "").match(/^(\\d{1,2})-([A-Za-z]{3})-(\\d{4})$/);\n  if (!match) return 0;\n  const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(match[2].toUpperCase());\n  return month >= 0 ? Date.UTC(Number(match[3]), month, Number(match[1])) : 0;\n}'''
new = '''function dateKey(value) {\n  const normalized = normalizeEvidenceDate(value).normalizedDate;\n  const direct = normalized ? Date.parse(`${normalized}T00:00:00Z`) : NaN;\n  return Number.isFinite(direct) ? direct : 0;\n}'''
if old in text:
    text = text.replace(old, new, 1)
elif 'const normalized = normalizeEvidenceDate(value).normalizedDate;' not in text:
    raise SystemExit("ERROR — historical ledger dateKey block not recognized")

old = '    const date = row.executionDate || row.date || row.createdAt || null;'
new = '''    const date = row.executionDate || row.date || row.createdAt || null;\n    const dateEvidence = normalizeEvidenceDate(date);'''
if old in text:
    text = text.replace(old, new, 1)
elif 'const dateEvidence = normalizeEvidenceDate(date);' not in text:
    raise SystemExit("ERROR — historical ledger row date block not recognized")

old = '''        acquisitionDate: date,\n        originalQuantity: quantity,'''
new = '''        acquisitionDate: date,\n        acquisitionDateNormalized: dateEvidence.normalizedDate || null,\n        acquisitionDateMethod: dateEvidence.method,\n        originalQuantity: quantity,'''
if old in text:
    text = text.replace(old, new, 1)

old = '''          acquisitionDate: lot.acquisitionDate,\n          quantity: consumed,'''
new = '''          acquisitionDate: lot.acquisitionDate,\n          acquisitionDateNormalized: lot.acquisitionDateNormalized || null,\n          acquisitionDateMethod: lot.acquisitionDateMethod || null,\n          quantity: consumed,'''
if old in text:
    text = text.replace(old, new, 1)

old = '''          saleDate: date,\n          saleQuantity: quantity,'''
new = '''          saleDate: date,\n          saleDateNormalized: dateEvidence.normalizedDate || null,\n          saleDateMethod: dateEvidence.method,\n          saleQuantity: quantity,'''
if old in text:
    text = text.replace(old, new, 1)

old = '''        saleDate: date,\n        quantity,'''
new = '''        saleDate: date,\n        saleDateNormalized: dateEvidence.normalizedDate || null,\n        saleDateMethod: dateEvidence.method,\n        quantity,'''
if old in text:
    text = text.replace(old, new, 1)

old = '''      date: lot.acquisitionDate,\n      brokerReference: lot.brokerReference'''
new = '''      date: lot.acquisitionDate,\n      normalizedDate: lot.acquisitionDateNormalized || null,\n      dateMethod: lot.acquisitionDateMethod || null,\n      brokerReference: lot.brokerReference'''
if old in text:
    text = text.replace(old, new, 1)

if text != orig:
    bak = p.with_suffix(p.suffix + '.pc030m20ao.bak')
    if not bak.exists(): bak.write_text(orig, encoding='utf-8')
    p.write_text(text, encoding='utf-8')
    print('UPDATED — mobile/src/features/trading/historicalSecurityLotLedgerService.js')
else:
    print('UNCHANGED — mobile/src/features/trading/historicalSecurityLotLedgerService.js')

# 2) FIFO reconstruction: normalize sorting and attach normalizedDate metadata,
# but DO NOT change the existing lot.date value (M20AD public contract).
p = root / "mobile/src/features/trading/weightedAverageBuyGuardService.js"
text = p.read_text(encoding='utf-8')
orig = text
imp = 'import { normalizeEvidenceDate } from "./transactionDateNormalizationService.js";'
if imp not in text:
    text = imp + "\n" + text

old = 'lots.push({ quantity, unitCost: (quantity * price + fees) / quantity, originalUnitPrice: price, feesKnown: fees > 0, date: row.executionDate || row.date || null, brokerReference: row.brokerReference || row.orderNo || null });'
new = '''const rawLotDate = row.executionDate || row.date || null;\n      const lotDateEvidence = normalizeEvidenceDate(rawLotDate);\n      lots.push({\n        quantity,\n        unitCost: (quantity * price + fees) / quantity,\n        originalUnitPrice: price,\n        feesKnown: fees > 0,\n        date: rawLotDate,\n        normalizedDate: lotDateEvidence.normalizedDate || null,\n        dateMethod: lotDateEvidence.method,\n        brokerReference: row.brokerReference || row.orderNo || null\n      });'''
if old in text:
    text = text.replace(old, new, 1)
elif 'normalizedDate: lotDateEvidence.normalizedDate || null' not in text:
    raise SystemExit("ERROR — weighted FIFO BUY lot block not recognized")

old = '''function dateKey(value) {\n  const direct = new Date(value || 0).getTime();\n  if (Number.isFinite(direct)) return direct;\n  const match = String(value || "").match(/^(\\d{1,2})-([A-Za-z]{3})-(\\d{4})$/);\n  if (!match) return 0;\n  const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(match[2].toUpperCase());\n  return month >= 0 ? Date.UTC(Number(match[3]), month, Number(match[1])) : 0;\n}'''
new = '''function dateKey(value) {\n  const normalized = normalizeEvidenceDate(value).normalizedDate;\n  const direct = normalized ? Date.parse(`${normalized}T00:00:00Z`) : NaN;\n  return Number.isFinite(direct) ? direct : 0;\n}'''
if old in text:
    text = text.replace(old, new, 1)
elif 'const normalized = normalizeEvidenceDate(value).normalizedDate;' not in text:
    raise SystemExit("ERROR — weighted FIFO dateKey block not recognized")

if text != orig:
    bak = p.with_suffix(p.suffix + '.pc030m20ao.bak')
    if not bak.exists(): bak.write_text(orig, encoding='utf-8')
    p.write_text(text, encoding='utf-8')
    print('UPDATED — mobile/src/features/trading/weightedAverageBuyGuardService.js')
else:
    print('UNCHANGED — mobile/src/features/trading/weightedAverageBuyGuardService.js')

# 3) Investor-facing Trade display uses the derived normalized date when available.
p = root / "mobile/app/trade.js"
text = p.read_text(encoding='utf-8')
orig = text
old = '''                            {lot.date ||\n                              "Date unavailable"}\n                            : {lot.quantity} shares bought'''
new = '''                            {lot.normalizedDate ||\n                              lot.date ||\n                              "Date unavailable"}\n                            : {lot.quantity} shares bought'''
if old in text:
    text = text.replace(old, new, 1)
elif 'lot.normalizedDate ||' not in text:
    raise SystemExit("ERROR — Trade FIFO date display block not recognized")
if text != orig:
    bak = p.with_suffix(p.suffix + '.pc030m20ao.bak')
    if not bak.exists(): bak.write_text(orig, encoding='utf-8')
    p.write_text(text, encoding='utf-8')
    print('UPDATED — mobile/app/trade.js')
else:
    print('UNCHANGED — mobile/app/trade.js')
PY

echo "PC-030M20AO FIFO acquisition-date normalization applied."
