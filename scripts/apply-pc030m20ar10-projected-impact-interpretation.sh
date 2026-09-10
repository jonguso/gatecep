#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AR10 — Action-Aware Projected Impact Interpretation"
[[ -f "$TRADE" ]] || { echo "ERROR — $TRADE not found"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import sys, re
p=Path(sys.argv[1]); s=p.read_text(encoding="utf-8")
if "PC-030M20AR10 Coach G projected interpretation" in s:
    print("NO CHANGE — M20AR10 UI already installed"); raise SystemExit(0)
if "COACH G — PROJECTED IMPACT" not in s:
    raise SystemExit("ERROR — M20AR8 Projected Impact modal not found; refusing unsafe patch")
old='''                  <Text style={styles.body}>
                    {side === "BUY"
                      ? `This BUY would move ${projectedImpact.symbol} from ${projectedImpact.current.portfolioWeightPct.toFixed(2)}% to ${projectedImpact.projected.portfolioWeightPct.toFixed(2)}% of the modeled portfolio and ${projectedImpact.sector} from ${projectedImpact.current.sectorExposurePct.toFixed(2)}% to ${projectedImpact.projected.sectorExposurePct.toFixed(2)}%.`
                      : `This SELL would leave ${projectedImpact.projected.quantity} shares of ${projectedImpact.symbol}. The remaining WAP shown here comes from the existing FIFO-aware sale analysis.`}
                  </Text>'''
new='''                  {/* PC-030M20AR10 Coach G projected interpretation */}
                  <View style={styles.impactCoachCard}>
                    <Text style={styles.impactCoachLabel}>COACH G — WHAT THIS MEANS</Text>
                    <Text style={styles.cardTitle}>{projectedImpact.interpretation?.headline}</Text>
                    <Text style={styles.body}>{projectedImpact.interpretation?.summary}</Text>
                    <Text style={styles.impactQuestion}>{projectedImpact.interpretation?.question}</Text>
                    {(projectedImpact.interpretation?.evidenceBoundaries || []).map((boundary, index) => (
                      <Text key={`impact-boundary-${index}`} style={styles.small}>• {boundary}</Text>
                    ))}
                  </View>'''
if old not in s:
    raise SystemExit("ERROR — M20AR8 explanatory block not found; refusing unsafe patch")
s=s.replace(old,new,1)
anchor='''  impactNotice: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#132641"
  },'''
if anchor not in s: raise SystemExit("ERROR — M20AR8 style anchor not found; refusing unsafe patch")
addition=anchor+'''
  impactCoachCard: {
    marginTop: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#101f34"
  },
  impactCoachLabel: {
    color: "#59dcff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 7
  },
  impactQuestion: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 10
  },'''
s=s.replace(anchor,addition,1)
p.write_text(s,encoding="utf-8")
print("UPDATED — Projected Impact modal now shows action-aware Coach G interpretation.")
print("PRESERVED — Current vs Projected metrics, FIFO SELL evidence and Broker Action Plan boundary remain unchanged.")
PY

echo "PC-030M20AR10 applied successfully."
