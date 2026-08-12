import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  userGetItem,
  userSetItem,
  userRemoveItem
} from "../src/auth/userStorage";
import { router } from "expo-router";

const COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6"
];

export default function PortfolioAnalysis() {
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSector, setSelectedSector] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [risk, setRisk] = useState("balanced");
  const [goal, setGoal] = useState("balanced_growth");
  const [amount, setAmount] = useState("10000");
  const [investmentPlan, setInvestmentPlan] = useState(null);

  useEffect(() => {
    loadPortfolio();
  }, []);

async function loadPortfolio() {
  try {
    setLoading(true);

    const portfolioData = await loadUnifiedPortfolio();
    const savedPortfolio = portfolioData?.holdings || [];

    const brokerRaw =
      await userGetItem("defaultBrokerProfile");

    setBrokerProfile(
      brokerRaw
        ? JSON.parse(brokerRaw)
        : null
    );
  } finally {
    setLoading(false);
  }
}

  const sectorRows = useMemo(() => {
    const grouped = {};

    for (const raw of heatmap) {
      const sector = raw.sector || "Unknown";

      const value = Number(
        raw.marketValue ||
          raw.value ||
          0
      );

      const profitLoss = Number(
        raw.profitLoss ||
          raw.unrealizedPnL ||
          raw.pnl ||
          0
      );

      if (!grouped[sector]) {
        grouped[sector] = {
          sector,
          totalValue: 0,
          totalProfitLoss: 0,
          securities: []
        };
      }

      grouped[sector].totalValue += value;
      grouped[sector].totalProfitLoss += profitLoss;

      grouped[sector].securities.push({
        ...raw,
        value,
        marketValue: value,
        profitLoss
      });
    }

    const sectorTotal = Object.values(grouped).reduce(
      (sum, item) => sum + Number(item.totalValue || 0),
      0
    );

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        weight:
          sectorTotal > 0
            ? (Number(item.totalValue || 0) / sectorTotal) * 100
            : 0
      }))
      .sort(
        (a, b) =>
          Number(b.totalValue || 0) -
          Number(a.totalValue || 0)
      );
  }, [heatmap]);

  const portfolioValue = heatmap.reduce(
    (sum, item) =>
      sum +
      Number(
        item.marketValue ||
          item.value ||
          0
      ),
    0
  );

  const profitLoss = heatmap.reduce(
    (sum, item) =>
      sum +
      Number(
        item.profitLoss ||
          item.unrealizedPnL ||
          item.pnl ||
          0
      ),
    0
  );

  const profitLossPct =
    portfolioValue > 0
      ? (profitLoss / portfolioValue) * 100
      : 0;

  const availableCash = 0;
  const netWorth = portfolioValue + availableCash;

  const largestSector = sectorRows[0] || null;

  const riskRating =
    Number(largestSector?.weight || 0) >= 40
      ? "HIGH_RISK"
      : Number(largestSector?.weight || 0) >= 30
      ? "MODERATE"
      : "BALANCED";

  const diversification =
    sectorRows.length >= 5
      ? "GOOD"
      : sectorRows.length >= 3
      ? "MODERATE"
      : "CONCENTRATED";

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      40 +
        Math.min(sectorRows.length * 5, 30) +
        (profitLoss >= 0 ? 15 : -5) -
        (riskRating === "HIGH_RISK" ? 15 : 5)
    )
  );

  function runSimulation() {
    const investAmount = Number(amount || 0);

    setInvestmentPlan({
      projectedPortfolioValue: portfolioValue + investAmount,
      riskDirection:
        risk === "aggressive"
          ? "Higher growth potential, but higher volatility."
          : risk === "conservative"
          ? "More defensive allocation with lower drawdown risk."
          : "Balanced growth and risk control.",
     recommendations: [
  {
    symbol: "ETF",
    name: "Diversifier",
    sector: "ETF",
    suggestedAmount: investAmount * 0.4,
    reason:
      "Adds diversification and reduces dependence on one sector."
  },
  {
    symbol: "SCOM",
    name: "Safaricom",
    sector: "Telecom",
    suggestedAmount: investAmount * 0.3,
    reason:
      "Adds defensive telecom exposure with broad market relevance."
  },
  {
    symbol: "KCB",
    name: "KCB Group",
    sector: "Banking",
    suggestedAmount: investAmount * 0.3,
    reason:
      "Adds banking exposure, but should be limited if banking is already overweight."
  }
]
    });

    setShowResults(true);
  }

  async function saveHistory() {
    const recommendation = {
      id: `REC-${Date.now()}`,
      date: new Date().toISOString(),
      type: "PORTFOLIO_ANALYSIS",
      score: healthScore,
      rating: riskRating,
      status: "NEW",
      summary:
        `Largest exposure is ${largestSector?.sector || "N/A"} at ` +
        `${number(largestSector?.weight)}%.`,
      actions: [
        "Review sector concentration.",
        "Use simulation before adding new money.",
        "Strengthen underrepresented sectors."
      ]
    };

    const raw = await userGetItem("RecommendationHistory");
    const history = raw ? JSON.parse(raw) : [];

    await userSetItem(
      "RecommendationHistory",
      JSON.stringify([recommendation, ...history])
    );

    router.push("/recommendation-history");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingText}>Loading Coach G analysis...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Coach G Portfolio Analysis</Text>

      <Text style={styles.subtitle}>
        Advisory only. Gatecep will not execute trades.
      </Text>

      <View style={styles.linkedCard}>
        <Text style={styles.cardTitle}>Portfolio Source</Text>
        <Text style={styles.body}>
          Broker: {brokerProfile?.broker || "Manual Entry"}
        </Text>
        <Text style={styles.body}>
          Holdings Loaded: {heatmap.length}
        </Text>
      </View>

      {sectorRows.length === 0 ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            No holdings found. Add holdings from Manual Portfolio Entry first.
          </Text>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Metric
          label="Portfolio Value"
          value={`KES ${money(portfolioValue)}`}
          color="#67e8f9"
        />

        <Metric
          label="Available Cash"
          value={`KES ${money(availableCash)}`}
          color="#86efac"
        />

        <Metric
          label="Net Worth"
          value={`KES ${money(netWorth)}`}
          color="white"
        />

        <Metric
          label="Net Gain/Loss"
          value={`KES ${money(profitLoss)} (${number(profitLossPct)}%)`}
          color={profitLoss >= 0 ? "#86efac" : "#fca5a5"}
        />

        <Metric
          label="Risk"
          value={riskRating}
          color="#fca5a5"
        />

        <Metric
          label="Sectors"
          value={String(sectorRows.length)}
          color="#67e8f9"
        />
      </View>

      <View style={styles.grid}>
        <SmallCard
          label="Diversification"
          value={diversification}
          color="#67e8f9"
        />

        <SmallCard
          label="Largest Sector"
          value={
            largestSector
              ? `${largestSector.sector} (${number(largestSector.weight)}%)`
              : "N/A"
          }
          color="#c084fc"
        />
      </View>

      <View style={styles.coachCard}>
        <Text style={styles.cardTitle}>Coach G Summary</Text>

        <Text style={styles.body}>
          {riskRating === "HIGH_RISK"
            ? "Portfolio concentration risk detected. Future investments should improve diversification."
            : "Portfolio appears reasonably diversified."}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Sector Allocation</Text>

      <View style={styles.chartCard}>
        <SectorDonut
          data={sectorRows}
          total={portfolioValue}
          onSelect={setSelectedSector}
        />
      </View>

      <View style={styles.card}>
        {sectorRows.map((sector, index) => (
          <Pressable
            key={sector.sector}
            style={styles.sectorRow}
            onPress={() => setSelectedSector(sector)}
          >
            <View style={styles.legendWrap}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: COLORS[index % COLORS.length] }
                ]}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={
                    sector.totalProfitLoss >= 0
                      ? styles.greenText
                      : styles.redText
                  }
                >
                  {sector.totalProfitLoss >= 0 ? "▲" : "▼"} {sector.sector}
                </Text>

                <Text style={styles.muted}>
                  {sector.securities.length} securities
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.white}>KES {money(sector.totalValue)}</Text>
              <Text style={styles.muted}>{number(sector.weight)}%</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.recommendCard}>
        <Text style={styles.cardTitle}>Coach G Recommendations</Text>

        <Bullet
          text={`Largest exposure is ${
            largestSector?.sector || "N/A"
          }. Avoid adding more unless it supports your goal.`}
        />

        <Bullet text="Use new money to strengthen underrepresented sectors." />

        <Bullet text="Open simulator to test how new capital changes allocation." />
      </View>

      <View style={styles.healthCard}>
        <Text style={styles.muted}>Portfolio Health</Text>
        <Text style={styles.health}>{healthScore}/100</Text>
        <Text style={styles.muted}>Coach G Score</Text>
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => setShowSimulator(true)}
      >
        <Text style={styles.primaryText}>
          Simulate Coach G Recommendations
        </Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={saveHistory}>
        <Text style={styles.secondaryText}>Save Recommendation History</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/dashboard")}
      >
        <Text style={styles.secondaryText}>Back to Checklist</Text>
      </Pressable>

      <SectorModal
        sector={selectedSector}
        onClose={() => setSelectedSector(null)}
      />

      <SimulatorModal
   visible={showSimulator}
   onClose={() => {
      setShowSimulator(false);
      setShowResults(false);
   }}
   goal={goal}
   setGoal={setGoal}
   risk={risk}
   setRisk={setRisk}
   amount={amount}
   setAmount={setAmount}
   showResults={showResults}
   setShowResults={setShowResults}
   investmentPlan={investmentPlan}
   runSimulation={runSimulation}
/>
    </ScrollView>
  );
}

function SectorModal({ sector, onClose }) {
  if (!sector) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{sector.sector}</Text>

          <Text style={styles.muted}>
            {sector.securities.length} securities • KES {money(sector.totalValue)}
          </Text>

          <ScrollView style={{ marginTop: 14 }}>
            {sector.securities.map((sec) => (
              <View
                key={`${sec.symbol}-${sec.quantity}-${sec.averagePrice}`}
                style={styles.holdingCard}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.holdingSymbol}>
                    {sec.symbol || "Security"}
                  </Text>

                  <Text
                    style={
                      Number(sec.profitLoss || 0) >= 0
                        ? styles.greenText
                        : styles.redText
                    }
                  >
                    KES {money(sec.profitLoss)}
                  </Text>
                </View>

                <View style={styles.infoGrid}>
                  <Info label="Quantity" value={Number(sec.quantity || 0).toLocaleString()} />
                  <Info label="Avg Price" value={`KES ${money(sec.averagePrice)}`} />
                  <Info label="Market Price" value={`KES ${money(sec.marketPrice)}`} />
                  <Info label="Value" value={`KES ${money(sec.marketValue || sec.value)}`} />
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.primary} onPress={onClose}>
            <Text style={styles.primaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SimulatorModal({
  visible,
  onClose,
  goal,
  setGoal,
  risk,
  setRisk,
  amount,
  setAmount,
  showResults,
  setShowResults,
  investmentPlan,
  runSimulation
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
  <Text style={styles.modalTitle}>Coach G Investment Simulator</Text>

  <Pressable onPress={onClose} style={styles.closeButton}>
    <Text style={styles.closeButtonText}>×</Text>
  </Pressable>
</View>


          <Text style={styles.body}>
            Test how new money could improve your portfolio.
          </Text>

          <SelectRow
            label="Investment Goal"
            value={goal}
            setValue={setGoal}
            options={[
              ["wealth_growth", "Wealth Growth"],
              ["dividend", "Dividend Income"],
              ["balanced_growth", "Balanced Growth"],
              ["preservation", "Capital Preservation"]
            ]}
          />

          <SelectRow
            label="Scenario"
            value={risk}
            setValue={setRisk}
            options={[
              ["conservative", "Conservative"],
              ["balanced", "Balanced"],
              ["aggressive", "Aggressive"]
            ]}
          />

          <Text style={styles.inputLabel}>Amount to Invest</Text>

<View style={styles.amountRow}>
  {["5000", "10000", "25000", "50000", "100000"].map((v) => (
    <Pressable
      key={v}
      style={[
        styles.amountChip,
        amount === v && styles.amountChipActive
      ]}
      onPress={() => {
        setAmount(v);
        setShowResults(false);
      }}
    >
      <Text
        style={[
          styles.amountChipText,
          amount === v && styles.amountChipTextActive
        ]}
      >
        {Number(v).toLocaleString()}
      </Text>
    </Pressable>
  ))}
</View>

          <Pressable style={styles.primary} onPress={runSimulation}>
            <Text style={styles.primaryText}>View Simulation Results</Text>
          </Pressable>

          {showResults && (
            <View style={styles.simResult}>
              <Text style={styles.cardTitle}>Projected Result</Text>

              <Info
                label="Projected Value"
                value={`KES ${money(investmentPlan?.projectedPortfolioValue)}`}
              />

              <Info
                label="Risk Direction"
                value={investmentPlan?.riskDirection}
              />

              <Text style={styles.cardTitle}>Buy Recommendations</Text>

              {(investmentPlan?.recommendations || []).map((item) => (
                <View key={item.symbol} style={styles.recommendItem}>
                 <Text style={styles.greenText}>{item.symbol}</Text>

<Text style={styles.muted}>
   {item.name} • {item.sector}
</Text>

<Text style={styles.white}>
   Allocate KES {money(item.suggestedAmount)}
</Text>

<Text style={styles.reasonText}>
   {item.reason}
</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Close Simulator</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SectorDonut({ data, total, onSelect }) {
  const size = 290;
  const center = size / 2;
  const radius = 112;
  const innerRadius = 63;

  let cumulative = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <G x={center} y={center}>
          {data.map((item, index) => {
            const startAngle = cumulative;
            const angle = (Number(item.weight || 0) / 100) * 360;
            const endAngle = cumulative + angle;

            cumulative += angle;

            const path = describeArc(
              0,
              0,
              radius,
              innerRadius,
              startAngle,
              endAngle
            );

            const labelPoint = polarToCartesian(
              0,
              0,
              radius + 18,
              startAngle + angle / 2
            );

            return (
              <G key={item.sector} onPress={() => onSelect(item)}>
                <Path
                  d={path}
                  fill={COLORS[index % COLORS.length]}
                  stroke="#020617"
                  strokeWidth={2}
                />

                {item.weight >= 3 && (
                  <SvgText
                    x={labelPoint.x}
                    y={labelPoint.y}
                    fill="white"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {number(item.weight)}%
                  </SvgText>
                )}
              </G>
            );
          })}

          <Circle cx={0} cy={0} r={innerRadius} fill="#020617" />

          <SvgText
            x={0}
            y={-10}
            fill="#94a3b8"
            fontSize="11"
            textAnchor="middle"
          >
            Total Value
          </SvgText>

          <SvgText
            x={0}
            y={18}
            fill="white"
            fontSize="13"
            fontWeight="900"
            textAnchor="middle"
          >
            KES {money(total)}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

function Metric({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function SmallCard({ label, value, color }) {
  return (
    <View style={styles.smallCard}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.smallValue, { color }]}>{value}</Text>
    </View>
  );
}

function Bullet({ text }) {
  return <Text style={styles.bullet}>• {text}</Text>;
}

function Info({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.white}>{String(value || "N/A")}</Text>
    </View>
  );
}

function SelectRow({ label, value, setValue, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(([v]) => v === value)?.[1] || value;

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>

      <Pressable
        style={styles.dropdown}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.dropdownText}>{selected}</Text>
        <Text style={styles.dropdownArrow}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open &&
        options.map(([optionValue, optionLabel]) => (
          <Pressable
            key={optionValue}
            onPress={() => {
              setValue(optionValue);
              setOpen(false);
            }}
            style={styles.dropdownItem}
          >
            <Text style={styles.dropdownItemText}>{optionLabel}</Text>
          </Pressable>
        ))}
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function number(value) {
  return Number(value || 0).toFixed(2);
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians)
  };
}

function describeArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z"
  ].join(" ");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 18, paddingTop: 60, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: { color: "#cbd5e1", marginTop: 14 },
  title: { color: "white", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 21 },
  linkedCard: {
    marginTop: 18,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16
  },
  summaryCard: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 12
  },
  muted: { color: "#94a3b8", fontSize: 12 },
  metricValue: { marginTop: 6, fontWeight: "900", fontSize: 16 },
  grid: { flexDirection: "row", gap: 12, marginTop: 14 },
  smallCard: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  smallValue: { marginTop: 8, fontWeight: "900" },
  coachCard: {
    marginTop: 16,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  cardTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 16 },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  sectionTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 28
  },
  chartCard: {
    marginTop: 14,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center"
  },
  donutWrap: { alignItems: "center", justifyContent: "center" },
  card: {
    marginTop: 14,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14
  },
  sectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 13
  },
  legendWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  legendDot: { width: 11, height: 11, borderRadius: 8 },
  white: { color: "white", fontWeight: "900" },
  greenText: { color: "#86efac", fontWeight: "900" },
  redText: { color: "#fca5a5", fontWeight: "900" },
  recommendCard: {
    marginTop: 18,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16
  },
  bullet: { color: "#cbd5e1", marginTop: 10, lineHeight: 20 },
  healthCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18
  },
  health: {
    color: "#67e8f9",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6
  },
  primary: {
    marginTop: 18,
    backgroundColor: "#9333ea",
    borderRadius: 18,
    padding: 16
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondary: {
    marginTop: 12,
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 15
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  errorCard: {
    marginTop: 16,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  errorText: { color: "#fca5a5", lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.75)",
    justifyContent: "center",
    padding: 18
  },
  modal: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    maxHeight: "88%"
  },
  modalTitle: { color: "white", fontSize: 24, fontWeight: "900" },
  holdingCard: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 12
  },

modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center"
},

closeButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#1e293b",
  alignItems: "center",
  justifyContent: "center"
},

closeButtonText: {
  color: "white",
  fontSize: 24,
  fontWeight: "900",
  lineHeight: 28
},

  holdingSymbol: { color: "white", fontWeight: "900", fontSize: 18 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  infoBox: {
    width: "47%",
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 10
  },
  inputLabel: { color: "#94a3b8", fontSize: 13, marginTop: 16 },
  input: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    color: "white",
    marginTop: 8
  },
  optionGrid: { gap: 9, marginTop: 10 },
  optionButton: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  optionButtonActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.18)"
  },
  optionText: { color: "#cbd5e1", fontWeight: "800" },
  optionTextActive: { color: "#c084fc" },
  simResult: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16
  },
  recommendItem: {
    marginTop: 12,
    backgroundColor: "rgba(34,197,94,.10)",
    borderColor: "rgba(34,197,94,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
dropdown: {
  marginTop:8,
  backgroundColor:"#0f172a",
  borderWidth:1,
  borderColor:"#334155",
  borderRadius:16,
  padding:15,
  flexDirection:"row",
  justifyContent:"space-between",
  alignItems:"center"
},

dropdownText:{
  color:"white",
  fontWeight:"900"
},

dropdownArrow:{
  color:"#67e8f9"
},

dropdownItem:{
  marginTop:6,
  padding:14,
  borderRadius:12,
  backgroundColor:"#0f172a",
  borderWidth:1,
  borderColor:"#1e293b"
},

dropdownItemText:{
  color:"#cbd5e1"
},

amountRow:{
  flexDirection:"row",
  flexWrap:"wrap",
  gap:8,
  marginTop:10
},

amountChip:{
  paddingVertical:10,
  paddingHorizontal:14,
  borderRadius:999,
  backgroundColor:"#1e293b"
},

amountChipActive:{
  backgroundColor:"rgba(147,51,234,.25)",
  borderColor:"#9333ea",
  borderWidth:1
},

amountChipText:{
  color:"#cbd5e1",
  fontWeight:"800"
},

amountChipTextActive:{
  color:"#c084fc"
},

reasonText:{
  color:"#cbd5e1",
  marginTop:8,
  lineHeight:20
}
});