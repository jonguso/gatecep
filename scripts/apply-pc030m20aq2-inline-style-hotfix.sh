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
if 'PC-030M20AQ2 Decision Lab Home' not in s:
    if 'coachGDecisionLabService' not in s:
        # app/(tabs)/trading.js -> ../../src/...
        imports = list(re.finditer(r'^import\s+.*?;\s*$', s, re.M))
        if not imports:
            raise SystemExit('ERROR — import block not found; refusing unsafe patch')
        pos = imports[-1].end()
        imp = '''\nimport {\n  buildDecisionLabBaseline,\n  buildRecoveryStressTable\n} from "../../src/features/trading/coachGDecisionLabService";'''
        s = s[:pos] + imp + s[pos:]

    component = r'''

/* PC-030M20AQ2 Decision Lab Home — read-only analytical entry point.
 * Uses inline styles deliberately so this patch does not depend on the host
 * file's StyleSheet.create formatting or closing syntax.
 */
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

  const ui = {
    hero: { backgroundColor: "#10243e", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
    eyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
    title: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 5, marginBottom: 6 },
    body: { color: "#cbd5e1", lineHeight: 20 },
    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    primary: { flex: 1, backgroundColor: "#0891b2", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
    primaryText: { color: "#ffffff", fontWeight: "900" },
    secondary: { flex: 1, borderColor: "#67e8f9", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
    secondaryText: { color: "#67e8f9", fontWeight: "900" },
    card: { backgroundColor: "#111c2e", borderColor: "#243b53", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
    cardTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900", marginBottom: 7 },
    note: { color: "#94a3b8", fontSize: 12, marginTop: 8 },
    recoveryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopColor: "#243b53", borderTopWidth: 1, paddingVertical: 8 },
    recoveryLoss: { color: "#fca5a5", fontWeight: "800" },
    recoveryNeed: { color: "#fde68a", fontWeight: "800", textAlign: "right", flex: 1 },
    link: { marginTop: 10, borderColor: "#475569", borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
    linkText: { color: "#cbd5e1", fontWeight: "800" },
    evidence: { color: "#67e8f9", fontSize: 13, fontWeight: "900", letterSpacing: 1, marginTop: 4, marginBottom: 8 }
  };

  return (
    <>
      <View style={ui.hero}>
        <Text style={ui.eyebrow}>COACH G DECISION LAB</Text>
        <Text style={ui.title}>What happens if I do this?</Text>
        <Text style={ui.body}>
          Test a hypothetical investment decision against your portfolio, goals,
          liquidity, concentration and recovery risk before you act. This does
          not place a REAL trade or change your portfolio.
        </Text>

        <View style={ui.actions}>
          <Pressable
            style={ui.primary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "BUY", decisionLab: "1" }
              })
            }
          >
            <Text style={ui.primaryText}>Simulate a Buy</Text>
          </Pressable>

          <Pressable
            style={ui.secondary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "SELL", decisionLab: "1" }
              })
            }
          >
            <Text style={ui.secondaryText}>Simulate a Sell</Text>
          </Pressable>
        </View>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Current Decision Baseline</Text>
        <Text style={ui.body}>
          Holdings: {baseline.holdingsCount} • Portfolio evidence: KES {money(baseline.holdingsValue)}
        </Text>
        <Text style={ui.body}>Available cash: KES {money(baseline.availableCash)}</Text>
        <Text style={ui.body}>
          Largest position: {baseline.largestHolding || "N/A"}
          {baseline.largestHolding ? ` • ${baseline.largestHoldingWeight}%` : ""}
        </Text>
        <Text style={ui.note}>
          Detailed scenarios compare CURRENT vs PROJECTED. Projected values never overwrite REAL holdings.
        </Text>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Risk & Recovery — what “Aggressive” means</Text>
        <Text style={ui.body}>
          Coach G must explain risk from evidence such as concentration, liquidity,
          goal impact and downside. Recovery percentages are mathematical stress
          tests, not return forecasts.
        </Text>
        {recoveryStress.map((row) => (
          <View key={row.lossPercent} style={ui.recoveryRow}>
            <Text style={ui.recoveryLoss}>-{row.lossPercent}% loss</Text>
            <Text style={ui.recoveryNeed}>needs +{row.recoveryPercent}% to recover</Text>
          </View>
        ))}
        <Pressable style={ui.link} onPress={() => router.push("/wealth-journey")}>
          <Text style={ui.linkText}>Review Goal & Recovery Context</Text>
        </Pressable>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Decision path</Text>
        <Text style={ui.body}>
          Explore → test portfolio and goal impact → understand risk and recovery → compare → save preferred scenario → Broker Action Plan.
        </Text>
        <Pressable
          style={ui.link}
          onPress={() =>
            router.push({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })
          }
        >
          <Text style={ui.linkText}>Review Broker Action Plan</Text>
        </Pressable>
      </View>

      <Text style={ui.evidence}>Broker Evidence</Text>
    </>
  );
}
'''
    anchor = re.search(r'\nexport default function Trading\s*\(', s)
    if not anchor:
        raise SystemExit('ERROR — Trading component declaration not found; refusing unsafe patch')
    s = s[:anchor.start()] + component + s[anchor.start():]

    banner = re.search(r'^(\s*)<ActiveUserBanner\s*/>', s, re.M)
    if not banner:
        raise SystemExit('ERROR — ActiveUserBanner render anchor not found; refusing unsafe patch')
    indent = banner.group(1)
    s = s[:banner.start()] + f'{indent}<DecisionLabHome data={{data}} />\n\n' + s[banner.start():]

    s = s.replace('<Text style={styles.title}>Trading</Text>', '<Text style={styles.title}>Coach G Decision Lab</Text>', 1)
    trading.write_text(s, encoding='utf-8')
    print('UPDATED — mobile/app/(tabs)/trading.js with inline-style Decision Lab injection')
else:
    print('SKIP — trading.js already contains M20AQ2')

# Make /trade honor BUY/SELL passed from Decision Lab.
t = trade.read_text(encoding='utf-8')
if 'PC-030M20AQ1 requestedSide' not in t and 'PC-030M20AQ2 requestedSide' not in t:
    m = re.search(r'const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams\(\);', t)
    if not m:
        raise SystemExit('ERROR — trade route params anchor not found; refusing unsafe patch')
    fields = m.group(1)
    newfields = fields.rstrip()
    if newfields and not newfields.rstrip().endswith(','):
        newfields += ','
    newfields += ' side: requestedSide /* PC-030M20AQ2 requestedSide */'
    t = t[:m.start()] + f'const {{{newfields}}} = useLocalSearchParams();' + t[m.end():]

    side_state = re.search(r'^(\s*)const \[side, setSide\] = useState\("BUY"\);', t, re.M)
    if not side_state:
        raise SystemExit('ERROR — trade side state anchor not found; refusing unsafe patch')
    effect = r'''

  React.useEffect(() => {
    const normalizedRequestedSide = String(requestedSide || "").toUpperCase();
    if (normalizedRequestedSide === "BUY" || normalizedRequestedSide === "SELL") {
      setSide(normalizedRequestedSide);
    }
  }, [requestedSide]);
'''
    t = t[:side_state.end()] + effect + t[side_state.end():]
    trade.write_text(t, encoding='utf-8')
    print('UPDATED — mobile/app/trade.js now honors Decision Lab BUY/SELL route intent')
else:
    print('SKIP — trade.js already contains Decision Lab requestedSide support')
PY

echo "PC-030M20AQ2 applied successfully."
