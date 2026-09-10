#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"
TRADE="$ROOT/mobile/app/trade.js"
SERVICE="$ROOT/mobile/src/features/trading/coachGDecisionLabService.js"

[[ -f "$TRADING" ]] || { echo "ERROR — expected trading route not found: $TRADING"; exit 1; }
[[ -f "$TRADE" ]] || { echo "ERROR — expected trade route not found: $TRADE"; exit 1; }
[[ -f "$SERVICE" ]] || { echo "ERROR — Decision Lab service missing: $SERVICE"; exit 1; }

python - "$TRADING" "$TRADE" <<'PY'
from pathlib import Path
import re, sys
trading = Path(sys.argv[1])
trade = Path(sys.argv[2])

s = trading.read_text(encoding='utf-8')
if 'PC-030M20AQ1 Decision Lab Home' not in s:
    # import service without relying on cash/data anchors
    if 'coachGDecisionLabService' not in s:
        m = re.search(r'import\s+\{[^;]*\}\s+from\s+["\']expo-router["\'];', s, re.S)
        if not m:
            raise SystemExit('ERROR — expo-router import not found; refusing unsafe patch')
        imp = m.group(0) + '''\nimport {\n  buildDecisionLabBaseline,\n  buildRecoveryStressTable\n} from "../../src/features/trading/coachGDecisionLabService";'''
        s = s[:m.start()] + imp + s[m.end():]

    component = r'''

/* PC-030M20AQ1 Decision Lab Home — read-only analytical entry point. */
function DecisionLabHome({ data }) {
  const holdings =
    (Array.isArray(data?.portfolio) && data.portfolio) ||
    (Array.isArray(data?.holdings) && data.holdings) ||
    (Array.isArray(data?.brokerPortfolio) && data.brokerPortfolio) ||
    [];

  const availableCash = Number(
    data?.cash ??
    data?.availableCash ??
    data?.cashBalance ??
    data?.broker?.availableCash ??
    0
  );

  const baseline = buildDecisionLabBaseline({ holdings, availableCash });
  const recoveryStress = buildRecoveryStressTable();

  return (
    <>
      <View style={styles.decisionHero}>
        <Text style={styles.decisionEyebrow}>COACH G DECISION LAB</Text>
        <Text style={styles.decisionTitle}>What happens if I do this?</Text>
        <Text style={styles.body}>
          Test a hypothetical investment decision against your portfolio, goals,
          liquidity, concentration and recovery risk before you act. This does
          not place a REAL trade or change your portfolio.
        </Text>

        <View style={styles.decisionActions}>
          <Pressable
            style={styles.decisionPrimary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "BUY", decisionLab: "1" }
              })
            }
          >
            <Text style={styles.decisionPrimaryText}>Simulate a Buy</Text>
          </Pressable>

          <Pressable
            style={styles.decisionSecondary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "SELL", decisionLab: "1" }
              })
            }
          >
            <Text style={styles.decisionSecondaryText}>Simulate a Sell</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.decisionCard}>
        <Text style={styles.decisionCardTitle}>Current Decision Baseline</Text>
        <Text style={styles.body}>
          Holdings: {baseline.holdingsCount} • Portfolio evidence: KES {money(baseline.holdingsValue)}
        </Text>
        <Text style={styles.body}>Available cash: KES {money(baseline.availableCash)}</Text>
        <Text style={styles.body}>
          Largest position: {baseline.largestHolding || "N/A"}
          {baseline.largestHolding ? ` • ${baseline.largestHoldingWeight}%` : ""}
        </Text>
        <Text style={styles.decisionNote}>
          Detailed scenarios compare CURRENT vs PROJECTED. Projected values never overwrite REAL holdings.
        </Text>
      </View>

      <View style={styles.decisionCard}>
        <Text style={styles.decisionCardTitle}>Risk & Recovery — what “Aggressive” means</Text>
        <Text style={styles.body}>
          Coach G must explain risk from evidence such as concentration, liquidity,
          goal impact and downside. Recovery percentages are mathematical stress
          tests, not return forecasts.
        </Text>
        {recoveryStress.map((row) => (
          <View key={row.lossPercent} style={styles.recoveryRow}>
            <Text style={styles.recoveryLoss}>-{row.lossPercent}% loss</Text>
            <Text style={styles.recoveryNeed}>needs +{row.recoveryPercent}% to recover</Text>
          </View>
        ))}
        <Pressable style={styles.decisionLink} onPress={() => router.push("/wealth-journey")}>
          <Text style={styles.decisionLinkText}>Review Goal & Recovery Context</Text>
        </Pressable>
      </View>

      <View style={styles.decisionCard}>
        <Text style={styles.decisionCardTitle}>Decision path</Text>
        <Text style={styles.body}>
          Explore → test portfolio and goal impact → understand risk and recovery → compare → save preferred scenario → Broker Action Plan.
        </Text>
        <Pressable
          style={styles.decisionLink}
          onPress={() =>
            router.push({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })
          }
        >
          <Text style={styles.decisionLinkText}>Review Broker Action Plan</Text>
        </Pressable>
      </View>

      <Text style={styles.brokerEvidenceLabel}>Broker Evidence</Text>
    </>
  );
}
'''
    anchor = re.search(r'\nexport default function Trading\s*\(', s)
    if not anchor:
        raise SystemExit('ERROR — Trading component declaration not found; refusing unsafe patch')
    s = s[:anchor.start()] + component + s[anchor.start():]

    # Insert the Decision Lab immediately before the existing ActiveUserBanner.
    banner = re.search(r'^(\s*)<ActiveUserBanner\s*/>', s, re.M)
    if not banner:
        raise SystemExit('ERROR — ActiveUserBanner render anchor not found; refusing unsafe patch')
    indent = banner.group(1)
    s = s[:banner.start()] + f'{indent}<DecisionLabHome data={{data}} />\n\n' + s[banner.start():]

    # Investor-facing title if the old exact title is still present. Do not require it.
    s = s.replace('<Text style={styles.title}>Trading</Text>', '<Text style={styles.title}>Coach G Decision Lab</Text>', 1)

    # Add styles robustly before the StyleSheet closing object.
    marker = 'decisionHero:'
    if marker not in s:
        idx = s.rfind('\n});')
        if idx < 0:
            raise SystemExit('ERROR — StyleSheet closing anchor not found; refusing unsafe patch')
        styles = r'''
  decisionHero: { backgroundColor: "#10243e", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  decisionEyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  decisionTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 5, marginBottom: 6 },
  decisionActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  decisionPrimary: { flex: 1, backgroundColor: "#0891b2", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
  decisionPrimaryText: { color: "#ffffff", fontWeight: "900" },
  decisionSecondary: { flex: 1, borderColor: "#67e8f9", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
  decisionSecondaryText: { color: "#67e8f9", fontWeight: "900" },
  decisionCard: { backgroundColor: "#111c2e", borderColor: "#243b53", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  decisionCardTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900", marginBottom: 7 },
  decisionNote: { color: "#94a3b8", fontSize: 12, marginTop: 8 },
  recoveryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopColor: "#243b53", borderTopWidth: 1, paddingVertical: 8 },
  recoveryLoss: { color: "#fca5a5", fontWeight: "800" },
  recoveryNeed: { color: "#fde68a", fontWeight: "800", textAlign: "right", flex: 1 },
  decisionLink: { marginTop: 10, borderColor: "#475569", borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  decisionLinkText: { color: "#cbd5e1", fontWeight: "800" },
  brokerEvidenceLabel: { color: "#67e8f9", fontSize: 13, fontWeight: "900", letterSpacing: 1, marginTop: 4, marginBottom: 8 },
'''
        s = s[:idx] + styles + s[idx:]

    trading.write_text(s, encoding='utf-8')
    print('UPDATED — mobile/app/(tabs)/trading.js with route-safe Decision Lab injection')
else:
    print('SKIP — trading.js already contains M20AQ1')

# Make /trade honor BUY/SELL passed from Decision Lab without altering its calculation engine.
t = trade.read_text(encoding='utf-8')
if 'PC-030M20AQ1 requestedSide' not in t:
    # Extend useLocalSearchParams destructuring while preserving any existing fields.
    m = re.search(r'const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams\(\);', t)
    if not m:
        raise SystemExit('ERROR — trade route params anchor not found; refusing unsafe patch')
    fields = m.group(1)
    if 'requestedSide' not in fields:
        newfields = fields.rstrip()
        if newfields and not newfields.rstrip().endswith(','):
            newfields += ','
        newfields += ' side: requestedSide /* PC-030M20AQ1 requestedSide */'
        t = t[:m.start()] + f'const {{{newfields}}} = useLocalSearchParams();' + t[m.end():]

    # Insert sync effect after side state declaration.
    side_state = re.search(r'^(\s*)const \[side, setSide\] = useState\("BUY"\);', t, re.M)
    if not side_state:
        raise SystemExit('ERROR — trade side state anchor not found; refusing unsafe patch')
    insert_at = side_state.end()
    effect = r'''

  React.useEffect(() => {
    const normalizedRequestedSide = String(requestedSide || "").toUpperCase();
    if (normalizedRequestedSide === "BUY" || normalizedRequestedSide === "SELL") {
      setSide(normalizedRequestedSide);
    }
  }, [requestedSide]);
'''
    t = t[:insert_at] + effect + t[insert_at:]
    trade.write_text(t, encoding='utf-8')
    print('UPDATED — mobile/app/trade.js now honors Decision Lab BUY/SELL route intent')
else:
    print('SKIP — trade.js already contains M20AQ1 requestedSide support')
PY

echo "PC-030M20AQ1 applied successfully."
