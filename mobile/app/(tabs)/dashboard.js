import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../../src/features/auth/hooks/useAuth";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { APP_VERSION } from "../../src/version/versionRegistry";

import { getMarketIntelligenceHome } from "../../src/features/market/api/marketIntelligenceApi";
import { getCoachDashboard } from "../../src/features/coach/api/coachApi";
import { getUserBrokers } from "../../src/features/brokers/api/userBrokerApi";
import {
  loadDecisionJournal
} from "../../src/features/decision-journal/decisionJournalStore";

import {
  loadUnifiedPortfolio
} from "../../src/portfolio/unifiedPortfolioApi";

import {
  loadInvestorContext
} from "../../src/features/investor/investorContextStore";

import CoachReflectionCard from "../../src/features/learning-dashboard/components/CoachReflectionCard";
import DailyLessonCard from "../../src/features/learning-dashboard/components/DailyLessonCard";
import InvestorJourneyCard from "../../src/features/learning-dashboard/components/InvestorJourneyCard";
import ConfidenceProgressCard from "../../src/features/learning-dashboard/components/ConfidenceProgressCard";

export default function Dashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
const [marketIntel, setMarketIntel] = useState(null);
const [coach, setCoach] = useState(null);
const [brokers, setBrokers] = useState([]);
const [portfolioResult, setPortfolioResult] = useState(null);
const [investorProfile, setInvestorProfile] = useState(null);
const [practicePortfolio, setPracticePortfolio] = useState(null);
const [decisionJournal, setDecisionJournal] = useState([]);
const [lastUpdated, setLastUpdated] = useState("");
const [investorContext, setInvestorContext] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  async function loadDashboard() {
    try {
      setLoading(true);

 const [
  unifiedResult,
  marketResult,
  coachResult,
  brokerResult,
  investorContextResult,
  journalResult
] = await Promise.all([
  loadUnifiedPortfolio({ broker: "ALL" }).catch((error) => {
    console.log(
      "Unified portfolio load error:",
      error.message
    );
    return null;
  }),

  getMarketIntelligenceHome().catch((error) => {
    console.log(
      "Market intelligence load error:",
      error.message
    );
    return null;
  }),

  getCoachDashboard().catch((error) => {
    console.log(
      "Coach dashboard load error:",
      error.message
    );
    return null;
  }),

  getUserBrokers().catch((error) => {
    console.log(
      "Broker load error:",
      error.message
    );

    return {
      brokers: []
    };
  }),

  loadInvestorContext().catch((error) => {
    console.log(
      "Investor context load error:",
      error.message
    );
    return null;
  }),

  loadDecisionJournal().catch((error) => {
    console.log(
      "Investment Journal load error:",
      error.message
    );
    return [];
  })
]);

setPortfolioResult(unifiedResult);
setMarketIntel(marketResult);
setCoach(coachResult);
setBrokers(brokerResult?.brokers || []);

setInvestorContext(investorContextResult);

setInvestorProfile(
  investorContextResult?.storedProfile || null
);

setPracticePortfolio(
  investorContextResult?.practicePortfolio || null
);
setDecisionJournal(
  Array.isArray(journalResult)
    ? journalResult
    : []
);

setLastUpdated(new Date().toLocaleString());

    } catch (error) {
      console.log("Dashboard load error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  const unifiedHoldings = useMemo(() => {
    return Array.isArray(portfolioResult?.holdings)
      ? portfolioResult.holdings
      : [];
  }, [portfolioResult]);

  const practiceHoldings = useMemo(() => {
    return Array.isArray(practicePortfolio?.holdings)
      ? practicePortfolio.holdings
      : [];
  }, [practicePortfolio]);

  const activeHoldings = unifiedHoldings.length
    ? unifiedHoldings
    : practiceHoldings;

  const usePracticePortfolio =
  practiceHoldings.length > 0 &&
  unifiedHoldings.length === 0;

const portfolioSummary = useMemo(() => {
  return buildPortfolioSummary({
    holdings: activeHoldings,
    portfolioResult,
    practicePortfolio,
    marketIntel,
    usePracticePortfolio
  });
}, [
  activeHoldings,
  portfolioResult,
  practicePortfolio,
  marketIntel,
  usePracticePortfolio
]);

  const {
    currentValue,
    investedValue,
    totalCash,
    netWorth,
    totalGain,
    totalGainPct,
    dayChange,
    holdingsCount
  } = portfolioSummary;

  const profile = investorProfile?.profile || investorProfile || {};

  const investorDNA =
  investorContext?.investorDNA || {};

  const investorType =
  investorContext?.investor?.investorType ||
  "Developing Investor";

  const firstName =
    profile?.firstName ||
    user?.firstName ||
    firstNameFromUser(user) ||
    "Investor";

  const practiceCreated =
  Boolean(investorContext?.journey?.hasPracticePortfolio);

  const dnaCreated =
  Boolean(investorContext?.journey?.hasInvestorDNA);

const blueprintCreated =
  Boolean(investorContext?.journey?.hasWealthBlueprint);

  const firstPracticeDecision =
  decisionJournal.some(
    (entry) => entry?.isPractice !== false
  );

  const brokerConnected = brokers.length > 0;

  const milestones = [
    {
      label: "Met Coach G",
      description: "Completed the conversational Welcome Journey.",
      complete: dnaCreated
    },
    {
      label: "Built Investor DNA",
      description: "Coach G understands your current goals and investing comfort.",
      complete: dnaCreated
    },
    {
      label: "Created Wealth Blueprint",
      description: "Your first personalized investing direction is ready.",
      complete: blueprintCreated
    },
    {
      label: "Built Practice Portfolio",
      description: "A learning portfolio was created without using real money.",
      complete: practiceCreated
    },
    {
  label: "Completed First Practice Decision",
  description:
    "Paused, reflected, and recorded why an investment interested you.",
  complete: firstPracticeDecision
},
    {
      label: "Connected a Live Broker",
      description: "Connect only when you are ready to invest with real money.",
      complete: brokerConnected
    }
  ];

  const completedMilestones = milestones.filter(
    (item) => item.complete
  ).length;

  const confidenceLevel = Math.min(
    Math.max(completedMilestones, 1),
    8
  );

  const confidenceLabel = getConfidenceLabel(confidenceLevel);

  const coachMessage =
    marketIntel?.coach?.narrative ||
    coach?.coachMessage ||
    buildCoachReflection({
      investorType,
      practiceCreated,
      holdingsCount,
      brokerConnected
    });

  const movers = Array.isArray(marketIntel?.movers)
    ? marketIntel.movers
    : [];

  const goalTarget = Number(
    profile?.goalTarget ||
    investorProfile?.goalTarget ||
    1000000
  );

  const goalProgress =
    goalTarget > 0
      ? Math.min((netWorth / goalTarget) * 100, 100)
      : 0;

  const sourceLabel = unifiedHoldings.length
    ? "UNIFIED PORTFOLIO"
    : practiceHoldings.length
    ? "GATECEP PRACTICE PORTFOLIO"
    : marketIntel?.marketFeed?.provider
    ? `MARKET INTELLIGENCE • ${marketIntel.marketFeed.provider}`
    : "NO PORTFOLIO LOADED";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />

        <Text style={styles.loadingTitle}>
          Coach G is preparing your dashboard...
        </Text>

        <Text style={styles.loadingText}>
          Reviewing your journey, learning progress, and portfolio.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <Pressable
          style={styles.icon}
          onPress={() => router.push("/menu")}
        >
          <Text style={styles.iconText}>☰</Text>
        </Pressable>

        <Text style={styles.title}>My Journey</Text>

        <Pressable
          style={styles.icon}
          onPress={() => router.push("/intelligence-center")}
        >
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>
        Good {greeting()}, {firstName}
      </Text>

      <Text style={styles.subtitle}>
        Welcome back. Let’s continue developing your investing knowledge,
        confidence, and long-term plan.
      </Text>

      <Text style={styles.small}>Version {APP_VERSION}</Text>
      <Text style={styles.small}>Updated {lastUpdated}</Text>
      <Text style={styles.sourceText}>Source: {sourceLabel}</Text>

      <ActiveUserBanner />

      <CoachReflectionCard message={coachMessage} />

      <DailyLessonCard
        title="Why diversification matters"
        summary="Spreading money across different investments can reduce the effect that one company or one sector has on your whole portfolio."
        onPress={openDailyLesson}
      />

      <ConfidenceProgressCard
        level={confidenceLevel}
        maxLevel={8}
        label={confidenceLabel}
      />

      <InvestorJourneyCard milestones={milestones} />

      <View style={styles.portfolioHero}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>
              {practiceHoldings.length && !unifiedHoldings.length
                ? "Practice Net Worth"
                : "Net Worth"}
            </Text>

            <Text style={styles.heroValue}>
              KES {money(netWorth)}
            </Text>
          </View>

          <View style={styles.practiceBadge}>
            <Text style={styles.practiceBadgeText}>
              {practiceHoldings.length && !unifiedHoldings.length
                ? "PRACTICE"
                : "PORTFOLIO"}
            </Text>
          </View>
        </View>

        <Text style={totalGain >= 0 ? styles.green : styles.red}>
          {totalGain >= 0 ? "▲" : "▼"} KES {money(totalGain)} (
          {totalGainPct.toFixed(2)}%)
        </Text>

        <Text style={dayChange >= 0 ? styles.green : styles.red}>
          Today {dayChange >= 0 ? "+" : ""}KES {money(dayChange)}
        </Text>

        <View style={styles.grid}>
          <Metric
            label="Portfolio"
            value={`KES ${money(currentValue)}`}
          />

          <Metric
            label="Invested"
            value={`KES ${money(investedValue)}`}
          />

          <Metric
            label="Available Cash"
            value={`KES ${money(totalCash)}`}
          />

          <Metric
            label="Holdings"
            value={String(holdingsCount)}
          />
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/portfolio-hub")}
        >
          <Text style={styles.primaryButtonText}>
            Open Portfolio Hub
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal Progress</Text>

        <Text style={styles.goalValue}>
          KES {money(netWorth)}
        </Text>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${goalProgress}%`
              }
            ]}
          />
        </View>

        <Text style={styles.small}>
          Target KES {money(goalTarget)} •{" "}
          {goalProgress.toFixed(1)}% complete
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Investor Snapshot
        </Text>

        <InfoRow
          label="Investor Type"
          value={investorType}
        />

        <InfoRow
          label="Comfort Profile"
          value={
            profile?.risk ||
            investorDNA?.riskProfile ||
            "Still Learning"
          }
        />

        <InfoRow
          label="Primary Goal"
          value={
            humanizeValue(
              profile?.goal ||
              investorDNA?.goal ||
              "Building Wealth"
            )
          }
        />

        <InfoRow
          label="Current Stage"
          value={
            brokerConnected
              ? "Live Investing"
              : practiceCreated
              ? "Practice Investing"
              : "Discovery"
          }
        />

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/new-investor")}
        >
          <Text style={styles.secondaryButtonText}>
            Review Investor DNA
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker Status</Text>

        {brokers.length === 0 ? (
          <>
            <Text style={styles.body}>
              No live broker is connected. You can continue practicing
              with GateCEP for as long as you need.
            </Text>

            <Text style={styles.guidanceText}>
              Broker connection is optional until you decide that you are
              ready to invest real money.
            </Text>
          </>
        ) : (
          brokers.map((broker) => (
            <View
              key={
                broker.id ||
                broker.broker ||
                broker.name
              }
              style={styles.infoRow}
            >
              <Text style={styles.infoLabel}>
                {broker.broker ||
                  broker.name ||
                  "Connected Broker"}
              </Text>

              <Text style={styles.infoValue}>
                {broker.status || "ACTIVE"} •{" "}
                {broker.clientNumber || "Account linked"}
              </Text>
            </View>
          ))
        )}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/broker-profile")}
        >
          <Text style={styles.secondaryButtonText}>
            {brokers.length
              ? "Manage Broker"
              : "Learn About Live Investing"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Market Learning
        </Text>

        <Text style={styles.body}>
          Market movements are shown for education—not to pressure you
          into trading.
        </Text>

        {movers.length === 0 ? (
          <Text style={styles.emptyText}>
            Market movement data is not available right now.
          </Text>
        ) : (
          movers.slice(0, 5).map((item) => {
            const pct = Number(
              item.dayChangePct ||
              item.changePct ||
              0
            );

            return (
              <View
                key={item.symbol}
                style={styles.marketRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.symbol}>
                    {item.symbol}
                  </Text>

                  <Text style={styles.small}>
                    {item.name ||
                      item.sector ||
                      "NSE Security"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.value}>
                    KES{" "}
                    {money(
                      item.livePrice ||
                      item.price
                    )}
                  </Text>

                  <Text
                    style={
                      pct >= 0
                        ? styles.green
                        : styles.red
                    }
                  >
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push("/(tabs)/markets")}
        >
          <Text style={styles.secondaryButtonText}>
            Explore Markets
          </Text>
        </Pressable>
      </View>

     <View style={styles.quickSection}>
  <Text style={styles.quickTitle}>
    Continue Your Journey
  </Text>

  <View style={styles.quickGrid}>
    <Quick
      title="Practice Portfolio"
      route="/starter-plan"
    />

    <Quick
      title="Practice Decision"
      route="/practice-decision"
    />

    <Quick
      title="Investment Journal"
      route="/decision-journal"
    />

    <Quick
      title="Portfolio Hub"
      route="/portfolio-hub"
    />

    <Quick
      title="Coach G"
      route="/coach-dashboard"
    />

    <Quick
      title="Markets"
      route="/(tabs)/markets"
    />

    <Quick
      title="My Profile"
      route="/my-profile"
    />

    {brokerConnected ? (
      <Quick
        title="Live Investing"
        route="/live-dashboard"
      />
    ) : null}
   </View>
</View>

</ScrollView>
  );
}

function buildPortfolioSummary({
  holdings,
  portfolioResult,
  practicePortfolio,
  marketIntel,
  usePracticePortfolio
}) {
  const safeHoldings = Array.isArray(holdings)
    ? holdings
    : [];

  const currentValueFromHoldings = safeHoldings.reduce(
    (sum, holding) =>
      sum +
      Number(
        holding.marketValue ||
        holding.value ||
        0
      ),
    0
  );

  const investedValueFromHoldings = safeHoldings.reduce(
    (sum, holding) =>
      sum +
      Number(
        holding.investedValue ||
        holding.costValue ||
        (
          Number(
            holding.averageCost ||
            holding.averagePrice ||
            holding.price ||
            0
          ) *
          Number(holding.quantity || 0)
        ) ||
        0
      ),
    0
  );

  const gainFromHoldings = safeHoldings.reduce(
  (sum, holding) => {
    /*
     * A profit/loss of 0 is a valid value.
     * Do not use || because it treats zero as missing.
     */
    if (
      holding.profitLoss !== undefined &&
      holding.profitLoss !== null
    ) {
      return sum + Number(holding.profitLoss);
    }

    const quantity = Number(
      holding.quantity || 0
    );

    const marketValue = Number(
      holding.marketValue ??
      holding.value ??
      (
        quantity *
        Number(
          holding.marketPrice ??
          holding.price ??
          0
        )
      )
    );

    const investedValue = Number(
      holding.investedValue ??
      holding.costValue ??
      (
        quantity *
        Number(
          holding.averageCost ??
          holding.averagePrice ??
          holding.price ??
          0
        )
      )
    );

    return sum + (marketValue - investedValue);
  },
  0
);

  const dayChangeFromHoldings = safeHoldings.reduce(
    (sum, holding) =>
      sum +
      Number(
        holding.dayChange ||
        holding.marketChange ||
        0
      ),
    0
  );

  const unifiedSummary =
    portfolioResult?.summary ||
    {};

  const marketSummary =
    marketIntel?.summary ||
    {};

  if (usePracticePortfolio) {
  const currentValue = currentValueFromHoldings;

  const investedValue = Number(
    practicePortfolio?.investedAmount ??
    investedValueFromHoldings
  );

  const totalCash = Number(
    practicePortfolio?.availableCash ??
    0
  );

  const totalGain =
    currentValue - investedValue;

  const totalGainPct =
    investedValue > 0
      ? (totalGain / investedValue) * 100
      : 0;

  const dayChange =
    dayChangeFromHoldings;

  const holdingsCount =
    safeHoldings.length;

  const netWorth =
    currentValue + totalCash;

  return {
    currentValue,
    investedValue,
    totalCash,
    netWorth,
    totalGain,
    totalGainPct,
    dayChange,
    holdingsCount
  };
}

  const currentValue = firstFiniteNumber(
    unifiedSummary.totalValue,
    portfolioResult?.totalValue,
    currentValueFromHoldings,
    marketSummary.totalValue,
    0
  );

  const investedValue = firstFiniteNumber(
    unifiedSummary.investedValue,
    portfolioResult?.investedValue,
    investedValueFromHoldings,
    marketSummary.investedValue,
    0
  );

  const totalCash = firstFiniteNumber(
    unifiedSummary.totalCash,
    unifiedSummary.availableCash,
    portfolioResult?.totalCash,
    portfolioResult?.availableCash,
    practicePortfolio?.availableCash,
    marketSummary.totalCash,
    0
  );

  const totalGain = firstFiniteNumber(
    unifiedSummary.totalGain,
    portfolioResult?.totalGain,
    gainFromHoldings,
    marketSummary.totalGain,
    currentValue - investedValue,
    0
  );

  const totalGainPct =
    investedValue > 0
      ? (totalGain / investedValue) * 100
      : firstFiniteNumber(
          unifiedSummary.totalGainPct,
          marketSummary.totalGainPct,
          0
        );

  const dayChange = firstFiniteNumber(
    unifiedSummary.dayChange,
    portfolioResult?.dayChange,
    dayChangeFromHoldings,
    marketSummary.dayChange,
    0
  );

  const holdingsCount = firstFiniteNumber(
    unifiedSummary.holdingsCount,
    portfolioResult?.holdingsCount,
    safeHoldings.length,
    marketSummary.holdingsCount,
    0
  );

  const netWorth = firstFiniteNumber(
    unifiedSummary.netWorth,
    portfolioResult?.netWorth,
    marketSummary.netWorth,
    currentValue + totalCash
  );

  return {
    currentValue,
    investedValue,
    totalCash,
    netWorth,
    totalGain,
    totalGainPct,
    dayChange,
    holdingsCount
  };
}

function buildCoachReflection({
  investorType,
  practiceCreated,
  holdingsCount,
  brokerConnected
}) {
  if (!practiceCreated) {
    return `You are beginning as a ${String(
      investorType
    ).toLowerCase()}. Your next step is to build a Practice Portfolio and learn why each investment has a role.`;
  }

  if (!holdingsCount) {
    return "Your Wealth Blueprint is ready. Let’s turn it into a Practice Portfolio so you can learn without risking real money.";
  }

  if (!brokerConnected) {
    return "Your Practice Portfolio is active. Focus on understanding your holdings and building confidence before deciding whether to connect a live broker.";
  }

  return "Your live investing journey has begun. I’ll continue helping you understand your portfolio, reflect on decisions, and stay aligned with your goals.";
}

function openDailyLesson() {
  Alert.alert(
    "Why Diversification Matters",
    "Diversification means spreading your money across different investments. It cannot remove all risk, but it can reduce the impact that one poor-performing company or sector has on your full portfolio."
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {String(value || "N/A")}
      </Text>
    </View>
  );
}

function Quick({ title, route }) {
  return (
    <Pressable
      style={styles.quickButton}
      onPress={() => router.push(route)}
    >
      <Text style={styles.quickText}>
        {title}
      </Text>
    </Pressable>
  );
}

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function firstNameFromUser(user) {
  const candidate =
    user?.name ||
    user?.displayName ||
    user?.username ||
    user?.email ||
    "";

  return String(candidate)
    .trim()
    .split(/\s|@/)[0];
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}

function getConfidenceLabel(level) {
  if (level <= 2) {
    return "Building Your Foundation";
  }

  if (level <= 4) {
    return "Learning Consistently";
  }

  if (level <= 6) {
    return "Practicing Thoughtfully";
  }

  return "Growing With Confidence";
}

function humanizeValue(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Morning";
  }

  if (hour < 17) {
    return "Afternoon";
  }

  return "Evening";
}

function money(value) {
  return Number(value || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120
  },

  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  loadingTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center"
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 21,
    textAlign: "center"
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },

  iconText: {
    color: "white",
    fontSize: 22
  },

  title: {
    color: "white",
    fontSize: 31,
    fontWeight: "900",
    flex: 1,
    textAlign: "center"
  },

  greeting: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 22
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 22
  },

  small: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4
  },

  sourceText: {
    color: "#c084fc",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900"
  },

  portfolioHero: {
    marginTop: 18,
    backgroundColor: "rgba(147,51,234,.16)",
    borderColor: "rgba(192,132,252,.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },

  heroLabel: {
    color: "#c4b5fd",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase"
  },

  heroValue: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8
  },

  practiceBadge: {
    backgroundColor: "rgba(6,182,212,.16)",
    borderColor: "rgba(103,232,249,.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },

  practiceBadgeText: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900"
  },

  green: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 5
  },

  red: {
    color: "#fca5a5",
    fontWeight: "900",
    marginTop: 5
  },

  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  metric: {
    width: "47%",
    backgroundColor: "rgba(2,6,23,.68)",
    borderColor: "rgba(148,163,184,.18)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },

  metricLabel: {
    color: "#94a3b8",
    fontSize: 11
  },

  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 8
  },

  card: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },

  goalValue: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },

  barTrack: {
    marginTop: 12,
    height: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden"
  },

  barFill: {
    height: "100%",
    backgroundColor: "#9333ea",
    borderRadius: 8
  },

  body: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 21
  },

  guidanceText: {
    color: "#fde68a",
    marginTop: 12,
    lineHeight: 20,
    fontSize: 13
  },

  emptyText: {
    color: "#94a3b8",
    marginTop: 14,
    lineHeight: 20
  },

  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },

  infoLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  infoValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4,
    textTransform: "capitalize"
  },

  marketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12
  },

  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },

  value: {
    color: "white",
    fontWeight: "900"
  },

  primaryButton: {
    marginTop: 18,
    backgroundColor: "#9333ea",
    borderRadius: 16,
    padding: 15,
    alignItems: "center"
  },

  primaryButtonText: {
    color: "white",
    fontWeight: "900"
  },

  secondaryButton: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 14,
    alignItems: "center"
  },

  secondaryButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },

  quickSection: {
    marginTop: 18
  },

  quickTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  quickButton: {
    width: "47%",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },

  quickText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});