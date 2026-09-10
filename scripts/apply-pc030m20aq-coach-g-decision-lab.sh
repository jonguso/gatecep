#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
SERVICE="$ROOT/mobile/src/features/trading/coachGDecisionLabService.js"
[[ -f "$FILE" ]] || { echo "ERROR — run from ~/gatecep; missing $FILE"; exit 1; }
[[ -f "$SERVICE" ]] || { echo "ERROR — M20AQ service missing"; exit 1; }
python - "$FILE" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text(encoding='utf-8')
if 'PC-030M20AQ Decision Lab Home' in s:
    print('SKIP — mobile/app/(tabs)/trading.js already contains M20AQ')
    raise SystemExit(0)
# add import after expo-router import
needle='import { router, useFocusEffect } from "expo-router";'
imp='''import { router, useFocusEffect } from "expo-router";\nimport {\n  buildDecisionLabBaseline,\n  buildRecoveryStressTable\n} from "../../src/features/trading/coachGDecisionLabService";'''
if needle not in s:
    raise SystemExit('ERROR — expected expo-router import not found; refusing unsafe patch')
s=s.replace(needle, imp, 1)
# derive portfolio baseline after cash
needle='  const cash = Number(data?.cash || 0);'
insert='''  const cash = Number(data?.cash || 0);\n  const portfolio = Array.isArray(data?.portfolio) ? data.portfolio : [];\n  const decisionBaseline = useMemo(\n    () => buildDecisionLabBaseline({ holdings: portfolio, availableCash: cash }),\n    [portfolio, cash]\n  );\n  const recoveryStress = useMemo(() => buildRecoveryStressTable(), []);'''
if needle not in s:
    raise SystemExit('ERROR — trading cash anchor not found; refusing unsafe patch')
s=s.replace(needle, insert, 1)
# rename title/subtitle
s=s.replace('<Text style={styles.title}>Trading</Text>', '<Text style={styles.title}>Coach G Decision Lab</Text>', 1)
s=s.replace('Broker workspace for orders, market depth, execution, deposits, and status.', 'Test an investment decision before you act. See portfolio, goal, liquidity, concentration, downside and recovery implications without placing a REAL trade.', 1)
# insert lab home before ActiveUserBanner
needle='      <ActiveUserBanner />'
block='''      {/* PC-030M20AQ Decision Lab Home */}\n      <View style={styles.decisionHero}>\n        <Text style={styles.decisionEyebrow}>READ-ONLY DECISION TESTING</Text>\n        <Text style={styles.decisionTitle}>What happens if I do this?</Text>\n        <Text style={styles.body}>\n          Start with your current portfolio, test a hypothetical BUY or SELL, then review the detailed Trade Lab scenario before adding anything to the Broker Action Plan. GateCEP does not execute the REAL trade.\n        </Text>\n        <View style={styles.decisionActions}>\n          <Pressable style={styles.decisionPrimary} onPress={() => router.push({ pathname: "/trade", params: { mode: "AVERAGE_COST", side: "BUY", decisionLab: "1" } })}>\n            <Text style={styles.decisionPrimaryText}>Simulate a Buy</Text>\n          </Pressable>\n          <Pressable style={styles.decisionSecondary} onPress={() => router.push({ pathname: "/trade", params: { mode: "AVERAGE_COST", side: "SELL", decisionLab: "1" } })}>\n            <Text style={styles.decisionSecondaryText}>Simulate a Sell</Text>\n          </Pressable>\n        </View>\n      </View>\n\n      <View style={styles.decisionCard}>\n        <Text style={styles.decisionCardTitle}>Current Decision Baseline</Text>\n        <Text style={styles.body}>Holdings: {decisionBaseline.holdingsCount} • Portfolio evidence KES {decisionBaseline.holdingsValue.toLocaleString()}</Text>\n        <Text style={styles.body}>Available cash: KES {decisionBaseline.availableCash.toLocaleString()}</Text>\n        <Text style={styles.body}>Largest position: {decisionBaseline.largestHolding || "N/A"} {decisionBaseline.largestHolding ? `• ${decisionBaseline.largestHoldingWeight}%` : ""}</Text>\n        <Text style={styles.decisionNote}>Detailed scenarios compare CURRENT vs PROJECTED. Projected values never overwrite REAL holdings.</Text>\n      </View>\n\n      <View style={styles.decisionCard}>\n        <Text style={styles.decisionCardTitle}>Risk & Recovery — what “Aggressive” means</Text>\n        <Text style={styles.body}>Coach G must explain risk from evidence such as concentration, liquidity, goal impact and downside. The recovery math below is deterministic, not a forecast.</Text>\n        {recoveryStress.map((row) => (\n          <View key={row.lossPercent} style={styles.recoveryRow}>\n            <Text style={styles.recoveryLoss}>-{row.lossPercent}% loss</Text>\n            <Text style={styles.recoveryNeed}>needs +{row.recoveryPercent}% to recover</Text>\n          </View>\n        ))}\n        <Pressable style={styles.decisionLink} onPress={() => router.push("/wealth-journey")}>\n          <Text style={styles.decisionLinkText}>Review Goal & Recovery Context</Text>\n        </Pressable>\n      </View>\n\n      <View style={styles.decisionCard}>\n        <Text style={styles.decisionCardTitle}>Decision path</Text>\n        <Text style={styles.body}>Explore → Test portfolio & goal impact → Understand risk/recovery → Compare → Save preferred scenario → Broker Action Plan.</Text>\n        <Pressable style={styles.decisionLink} onPress={() => router.push({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })}>\n          <Text style={styles.decisionLinkText}>Review Broker Action Plan</Text>\n        </Pressable>\n      </View>\n\n      <Text style={styles.brokerEvidenceLabel}>Broker Evidence</Text>\n      <ActiveUserBanner />'''
if needle not in s:
    raise SystemExit('ERROR — ActiveUserBanner anchor not found; refusing unsafe patch')
s=s.replace(needle, block, 1)
# add styles before final });
idx=s.rfind('\n});')
if idx < 0: raise SystemExit('ERROR — StyleSheet closing anchor not found')
styles='''\n  decisionHero: { backgroundColor: "#10243e", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },\n  decisionEyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1 },\n  decisionTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 5, marginBottom: 6 },\n  decisionActions: { flexDirection: "row", gap: 10, marginTop: 14 },\n  decisionPrimary: { flex: 1, backgroundColor: "#0891b2", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },\n  decisionPrimaryText: { color: "#ffffff", fontWeight: "900" },\n  decisionSecondary: { flex: 1, borderColor: "#67e8f9", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },\n  decisionSecondaryText: { color: "#67e8f9", fontWeight: "900" },\n  decisionCard: { backgroundColor: "#111c2e", borderColor: "#243b53", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },\n  decisionCardTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900", marginBottom: 7 },\n  decisionNote: { color: "#94a3b8", fontSize: 12, marginTop: 8 },\n  recoveryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopColor: "#243b53", borderTopWidth: 1, paddingVertical: 8 },\n  recoveryLoss: { color: "#fca5a5", fontWeight: "800" },\n  recoveryNeed: { color: "#fde68a", fontWeight: "800", textAlign: "right", flex: 1 },\n  decisionLink: { marginTop: 10, borderColor: "#475569", borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },\n  decisionLinkText: { color: "#cbd5e1", fontWeight: "800" },\n  brokerEvidenceLabel: { color: "#67e8f9", fontSize: 13, fontWeight: "900", letterSpacing: 1, marginTop: 4, marginBottom: 8 },'''
s=s[:idx]+styles+s[idx:]
p.write_text(s,encoding='utf-8')
print('UPDATED — mobile/app/(tabs)/trading.js → Coach G Decision Lab home')
PY

echo "PC-030M20AQ Coach G Decision Lab applied."
