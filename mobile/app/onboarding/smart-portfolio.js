import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { router } from "expo-router";

import { savePortfolio } from "../../src/portfolio/portfolioStore";
import { saveInvestorProfile } from "../../src/features/profile/api/investorProfileApi";
import { useMarketData } from "../../src/services/markets/useMarketData";

import {
  userGetItem,
  userSetItem
} from "../../src/auth/userStorage";

const STARTER_AMOUNT = 25000;

const SECURITY_IDEAS = {
  Banking: [
    { symbol: "KCB", name: "KCB Group PLC", sector: "Banking" },
    { symbol: "COOP", name: "Co-operative Bank of Kenya Ltd", sector: "Banking" },
    { symbol: "ABSA", name: "Absa Bank Kenya PLC", sector: "Banking" }
  ],
  Telecom: [
    { symbol: "SCOM", name: "Safaricom PLC", sector: "Telecom" }
  ],
  "Dividend Stocks": [
    { symbol: "BAT", name: "British American Tobacco Kenya PLC", sector: "Mfg. and Allied" },
    { symbol: "EABL", name: "East African Breweries PLC", sector: "Mfg. and Allied" }
  ],
  "ETF / Diversifier": [
    { symbol: "SMWF", name: "Sanlam MSCI World ETF", sector: "ETF" },
    { symbol: "GLD", name: "ABSA NewGold ETF", sector: "ETF" }
  ],
  "Growth Stocks": [
    { symbol: "SCOM", name: "Safaricom PLC", sector: "Telecom" },
    { symbol: "EABL", name: "East African Breweries PLC", sector: "Mfg. and Allied" }
  ]
};

export default function SmartPortfolio() {
  const marketRuntime = useMarketData();
  const marketRows =
    marketRuntime?.data ||
    marketRuntime?.quotes ||
    marketRuntime?.stocks ||
    marketRuntime?.marketData ||
    [];

  const quoteBySymbol = new Map(
    (Array.isArray(marketRows) ? marketRows : [])
      .filter((row) => row?.symbol)
      .map((row) => [String(row.symbol).toUpperCase(), row])
  );

  const resolveIdeaPrice = (idea) => {
    const quote = quoteBySymbol.get(String(idea?.symbol || "").toUpperCase());
    const price = Number(
      quote?.price ?? quote?.lastPrice ?? quote?.currentPrice ?? NaN
    );
    return Number.isFinite(price) && price > 0 ? price : null;
  };

  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 520;
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState([]);
  const [starterHoldings, setStarterHoldings] = useState([]);
  const [cashReserve, setCashReserve] = useState(0);

  useEffect(() => {
    buildPlan();
  }, []);

  async function buildPlan() {
    const raw = await userGetItem("investorProfile");
    const saved = raw ? JSON.parse(raw) : {};

    const risk = saved.riskTolerance || "Balanced";
    const goal = saved.goal || "Build Wealth";

    let allocation = [];

    if (risk === "Conservative") {
      allocation = [
        ["ETF / Diversifier", 40],
        ["Dividend Stocks", 30],
        ["Banking", 25],
        ["Cash Reserve", 5]
      ];
    } else if (risk === "Aggressive") {
      allocation = [
        ["Growth Stocks", 40],
        ["Banking", 30],
        ["Telecom", 25],
        ["Cash Reserve", 5]
      ];
    } else {
      allocation = [
        ["Banking", 30],
        ["Telecom", 25],
        ["Dividend Stocks", 25],
        ["ETF / Diversifier", 15],
        ["Cash Reserve", 5]
      ];
    }

    if (goal === "Passive Income" || goal === "Retirement") {
      allocation = [
        ["Dividend Stocks", 40],
        ["Banking", 30],
        ["ETF / Diversifier", 25],
        ["Cash Reserve", 5]
      ];
    }

    const smartPlan = allocation.map(([name, weight]) => ({
      name,
      weight,
      amount: (STARTER_AMOUNT * weight) / 100
    }));

    const { holdings, remainingCash } = buildStarterHoldings(smartPlan);

    const completedProfile = {
      ...saved,
      onboardingCompleted: true,
      smartPortfolioCreated: true,
      starterAmount: STARTER_AMOUNT,
      smartPortfolio: smartPlan,
      starterHoldings: holdings,
      createdAt: saved.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await userSetItem("investorProfile", JSON.stringify(completedProfile));

    setProfile(completedProfile);
    setPlan(smartPlan);
    setStarterHoldings(holdings);
    setCashReserve(remainingCash);
  }

  function buildStarterHoldings(smartPlan = []) {
    const holdings = [];
    let remainingCash = 0;

    smartPlan.forEach((item) => {
      if (item.name === "Cash Reserve") {
        remainingCash += Number(item.amount || 0);
        return;
      }

      const ideas = SECURITY_IDEAS[item.name] || [];
      let allocationRemaining = Number(item.amount || 0);

      ideas.forEach((idea) => {
        if (allocationRemaining <= 0) return;

        const marketPrice = resolveIdeaPrice(idea);
        if (!marketPrice) return;

        const quantity = Math.floor(allocationRemaining / marketPrice);

        if (quantity <= 0) return;

        const invested = quantity * marketPrice;

        holdings.push({
          broker: "STARTER_PLAN",
          source: "SMART_PORTFOLIO_STARTER",
          symbol: idea.symbol,
          name: idea.name,
          sector: idea.sector,
          quantity,
          averagePrice: marketPrice,
          averageCost: marketPrice,
          marketPrice: marketPrice,
          price: marketPrice,
          marketValue: invested,
          value: invested,
          costValue: invested,
          investedValue: invested,
          profitLoss: 0,
          profitLossPct: 0,
          changePct: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        allocationRemaining -= invested;
      });

      remainingCash += allocationRemaining;
    });

    return {
      holdings,
      remainingCash
    };
  }

  async function continueToDashboard() {
    await savePortfolio(starterHoldings);

    await userSetItem("availableCash", String(cashReserve));
    await userSetItem("statementUploaded", "true");
    await userSetItem("onboardingCompleted", "true");
    await userSetItem(
      "investorProfile",
      JSON.stringify({
        ...profile,
        onboardingCompleted: true
      })
    );

const name = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();

await saveInvestorProfile({
  name,
  goal: profile?.goal || "Build Wealth",
  risk: profile?.riskTolerance || profile?.risk || "Balanced",
  experience: profile?.experience || "Beginner",
  timeHorizon: profile?.timeHorizon || "3-5 Years",
  contribution: profile?.contribution || "Monthly",
  investorType:
    profile?.goal === "Retirement"
      ? "Long-Term Builder"
      : profile?.goal === "Passive Income"
      ? "Income Builder"
      : "Balanced Builder",
  marketDrop: profile?.marketDrop || "Wait",
  amount: profile?.starterAmount || 10000,
  monthlyContribution: profile?.monthlyContribution || 0,
  goalTarget: profile?.goalTarget || 1000000,
  riskScore: profile?.riskScore || 0,
  confidence: profile?.confidence || 0,
  brokerRecommendation:
    profile?.broker?.name ||
    profile?.recommendedBroker?.broker ||
    profile?.recommendedBroker?.name ||
    null
});
    router.replace("/(tabs)/dashboard");
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
    >
      <Text style={[styles.title, isCompact && styles.titleCompact]}>Your Smart Portfolio is Ready</Text>

      <Text style={styles.subtitle}>
        Coach G built this KES {money(STARTER_AMOUNT)} starter allocation from
        your goal, experience, risk preference, and broker status.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {profile?.riskTolerance || "Balanced"} Strategy
        </Text>

        {plan.map((item) => (
          <View key={item.name} style={[styles.row, isCompact && styles.rowCompact]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.amount}>KES {money(item.amount)}</Text>
            </View>

            <Text style={styles.weight}>{item.weight}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Starter Holdings</Text>

        {starterHoldings.length === 0 ? (
          <Text style={styles.noticeText}>
            KES {money(STARTER_AMOUNT)} is too small to buy full shares in this
            allocation. It will remain as cash reserve.
          </Text>
        ) : (
          starterHoldings.map((holding, index) => (
            <View key={`${holding.symbol}-${index}`} style={[styles.row, isCompact && styles.rowCompact]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{holding.symbol}</Text>
                <Text style={styles.amount}>
                  {holding.quantity} shares • {holding.sector}
                </Text>
              </View>

              <Text style={styles.weight}>KES {money(holding.marketValue)}</Text>
            </View>
          ))
        )}

        <View style={[styles.cashRow, isCompact && styles.rowCompact]}>
          <Text style={styles.name}>Cash Reserve</Text>
          <Text style={styles.cash}>KES {money(cashReserve)}</Text>
        </View>
      </View>

      {profile?.hasBroker ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Accuracy Tip</Text>
          <Text style={styles.noticeText}>
            Upload your valuation report later so Coach G can compare this smart
            portfolio against your real holdings.
          </Text>
        </View>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Broker Guidance</Text>
          <Text style={styles.noticeText}>
            Coach G can recommend brokers when you are ready to open or connect
            an account.
          </Text>
        </View>
      )}

      <Pressable style={styles.primary} onPress={continueToDashboard}>
        <Text style={styles.primaryText}>Continue to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    /* PC-030M20AV3AO RESPONSIVE CALIBRATION */
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 25,
    paddingTop: 70,
    paddingBottom: 128
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 32
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 12,
    lineHeight: 22
  },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 14
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 12
  },
  rowCompact: {
    alignItems: "flex-start"
  },
  name: {
    color: "#cbd5e1",
    fontWeight: "800"
  },
  amount: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12
  },
  weight: {
    color: "white",
    fontWeight: "900",
    textAlign: "right",
    flexShrink: 1
  },
  cashRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 14
  },
  cash: {
    color: "#86efac",
    fontWeight: "900"
  },
  notice: {
    marginTop: 22,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  noticeTitle: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  noticeText: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
  },
  noticeText: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
  },
  primary: {
    marginTop: 28,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  }
});