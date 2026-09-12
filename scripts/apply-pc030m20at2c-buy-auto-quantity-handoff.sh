#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AT2C — BUY Auto-Quantity Handoff Correction"
[[ -f "$TRADE" ]] || { echo "ERROR — trade.js missing"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import re, sys

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

marker = "PC-030M20AT2C buy-auto-quantity correction"
if marker in s:
    print("NO CHANGE — M20AT2C already installed")
    raise SystemExit(0)

# Current M20AT2A contract must already be present.
m = re.search(r'const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams\(\);', s, re.S)
if not m:
    raise SystemExit("ERROR — Trade route-param contract not found")

inside = m.group(1)
parts = [x.strip() for x in inside.split(",") if x.strip()]
needed = []
if "requestedProposedAmount" not in inside:
    needed.append("proposedAmount: requestedProposedAmount")
if "requestedAmount" not in inside:
    needed.append("amount: requestedAmount")

if needed:
    replacement = "const { " + ", ".join(parts + needed) + " } = useLocalSearchParams();"
    s = s[:m.start()] + replacement + s[m.end():]

# Replace single-source decision amount normalization with fallback aliases.
old_pattern = re.compile(
    r'const\s+decisionAmountParam\s*=\s*Number\(\s*'
    r'Array\.isArray\(requestedDecisionAmount\).*?'
    r'requestedDecisionAmount\s*\|\|\s*0\s*\)\s*;',
    re.S
)
mm = old_pattern.search(s)
if not mm:
    raise SystemExit("ERROR — existing M20AT2A decisionAmountParam normalization not found")

new = """// PC-030M20AT2C buy-auto-quantity correction
  const firstRouteNumber = (...values) => {
    for (const value of values) {
      const raw = Array.isArray(value) ? value[0] : value;
      const parsed = Number(raw || 0);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  const decisionAmountParam = firstRouteNumber(
    requestedDecisionAmount,
    requestedProposedAmount,
    requestedAmount
  );"""

s = s[:mm.start()] + new + s[mm.end():]

# BUY does not need an existing holding; SELL still uses the holding cap.
old_available = """      availableQuantity: Number(
        existingHolding?.quantity ||
        existingHolding?.shares ||
        0
      ),"""
new_available = """      availableQuantity:
        side === "SELL"
          ? Number(
              existingHolding?.quantity ||
              existingHolding?.shares ||
              0
            )
          : null,"""
if old_available not in s:
    raise SystemExit("ERROR — M20AT2B availableQuantity anchor not found")
s = s.replace(old_available, new_available, 1)

# Add clearer BUY helper wording when the existing helper is present.
old_helper = """            Approx. {Number(quantity).toLocaleString()} shares from KES{" "}
            {decisionAmountParam.toLocaleString()} at KES{" "}
            {Number(selectedStock.price).toFixed(2)}.
            {" "}Editable; scenario estimate only."""
new_helper = """            Approx. {Number(quantity).toLocaleString()} shares from KES{" "}
            {decisionAmountParam.toLocaleString()} at KES{" "}
            {Number(selectedStock.price).toFixed(2)}.
            {side === "BUY"
              ? " Known percentage charges are included in the quantity estimate."
              : ""}
            {" "}Editable; scenario estimate only."""
if old_helper in s:
    s = s.replace(old_helper, new_helper, 1)

p.write_text(s, encoding="utf-8")
print("UPDATED — Trade Lab accepts decisionAmount, proposedAmount, or amount as the scenario budget.")
print("UPDATED — BUY auto-quantity no longer depends on an existing holding.")
print("UPDATED — BUY quantity remains charge-aware and stays within the intended KES amount.")
print("PRESERVED — SELL holding cap, manual-edit protection, FIFO and Broker Action Plan boundaries.")
print("PC-030M20AT2C applied successfully.")
PY
