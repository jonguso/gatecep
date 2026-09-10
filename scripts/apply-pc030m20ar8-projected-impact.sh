#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"
SERVICE="$ROOT/mobile/src/features/trading/coachGProjectedImpactService.js"

echo "PC-030M20AR8 — Projected Holding & Portfolio Impact Review"
[[ -f "$TRADE" ]] || { echo "ERROR — $TRADE not found"; exit 1; }
[[ -f "$SERVICE" ]] || { echo "ERROR — projected impact service missing from package"; exit 1; }

python - "$TRADE" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text(encoding="utf-8")

if 'PC-030M20AR8 projected impact modal' in s:
    print('NO CHANGE — M20AR8 UI already installed')
    raise SystemExit(0)

# Import pure impact helper.
anchor='import { loadBrokerLotHistoryEvidence } from "../src/features/trading/brokerLotHistoryEvidenceService";'
if anchor not in s:
    raise SystemExit('ERROR — brokerLotHistoryEvidenceService import anchor not found; refusing unsafe patch')
s=s.replace(anchor, anchor+'\nimport { buildProjectedImpactReview } from "../src/features/trading/coachGProjectedImpactService";', 1)

# State.
anchor='  const [scenarioExtraCharges, setScenarioExtraCharges] = useState("0");'
if anchor not in s:
    raise SystemExit('ERROR — scenarioExtraCharges state anchor not found; refusing unsafe patch')
s=s.replace(anchor, anchor+'\n  const [projectedImpactOpen, setProjectedImpactOpen] = useState(false); // PC-030M20AR8 projected impact modal', 1)

# Add impact computation immediately after averageGuard useMemo block using addToBrokerActionPlan as stable next anchor.
anchor='\n  async function addToBrokerActionPlan() {'
if anchor not in s:
    raise SystemExit('ERROR — addToBrokerActionPlan anchor not found; refusing unsafe patch')
impact='''\n\n  const projectedImpact = useMemo(() =>\n    buildProjectedImpactReview({\n      holdings: averageCostMode ? realHoldings : portfolio,\n      selectedStock,\n      side,\n      estimate,\n      existingHolding,\n      averageGuard,\n      availableCash: cash\n    }),\n  [averageCostMode, realHoldings, portfolio, selectedStock, side, estimate, existingHolding, averageGuard, cash]);\n'''
s=s.replace(anchor, impact+anchor, 1)

# Add review button between scenario estimate card and old averageGuard card.
anchor='''      {averageGuard ? (\n        <View'''
if anchor not in s:
    raise SystemExit('ERROR — averageGuard render anchor not found; refusing unsafe patch')
button='''      {averageCostMode ? (\n        <Pressable\n          style={styles.impactReviewButton}\n          onPress={() => setProjectedImpactOpen(true)}\n        >\n          <Text style={styles.primaryText}>View Projected Impact</Text>\n        </Pressable>\n      ) : null}\n\n'''
s=s.replace(anchor, button+anchor, 1)

# Modal before preview-only / confirm control.
anchor='''      {!averageCostMode ? (\n        <Pressable'''
if anchor not in s:
    raise SystemExit('ERROR — preview/confirm anchor not found; refusing unsafe patch')
modal='''      <Modal\n        visible={projectedImpactOpen}\n        transparent\n        animationType="slide"\n        onRequestClose={() => setProjectedImpactOpen(false)}\n      >\n        <View style={styles.impactModalBackdrop}>\n          <View style={styles.impactModalCard}>\n            <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>\n              <Text style={styles.impactEyebrow}>COACH G — PROJECTED IMPACT</Text>\n              <Text style={styles.cardTitle}>Current vs Projected</Text>\n              <Text style={styles.small}>Advisory scenario only. REAL portfolio evidence has not changed.</Text>\n\n              {!projectedImpact?.available ? (\n                <View style={styles.impactNotice}>\n                  <Text style={styles.body}>{projectedImpact?.evidenceMessage || "Projected impact is unavailable until the scenario has valid security, quantity and price evidence."}</Text>\n                </View>\n              ) : (\n                <>\n                  <View style={styles.impactHeaderRow}>\n                    <Text style={styles.impactMetricLabel}>Metric</Text>\n                    <Text style={styles.impactMetricValue}>Current</Text>\n                    <Text style={styles.impactMetricValue}>Projected</Text>\n                  </View>\n                  {[["Quantity", projectedImpact.current.quantity, projectedImpact.projected.quantity],\n                    ["Weighted Average Price", projectedImpact.current.weightedAveragePrice == null ? "N/A" : `KES ${money(projectedImpact.current.weightedAveragePrice)}`, projectedImpact.projected.weightedAveragePrice == null ? "N/A" : `KES ${money(projectedImpact.projected.weightedAveragePrice)}`],\n                    ["Portfolio Weight", `${projectedImpact.current.portfolioWeightPct.toFixed(2)}%`, `${projectedImpact.projected.portfolioWeightPct.toFixed(2)}%`],\n                    [`${projectedImpact.sector} Exposure`, `${projectedImpact.current.sectorExposurePct.toFixed(2)}%`, `${projectedImpact.projected.sectorExposurePct.toFixed(2)}%`],\n                    ["Available Cash", `KES ${money(projectedImpact.current.availableCash)}`, `KES ${money(projectedImpact.projected.availableCash)}`]\n                  ].map(([label, current, projected]) => (\n                    <View key={label} style={styles.impactRow}>\n                      <Text style={styles.impactMetricLabel}>{label}</Text>\n                      <Text style={styles.impactMetricValue}>{current}</Text>\n                      <Text style={styles.impactMetricValue}>{projected}</Text>\n                    </View>\n                  ))}\n\n                  {side === "SELL" ? (\n                    <View style={styles.impactNotice}>\n                      <Text style={styles.small}>Projected Cost Basis Released: KES {money(projectedImpact.projected.costBasisReleased)}</Text>\n                      <Text style={styles.small}>Projected Realized Gain / Loss: KES {money(projectedImpact.projected.realizedGainLoss)}</Text>\n                    </View>\n                  ) : null}\n\n                  <Text style={styles.body}>\n                    {side === "BUY"\n                      ? `This BUY would move ${projectedImpact.symbol} from ${projectedImpact.current.portfolioWeightPct.toFixed(2)}% to ${projectedImpact.projected.portfolioWeightPct.toFixed(2)}% of the modeled portfolio and ${projectedImpact.sector} from ${projectedImpact.current.sectorExposurePct.toFixed(2)}% to ${projectedImpact.projected.sectorExposurePct.toFixed(2)}%.`\n                      : `This SELL would leave ${projectedImpact.projected.quantity} shares of ${projectedImpact.symbol}. The remaining WAP shown here comes from the existing FIFO-aware sale analysis.`}\n                  </Text>\n                </>\n              )}\n\n              <Pressable style={styles.primary} onPress={() => setProjectedImpactOpen(false)}>\n                <Text style={styles.primaryText}>Back to Scenario</Text>\n              </Pressable>\n            </ScrollView>\n          </View>\n        </View>\n      </Modal>\n\n'''
s=s.replace(anchor, modal+anchor, 1)

# Styles inserted before final StyleSheet closing. Use a stable known style key near end.
style_anchor='''  averageGuardWarning: {'''
if style_anchor not in s:
    raise SystemExit('ERROR — StyleSheet impact anchor not found; refusing unsafe patch')
styles='''  impactReviewButton: {\n    marginHorizontal: 18,\n    marginTop: 10,\n    marginBottom: 8,\n    paddingVertical: 15,\n    borderRadius: 14,\n    alignItems: "center",\n    backgroundColor: "#1f9bbf"\n  },\n  impactModalBackdrop: {\n    flex: 1,\n    backgroundColor: "rgba(0,0,0,0.72)",\n    justifyContent: "center",\n    padding: 18\n  },\n  impactModalCard: {\n    maxHeight: "88%",\n    borderRadius: 18,\n    borderWidth: 1,\n    borderColor: "#2fb7dc",\n    backgroundColor: "#0b1728",\n    padding: 18\n  },\n  impactEyebrow: {\n    color: "#59dcff",\n    fontWeight: "800",\n    fontSize: 12,\n    letterSpacing: 0.6,\n    marginBottom: 8\n  },\n  impactHeaderRow: {\n    flexDirection: "row",\n    borderBottomWidth: 1,\n    borderBottomColor: "#334155",\n    paddingVertical: 10,\n    marginTop: 12\n  },\n  impactRow: {\n    flexDirection: "row",\n    borderBottomWidth: 1,\n    borderBottomColor: "#243247",\n    paddingVertical: 12\n  },\n  impactMetricLabel: {\n    flex: 1.45,\n    color: "#dbeafe",\n    fontSize: 13\n  },\n  impactMetricValue: {\n    flex: 1,\n    color: "#ffffff",\n    fontSize: 13,\n    fontWeight: "700",\n    textAlign: "right"\n  },\n  impactNotice: {\n    marginTop: 12,\n    marginBottom: 12,\n    padding: 12,\n    borderRadius: 12,\n    backgroundColor: "#132641"\n  },\n'''
s=s.replace(style_anchor, styles+style_anchor, 1)

p.write_text(s, encoding="utf-8")
print('UPDATED — Trade Lab now exposes View Projected Impact with Current vs Projected holding/portfolio evidence')
print('PRESERVED — BUY WAP reuses weighted-average guard when available; SELL remains FIFO-evidence gated')
PY

echo "PC-030M20AR8 applied successfully."
