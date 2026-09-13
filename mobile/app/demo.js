import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  TextInput
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { router } from "expo-router";

const COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444"
];

export default function Demo() {
  const [amount, setAmount] = useState("100000");
  const [risk, setRisk] = useState("balanced");
  const [goal, setGoal] = useState("growth");

  const allocation = useMemo(() => {
    if (risk === "conservative") {
      return [
        ["Cash Reserve", 25],
        ["Dividend Stocks", 30],
        ["ETF / Diversifier", 25],
        ["Banking", 15],
        ["Growth Stocks", 5]
      ];
    }

    if (risk === "aggressive") {
      return [
        ["Growth Stocks", 40],
        ["Banking", 25],
        ["ETF / Diversifier", 20],
        ["Dividend Stocks", 10],
        ["Cash Reserve", 5]
      ];
    }

    return [
      ["ETF / Diversifier", 30],
      ["Banking", 25],
      ["Dividend Stocks", 25],
      ["Growth Stocks", 10],
      ["Cash Reserve", 10]
    ];
  }, [risk, goal]);

  const total = Number(amount || 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Coach G Demo</Text>

      <Text style={styles.subtitle}>
        Explore how amount, risk, and goals can change a sample portfolio before opening a broker account.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Demo Amount</Text>

        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#64748b"
        />

        <View style={styles.quickRow}>
          {["10000", "100000", "500000"].map((value) => (
            <Pressable
              key={value}
              style={styles.quick}
              onPress={() => setAmount(value)}
            >
              <Text style={styles.quickText}>
                KES {Number(value).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <OptionGroup
        title="Risk Style"
        value={risk}
        setValue={setRisk}
        options={[
          ["conservative", "Conservative"],
          ["balanced", "Balanced"],
          ["aggressive", "Aggressive"]
        ]}
      />

      <OptionGroup
        title="Investment Goal"
        value={goal}
        setValue={setGoal}
        options={[
          ["income", "Income"],
          ["growth", "Growth"],
          ["retirement", "Long Term"],
          ["education", "Education"]
        ]}
      />

      <View style={styles.chartCard}>
        <AllocationDonut allocation={allocation} total={total} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Demo Allocation</Text>

        {allocation.map(([name, pct], index) => (
          <View key={name} style={styles.row}>
            <View style={styles.legendWrap}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: COLORS[index % COLORS.length] }
                ]}
              />
              <Text style={styles.white}>{name}</Text>
            </View>

            <Text style={styles.value}>
              {pct}% • KES {money((total * pct) / 100)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.coachCard}>
        <Text style={styles.cardTitle}>Coach G Explains</Text>

        <Text style={styles.body}>
          {risk === "conservative"
            ? "Conservative portfolios usually protect more cash and use steadier dividend positions, but growth may be slower."
            : risk === "aggressive"
            ? "Aggressive portfolios can grow faster, but they may also fall more during market weakness."
            : "Balanced portfolios spread money across growth, income, and diversification."}
        </Text>
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.push("/brokers")}
      >
        <Text style={styles.primaryText}>Learn How to Open Broker Account</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/investor-home")}
      >
        <Text style={styles.secondaryText}>Back to Investor Home</Text>
      </Pressable>
    </ScrollView>
  );
}

function OptionGroup({ title, value, setValue, options }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>

      <View style={styles.optionGrid}>
        {options.map(([optionValue, label]) => {
          const active = value === optionValue;

          return (
            <Pressable
              key={optionValue}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setValue(optionValue)}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AllocationDonut({ allocation, total }) {
  const size = 280;
  const center = size / 2;
  const outer = 108;
  const inner = 62;
  let cumulative = 0;

  return (
    <Svg width={size} height={size}>
      <G x={center} y={center}>
        {allocation.map(([name, pct], index) => {
          const start = cumulative;
          const end = cumulative + pct * 3.6;
          cumulative = end;

          const path = describeArc(0, 0, outer, inner, start, end);
          const labelPoint = polarToCartesian(0, 0, outer + 18, start + (end - start) / 2);

          return (
            <G key={name}>
              <Path
                d={path}
                fill={COLORS[index % COLORS.length]}
                stroke="#020617"
                strokeWidth={2}
              />

              <SvgText
                x={labelPoint.x}
                y={labelPoint.y}
                fill="white"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                {pct}%
              </SvgText>
            </G>
          );
        })}

        <Circle cx={0} cy={0} r={inner} fill="#020617" />

        <SvgText x={0} y={-8} fill="#94a3b8" fontSize="11" textAnchor="middle">
          Demo
        </SvgText>

        <SvgText x={0} y={16} fill="white" fontSize="14" fontWeight="900" textAnchor="middle">
          KES {money(total)}
        </SvgText>
      </G>
    </Svg>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angle = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
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

// PC-030M20AV3AQ — Final Responsive UAT Closure: Coach G Demo calibrated for compact and desktop widths
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 128, width: "100%", maxWidth: 960, alignSelf: "center" },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  chartCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center"
  },
  label: { color: "#67e8f9", fontWeight: "900", marginBottom: 12 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    color: "white"
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  quick: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 12
  },
  quickText: { color: "#cbd5e1", fontSize: 11, textAlign: "center", fontWeight: "800" },
  optionGrid: { gap: 10 },
  option: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14
  },
  optionActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.18)"
  },
  optionText: { color: "#cbd5e1", fontWeight: "800" },
  optionTextActive: { color: "#c084fc" },
  cardTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 17 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 10
  },
  legendWrap: { flexDirection: "row", gap: 9, alignItems: "center", flex: 1 },
  dot: { width: 11, height: 11, borderRadius: 8 },
  white: { color: "white", fontWeight: "900" },
  value: { color: "#cbd5e1", textAlign: "right", flex: 1 },
  coachCard: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  body: { color: "#cbd5e1", marginTop: 10, lineHeight: 21 },
  primary: {
    marginTop: 24,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});