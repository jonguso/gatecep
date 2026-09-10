#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AT2 — Decision Amount → Approximate Quantity Handoff"
[[ -f "$TRADE" ]] || { echo "ERROR — trade.js missing"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import sys,re

p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")

if "PC-030M20AT2 approximate quantity handoff" in s:
    print("NO CHANGE — M20AT2 already installed")
    raise SystemExit(0)

imports=list(re.finditer(r'^import\s+.*?;\s*$',s,re.M|re.S))
if not imports:
    raise SystemExit("ERROR — trade import block not found")
pos=imports[-1].end()
s=s[:pos]+'\nimport { deriveApproximateScenarioQuantity } from "../src/features/trading/decisionAmountQuantityService";'+s[pos:]

m=re.search(r'const\s+(\w+)\s*=\s*useLocalSearchParams\(\);',s)
if not m:
    raise SystemExit("ERROR — useLocalSearchParams assignment not found")
params_var=m.group(1)
insert=m.end()
s=s[:insert] + f'''
  // PC-030M20AT2 approximate quantity handoff
  const decisionAmountParam = Number(Array.isArray({params_var}?.decisionAmount) ? {params_var}.decisionAmount[0] : {params_var}?.decisionAmount || 0);
''' + s[insert:]

qm=re.search(r'const\s+\[quantity,\s*setQuantity\]\s*=\s*useState\(([^)]*)\);',s)
if not qm:
    raise SystemExit("ERROR — quantity state not found")

if "selectedStock" not in s or "existingHolding" not in s:
    raise SystemExit("ERROR — selectedStock/existingHolding contracts missing")

# Determine decisionLab boolean variable existence.
decision_lab_expr = "decisionLab"
if "const decisionLab" not in s and "decisionLab =" not in s:
    decision_lab_expr = f'String({params_var}?.decisionLab || "") === "1"'

# Add effect immediately before render return.
ret=s.find("  return (")
if ret<0:
    raise SystemExit("ERROR — trade render return not found")

logic = f'''
  useEffect(() => {{
    if (!({decision_lab_expr})) return;
    if (!(decisionAmountParam > 0)) return;
    if (String(quantity ?? "").trim() !== "" && Number(quantity) > 0) return;

    const currentScenarioPrice = Number(
      selectedStock?.price ||
      selectedStock?.lastPrice ||
      selectedStock?.currentPrice ||
      0
    );

    const derived = deriveApproximateScenarioQuantity({{
      side,
      decisionAmount: decisionAmountParam,
      currentPrice: currentScenarioPrice,
      availableQuantity: Number(existingHolding?.quantity || existingHolding?.shares || 0),
      percentChargeRate: 0.013 + 0.0034,
      fixedCharges: Number(additionalCharges || 0),
      existingQuantityText: ""
    }});

    if (derived.available && derived.quantity > 0) {{
      setQuantity(String(derived.quantity));
    }}
  }}, [{decision_lab_expr}, decisionAmountParam, side, selectedStock, existingHolding, additionalCharges]);

'''
s=s[:ret]+logic+s[ret:]

# Add helper below first TextInput after Quantity label.
label_idx=s.find(">Quantity</Text>")
if label_idx<0:
    raise SystemExit("ERROR — Quantity label anchor not found")
ti=s.find("<TextInput",label_idx)
if ti<0:
    raise SystemExit("ERROR — Quantity TextInput not found")
end=s.find("/>",ti)
if end<0:
    raise SystemExit("ERROR — Quantity TextInput closing not found")
end+=2

helper = f'''
              {{({decision_lab_expr}) && decisionAmountParam > 0 && Number(quantity) > 0 ? (
                <Text style={{styles.small}}>
                  Approx. {{Number(quantity).toLocaleString()}} shares from KES {{decisionAmountParam.toLocaleString()}} at KES {{Number(selectedStock?.price || selectedStock?.lastPrice || selectedStock?.currentPrice || 0).toFixed(2)}}. Editable; scenario estimate only.
                </Text>
              ) : null}}'''
s=s[:end]+helper+s[end:]

p.write_text(s,encoding="utf-8")
print("UPDATED — Decision Lab amount auto-seeds an editable approximate quantity.")
print("PRESERVED — manual edits win; SELL caps to holding; missing price never fabricates quantity.")
PY

echo "PC-030M20AT2 applied successfully."
