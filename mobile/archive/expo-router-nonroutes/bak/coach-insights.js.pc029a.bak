import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { createBasketExecution } from "../src/trade/basketExecutionStore";
import {
  RECOMMENDATION_STATUS,
  saveRecommendationRecord,
  updateRecommendationStatus
} from "../src/coach/recommendationLifecycleStore";

import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { buildCoachPortfolioReview } from "../src/portfolio/coachPortfolioReview";
import { buildPerformanceAttribution } from "../src/portfolio/performanceAttribution";
import { saveTradeBasket } from "../src/trade/tradeBasketStore";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

export default function Coach() {
  const [portfolio, setPortfolio] = useState([]);
  const [dashboardContext, setDashboardContext] = useState(null);
  const [transactionsUploaded, setTransactionsUploaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [recommendationHistory, setRecommendationHistory] = useState([]);

  const [amount, setAmount] = useState(10000);
  const [sectorPlan, setSectorPlan] = useState([]);
  const [selectedSector, setSelectedSector] = useState(null);

  const [showSimulator, setShowSimulator] = useState(false);
  const [goal, setGoal] = useState("Dividend Income");
  const [scenario, setScenario] = useState("Balanced");
  const [intensity, setIntensity] = useState(50);
  const [goalOpen, setGoalOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [attribution, setAttribution] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const portfolioData = await loadUnifiedPortfolio();
    const savedPortfolio = portfolioData?.holdings || [];
    const contextRaw = await userGetItem("coachContext");
    const txUploadedRaw = await userGetItem("transactionsUploaded");
    const txRaw = await userGetItem("transactionHistory");
    const historyRaw = await userGetItem("recommendationHistory");

    const scopedTransactions = txRaw ? JSON.parse(txRaw) : [];

    setPortfolio(savedPortfolio);
    setTransactions(scopedTransactions);
    setAttribution(
      buildPerformanceAttribution(savedPortfolio, scopedTransactions)
    );

    if (contextRaw) {
      setDashboardContext(JSON.parse(contextRaw));
    }

    setTransactionsUploaded(txUploadedRaw === "true");
    setRecommendationHistory(historyRaw ? JSON.parse(historyRaw) : []);
  }

  const value = useMemo(() => {
    return portfolio.reduce(
      (sum, x) => sum + Number(x.marketValue || x.value || 0),
      0
    );
  }, [portfolio]);

  const sectorRows = useMemo(() => {
    const grouped = {};

    portfolio.forEach((h) => {
      const sector = h.sector || "Unknown";
      const marketValue = Number(h.marketValue || h.value || 0);
      const profitLoss = Number(h.profitLoss || 0);

      if (!grouped[sector]) {
        grouped[sector] = {
          sector,
          totalValue: 0,
          profitLoss: 0,
          securities: []
        };
      }

      grouped[sector].totalValue += marketValue;
      grouped[sector].profitLoss += profitLoss;
      grouped[sector].securities.push(h);
    });

    return Object.values(grouped)
      .map((s) => ({
        ...s,
        weight: value > 0 ? (s.totalValue / value) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [portfolio, value]);

  const largestSectorRow = sectorRows[0];

  const largestSector =
    largestSectorRow?.sector ||
    dashboardContext?.largestSector ||
    "N/A";

  const risk =
    dashboardContext?.risk ||
    (Number(largestSectorRow?.weight || 0) >= 35
      ? "HIGH_RISK"
      : Number(largestSectorRow?.weight || 0) >= 30
      ? "MODERATE"
      : "BALANCED");

  const portfolioReview = useMemo(() => {
    return buildCoachPortfolioReview({
      holdings: portfolio,
      cash: dashboardContext?.cash || 0,
      currentValue: value,
      sectorRows,
      health: {
        score: dashboardContext?.healthScore,
        rating: dashboardContext?.healthRating,
        strengths: dashboardContext?.healthStrengths || [],
        watchlist: dashboardContext?.healthWatchlist || []
      }
    });
  }, [portfolio, dashboardContext, value, sectorRows]);

  const latestStrategy = recommendationHistory[0];

  function buildSectorRecommendation() {
    if (largestSector === "Banking") {
      return [
        { sector: "Mfg. and Allied", weight: 30 },
        { sector: "Telecom", weight: 25 },
        { sector: "Energy and Petroleum", weight: 15 },
        { sector: "ETF", weight: 15 },
        { sector: "Comm. and Services", weight: 5 },
        { sector: "Cash Reserve", weight: 10, reserve: true }
      ];
    }

    return [
      { sector: "ETF", weight: 30 },
      { sector: "Telecom", weight: 25 },
      { sector: "Mfg. and Allied", weight: 20 },
      { sector: "Insurance", weight: 10 },
      { sector: "Cash Reserve", weight: 15, reserve: true }
    ];
  }

  function simulate() {
    const plan = buildSectorRecommendation().map((x) => ({
      ...x,
      amount: (Number(amount || 0) * x.weight) / 100
    }));

    setSectorPlan(plan);
  }

 async function saveRecommendation() {
  const record = await saveRecommendationRecord({
    portfolioValue: value,
    largestSector,
    amount,
    goal,
    scenario,
    intensity,
    sectorPlan,
    status: RECOMMENDATION_STATUS.SAVED,
    executionStatus: "NOT_STARTED",
    version: "3.8.1"
  });

  const historyRaw = await userGetItem("recommendationHistory");
  setRecommendationHistory(historyRaw ? JSON.parse(historyRaw) : []);

  Alert.alert("Saved", "Coach G strategy saved to your profile.");

  return record;
}

  async function createTradeBasketFromRecommendation() {
    const actionableSectors = sectorPlan.filter((item) => !item.reserve);
    const basketItems = [];

    actionableSectors.slice(0, 3).forEach((sector) => {
      const details = buildSectorDetails(sector);

      details.holdings.forEach((holding) => {
        basketItems.push({
          symbol: holding.symbol,
          name: holding.name,
          side: "BUY",
          amount: holding.invested,
          quantity: holding.qty,
          price: holding.price,
          reason: `${sector.sector} allocation from Coach G ${goal} strategy`
        });
      });
    });

    if (!basketItems.length) {
      Alert.alert(
        "No Basket Created",
        "Coach G could not create full-share basket orders from this allocation."
      );
      return;
    }

    await saveTradeBasket(
  basketItems,
  "COACH_G_SIMULATION"
);

await createBasketExecution();

if (latestStrategy?.id) {
  await updateRecommendationStatus(
    latestStrategy.id,
    RECOMMENDATION_STATUS.BASKET_CREATED,
    {
      executionStatus: "BASKET_CREATED",
      basketCreatedAt: new Date().toISOString(),
      basketCount: basketItems.length,
      message: "Trade basket created from Coach G recommendation."
    }
  );
}
setShowResults(false);
setShowSimulator(false);

router.push("/trading");
  }

  function buildBehaviorInsights() {
    if (!transactionsUploaded || !transactions.length) {
      return [
        "Upload transaction history so Coach G can analyze buying and selling behavior."
      ];
    }

    const buys = transactions.filter(
      (t) => String(t.side || "").toUpperCase() === "BUY"
    );

    const sells = transactions.filter(
      (t) => String(t.side || "").toUpperCase() === "SELL"
    );

    const totalValue = transactions.reduce(
      (sum, t) => sum + Number(t.value || 0),
      0
    );

    const avgTrade = transactions.length > 0 ? totalValue / transactions.length : 0;

    const symbolCount = {};

    buys.forEach((t) => {
      const symbol = String(t.symbol || "").toUpperCase();

      if (symbol) {
        symbolCount[symbol] = (symbolCount[symbol] || 0) + 1;
      }
    });

    const repeatedBuys = Object.entries(symbolCount)
      .filter(([, count]) => count >= 2)
      .map(([symbol]) => symbol);

    const heavyRepeatBuys = Object.entries(symbolCount)
      .filter(([, count]) => count >= 3)
      .map(([symbol]) => symbol);

    const insights = [];

    insights.push(
      `Coach G reviewed ${transactions.length} transactions (${buys.length} buys / ${sells.length} sells).`
    );

    insights.push(`Average trade size: KES ${money(avgTrade)}.`);

    if (repeatedBuys.length > 0) {
      insights.push(`Repeated accumulation detected in ${repeatedBuys.join(", ")}.`);
    }

    if (heavyRepeatBuys.length > 0) {
      insights.push(
        `Heavy repeat buying detected in ${heavyRepeatBuys.join(", ")}. Watch concentration risk.`
      );
    }

    if (transactions.length >= 15) {
      insights.push(
        "Trading frequency appears elevated. Coach G will monitor for overtrading."
      );
    }

    return insights;
  }

  function buildSectorDetails(sector) {
    const allocation = Number(sector.amount || 0);

    const stocksBySector = {
      "Mfg. and Allied": [
        ["EABL", 248, "Breweries and manufacturing exposure", "East African Breweries", 5.2],
        ["BAT", 520, "Consumer defensive manufacturer", "BAT Kenya", 7.8],
        ["BAMB", 37, "Cement and building materials exposure", "Bamburi Cement", 3.5]
      ],
      Telecom: [
        ["SCOM", 30.6, "Telecom and mobile money exposure", "Safaricom", 4.7]
      ],
      "Energy and Petroleum": [
        ["KPLC", 16.1, "Power utility exposure", "Kenya Power", 2.8],
        ["KPC", 22.75, "Petroleum infrastructure exposure", "Kenya Pipeline", 3.1],
        ["KEGN", 45.5, "Electricity generation exposure", "KenGen", 4.2]
      ],
      ETF: [
        ["GLD", 5690, "Gold ETF diversification", "Gold ETF", 4.0],
        ["SMWF", 950, "Broad market ETF diversification", "Satrix MSCI World Feeder", 3.5]
      ],
      Insurance: [
        ["KNRE", 34.3, "Insurance sector exposure", "Kenya Re", 4.6],
        ["JUB", 190, "Insurance and financial services exposure", "Jubilee Holdings", 3.8]
      ],
      "Comm. and Services": [
        ["KQ", 3.8, "Transport and services exposure", "Kenya Airways", 0],
        ["NMG", 18.5, "Media and communication services exposure", "Nation Media Group", 2.2]
      ]
    };

    const stocks = stocksBySector[sector.sector] || [];
    const actionable = stocks.filter(([, price]) => allocation >= price);

    const holdings = actionable.map(
      ([symbol, price, reason, name, dividendYield = 0]) => ({
        symbol,
        name,
        price,
        reason,
        dividendYield,
        qty: 0,
        invested: 0
      })
    );

    if (!holdings.length) {
      return {
        holdings: [],
        unused: allocation,
        investedTotal: 0,
        expectedDividend: 0
      };
    }

    const perStock = allocation / holdings.length;
    let investedTotal = 0;

    holdings.forEach((h) => {
      const qty = Math.floor(perStock / h.price);
      const invested = qty * h.price;

      h.qty += qty;
      h.invested += invested;
      investedTotal += invested;
    });

    let remaining = allocation - investedTotal;

    while (true) {
      const affordable = holdings
        .filter((h) => h.price <= remaining)
        .sort((a, b) => a.price - b.price);

      if (!affordable.length) break;

      const buy = affordable[0];

      buy.qty += 1;
      buy.invested += buy.price;
      investedTotal += buy.price;
      remaining -= buy.price;
    }

    const finalHoldings = holdings.filter((h) => h.qty > 0 && h.invested > 0);

    const expectedDividend = finalHoldings.reduce(
      (sum, h) => sum + h.invested * (Number(h.dividendYield || 0) / 100),
      0
    );

    return {
      holdings: finalHoldings,
      unused: remaining,
      investedTotal,
      expectedDividend
    };
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Coach G Insights</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <ActiveUserBanner />

      <View style={styles.card}>
        <Text style={styles.section}>Coach G Portfolio Review</Text>

        <Text style={styles.metric2}>
          {portfolioReview.score}/100 ({portfolioReview.rating})
        </Text>

        <Text style={styles.body}>
          Portfolio value is KES {money(value)}. Largest exposure is{" "}
          {portfolioReview.largestSector} ({portfolioReview.largestWeight.toFixed(2)}%).
        </Text>

        <Text style={styles.section}>Strengths</Text>
        {portfolioReview.strengths.length ? (
          portfolioReview.strengths.map((item) => (
            <Text key={item} style={styles.body}>✓ {item}</Text>
          ))
        ) : (
          <Text style={styles.body}>No major strengths detected yet.</Text>
        )}

        <Text style={styles.section}>Watchlist</Text>
        {portfolioReview.watchlist.length ? (
          portfolioReview.watchlist.map((item) => (
            <Text key={item} style={styles.body}>⚠ {item}</Text>
          ))
        ) : (
          <Text style={styles.body}>No major watchlist items detected.</Text>
        )}

        <Text style={styles.section}>Recommendations</Text>
        {portfolioReview.recommendations.map((item) => (
          <View key={item.title} style={styles.recommendationRow}>
            <Text style={styles.planTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.detail}</Text>
            {item.symbols?.length ? (
              <Text style={styles.link}>Ideas: {item.symbols.join(", ")}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Analysis Center</Text>

        <View style={styles.quickGrid}>
          <QuickCard title="My Holdings" desc="View current positions" route="/holding-details" />
          <QuickCard title="Performance" desc="Track portfolio growth" route="/performance" />
          <QuickCard title="Activity" desc="View portfolio audit trail" route="/portfolio-activity" />
          <QuickCard title="Watchlist" desc="Track stocks and Coach G signals" route="/watchlist" />
          <QuickCard title="Order Book" desc="Review open orders" route="/order-book" />
          <QuickCard title="Trade History" desc="Review completed trades" route="/trade-history" />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Risk & Diversification</Text>
        <Text style={styles.body}>Current risk: {risk}</Text>
        <Text style={styles.body}>
          Largest sector: {largestSector}{" "}
          {largestSectorRow ? `(${largestSectorRow.weight.toFixed(2)}%)` : ""}
        </Text>
        <Text style={styles.body}>
          Coach G monitors sector concentration and redirects new money toward underweight sectors.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Behavior Analysis</Text>
        {buildBehaviorInsights().map((item, index) => (
          <Text key={index} style={styles.body}>• {item}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Performance Attribution</Text>

        <Text style={styles.body}>
          Best performer:{" "}
          {attribution?.bestPerformer
            ? `${attribution.bestPerformer.symbol} (${Number(
                attribution.bestPerformer.profitLossPct || 0
              ).toFixed(2)}%)`
            : "N/A"}
        </Text>

        <Text style={styles.body}>
          Worst performer:{" "}
          {attribution?.worstPerformer
            ? `${attribution.worstPerformer.symbol} (${Number(
                attribution.worstPerformer.profitLossPct || 0
              ).toFixed(2)}%)`
            : "N/A"}
        </Text>

        <Text style={styles.body}>
          Largest position:{" "}
          {attribution?.largestPosition
            ? `${attribution.largestPosition.symbol} - KES ${money(
                attribution.largestPosition.marketValue ||
                  attribution.largestPosition.value
              )}`
            : "N/A"}
        </Text>

        <Text style={styles.body}>
          Most accumulated:{" "}
          {attribution?.mostAccumulated
            ? `${attribution.mostAccumulated.symbol} (${attribution.mostAccumulated.buys} buys)`
            : "N/A"}
        </Text>

        <Text style={styles.body}>
          Most traded:{" "}
          {attribution?.mostTraded
            ? `${attribution.mostTraded.symbol} (${attribution.mostTraded.trades} trades)`
            : "N/A"}
        </Text>

        <Text style={styles.body}>
          Estimated annual dividend income: KES{" "}
          {money(attribution?.estimatedDividendIncome || 0)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Latest Saved Strategy</Text>

        {latestStrategy ? (
          <>
            <Text style={styles.body}>Goal: {latestStrategy.goal}</Text>
            <Text style={styles.body}>Scenario: {latestStrategy.scenario}</Text>
            <Text style={styles.body}>Amount: KES {money(latestStrategy.amount)}</Text>
          </>
        ) : (
          <Text style={styles.body}>
            No saved strategy yet. Run a simulation and save it to your profile.
          </Text>
        )}
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => {
          simulate();
          setShowSimulator(true);
        }}
      >
        <Text style={styles.primaryText}>Simulate Coach G Recommendations</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.section}>What To Avoid</Text>
        <Text style={styles.body}>
          Avoid adding more exposure to {largestSector} unless it supports your goal and risk level.
        </Text>
      </View>

      <SimulatorModal
        visible={showSimulator}
        onClose={() => setShowSimulator(false)}
        goal={goal}
        setGoal={setGoal}
        scenario={scenario}
        setScenario={setScenario}
        amount={amount}
        setAmount={setAmount}
        intensity={intensity}
        setIntensity={setIntensity}
        goalOpen={goalOpen}
        setGoalOpen={setGoalOpen}
        scenarioOpen={scenarioOpen}
        setScenarioOpen={setScenarioOpen}
        simulate={simulate}
        sectorPlan={sectorPlan}
        projectedValue={value + Number(amount || 0)}
        saveRecommendation={saveRecommendation}
        createTradeBasketFromRecommendation={createTradeBasketFromRecommendation}
        setSelectedSector={setSelectedSector}
        showResults={showResults}
        setShowResults={setShowResults}
      />

      <SectorDetailsModal
        sector={selectedSector}
        onClose={() => setSelectedSector(null)}
        buildSectorDetails={buildSectorDetails}
      />
    </ScrollView>
  );
}

function QuickCard({ title, desc, route }) {
  return (
    <Pressable style={styles.quickCard} onPress={() => router.push(route)}>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickDesc}>{desc}</Text>
    </Pressable>
  );
}

function SimulatorModal({
  visible,
  onClose,
  goal,
  setGoal,
  scenario,
  setScenario,
  amount,
  setAmount,
  intensity,
  setIntensity,
  goalOpen,
  setGoalOpen,
  scenarioOpen,
  setScenarioOpen,
  simulate,
  sectorPlan,
  showResults,
  setShowResults,
  projectedValue,
  saveRecommendation,
  createTradeBasketFromRecommendation,
  setSelectedSector
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.simulatorModal}>
          <View style={styles.popupHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.popupTitle}>Coach G Investment Simulator</Text>
              <Text style={styles.body}>
                Test how new money could improve your portfolio.
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.gray}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.dropdownRow}>
            <View style={styles.dropdownHalf}>
              <Dropdown
                label="Investment Goal"
                value={goal}
                open={goalOpen}
                setOpen={setGoalOpen}
                options={[
                  "Dividend Income",
                  "Balanced Growth",
                  "Capital Growth",
                  "Risk Reduction"
                ]}
                onSelect={setGoal}
              />
            </View>

            <View style={styles.dropdownHalf}>
              <Dropdown
                label="Scenario"
                value={scenario}
                open={scenarioOpen}
                setOpen={setScenarioOpen}
                options={["Conservative", "Balanced", "Aggressive"]}
                onSelect={setScenario}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Amount to Invest</Text>

          <TextInput
            value={String(amount)}
            onChangeText={(v) => setAmount(Number(v || 0))}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Rebalance Intensity: {intensity}%</Text>

          <View style={styles.sliderRow}>
            {[25, 50, 75, 100].map((level) => (
              <Pressable
                key={level}
                style={[
                  styles.sliderChip,
                  intensity === level && styles.sliderChipActive
                ]}
                onPress={() => setIntensity(level)}
              >
                <Text
                  style={
                    intensity === level
                      ? styles.sliderTextActive
                      : styles.sliderText
                  }
                >
                  {level}%
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.primary}
            onPress={() => {
              simulate();
              setShowResults(true);
            }}
          >
            <Text style={styles.primaryText}>View Simulation Results</Text>
          </Pressable>

          <Modal visible={showResults} transparent animationType="fade">
            <View style={styles.resultOverlay}>
              <View style={styles.resultModal}>
                <View style={styles.popupHeader}>
                  <Text style={styles.popupTitle}>Simulation Results</Text>

                  <Pressable onPress={() => setShowResults(false)}>
                    <Text style={styles.gray}>Close</Text>
                  </Pressable>
                </View>

                <View style={styles.resultCard}>
                  <Text style={styles.section}>Projected Value</Text>
                  <Text style={styles.metric2}>KES {money(projectedValue)}</Text>
                  <Text style={styles.body}>Risk Direction: IMPROVING</Text>
                </View>

                <View style={styles.buyCard}>
                  <Text style={styles.section}>Buy Recommendations</Text>

                  {sectorPlan
                    .filter((s) => !s.reserve)
                    .slice(0, 3)
                    .map((s) => (
                      <Pressable
                        key={s.sector}
                        style={styles.recommendationRow}
                        onPress={() => setSelectedSector(s)}
                      >
                        <Text style={styles.planTitle}>{s.sector}</Text>
                        <Text style={styles.body}>
                          Allocate KES {money(s.amount)}
                        </Text>
                        <Text style={styles.link}>Sector Details</Text>
                      </Pressable>
                    ))}
                </View>
                
                <Pressable
                  style={styles.primary}
                  onPress={createTradeBasketFromRecommendation}
                >
                  <Text style={styles.primaryText}>Create Trade Basket</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

function Dropdown({ label, value, open, setOpen, options, onSelect }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>

      <Pressable style={styles.dropdown} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownText}>{value}</Text>
        <Text style={styles.dropdownArrow}>⌄</Text>
      </Pressable>

      {open && (
        <View style={styles.dropdownList}>
          {options.map((item) => (
            <Pressable
              key={item}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(item);
                setOpen(false);
              }}
            >
              <Text style={styles.dropdownText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SectorDetailsModal({ sector, onClose, buildSectorDetails }) {
  if (!sector) return null;

  const details = buildSectorDetails(sector);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <View>
              <Text style={styles.popupTitle}>{sector.sector}</Text>
              <Text style={styles.body}>Allocation: KES {money(sector.amount)}</Text>
              <Text style={styles.section}>
                Holdings ({details.holdings.length} securities)
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.gray}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {details.holdings.map((h) => (
              <View key={h.symbol} style={styles.stockRow}>
                <View style={styles.stockLeft}>
                  <Text style={styles.stockSymbol}>{h.symbol}</Text>
                  <Text style={styles.stockName}>{h.name}</Text>
                  <Text style={styles.stockReason}>{h.reason}</Text>
                </View>

                <View style={styles.stockRight}>
                  <Text style={styles.stockShares}>{h.qty} shares</Text>
                  <Text style={styles.marketPrice}>@ KES {money(h.price)}</Text>
                  <Text style={styles.stockValue}>KES {money(h.invested)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summaryStrip}>
            <SummaryItem label="Invested" value={`KES ${money(details.investedTotal)}`} />
            <SummaryItem label="Unused" value={`KES ${money(details.unused)}`} yellow />
            <SummaryItem label="Allocation" value={`KES ${money(sector.amount)}`} />
          </View>

          <View style={styles.dividendBox}>
            <Text style={styles.summaryLabel}>Estimated Annual Dividend</Text>
            <Text style={styles.dividendValue}>
              KES {money(details.expectedDividend)}
            </Text>
          </View>

          {details.unused > 0 && (
            <View style={styles.unused}>
              <Text style={styles.white}>Unused Cash</Text>
              <Text style={styles.metric2}>KES {money(details.unused)}</Text>
              <Text style={styles.body}>
                This amount cannot buy a full additional share and should remain
                in cash.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SummaryItem({ label, value, yellow }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={yellow ? styles.summaryValueYellow : styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function money(v) {
  return Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  title: { fontSize: 34, fontWeight: "900", color: "white" },
  card: {
    marginTop: 18,
    padding: 18,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderColor: "#1e293b",
    borderWidth: 1
  },
  label: { color: "#94a3b8", marginTop: 8 },
  metric: { fontSize: 30, fontWeight: "900", color: "#67e8f9" },
  metric2: { fontSize: 24, fontWeight: "900", color: "white" },
  section: { color: "#67e8f9", fontWeight: "900", marginTop: 8 },
  body: { marginTop: 8, color: "#cbd5e1", lineHeight: 20 },
  white: { color: "white" },
  gray: { color: "#94a3b8" },
  quickGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  quickCard: {
    width: "48%",
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    justifyContent: "center"
  },
  quickTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 16
  },
  quickDesc: {
    color: "#94a3b8",
    marginTop: 6,
    lineHeight: 18,
    fontSize: 12
  },
  primary: {
    marginTop: 20,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 16
  },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 18,
    borderRadius: 16
  },
  primaryText: { color: "white", fontWeight: "900", textAlign: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.72)",
    justifyContent: "flex-start",
    padding: 16,
    paddingTop: 35
  },
  simulatorModal: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: "#020617",
    padding: 20,
    borderRadius: 24,
    borderColor: "#9333ea",
    borderWidth: 1
  },
  popup: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: "#020617",
    padding: 20,
    borderRadius: 24,
    borderColor: "#0891b2",
    borderWidth: 1
  },
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#67e8f9"
  },
  inputLabel: {
    color: "#94a3b8",
    marginTop: 16
  },
  input: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderColor: "#9333ea",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderColor: "#9333ea",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dropdownText: {
    color: "white",
    fontWeight: "800"
  },
  dropdownArrow: {
    color: "white",
    fontSize: 18
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: "#111827",
    borderColor: "#9333ea",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden"
  },
  dropdownItem: {
    padding: 14,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  sliderRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  sliderChip: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#111827",
    borderColor: "#334155",
    borderWidth: 1
  },
  sliderChipActive: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },
  sliderText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "800"
  },
  sliderTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  resultCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1
  },
  buyCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(16,185,129,.10)",
    borderColor: "rgba(16,185,129,.35)",
    borderWidth: 1
  },
  recommendationRow: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#111827"
  },
  planTitle: {
    color: "white",
    fontWeight: "900"
  },
  link: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 6
  },
  stockRow: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#111827",
    borderRadius: 14,
    borderColor: "#1f2937",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  stockLeft: { flex: 1 },
  stockSymbol: { color: "white", fontSize: 16, fontWeight: "900" },
  stockName: { color: "#94a3b8", marginTop: 4 },
  stockReason: { color: "#93c5fd", marginTop: 4, fontSize: 12 },
  stockRight: { alignItems: "flex-end", minWidth: 95 },
  stockShares: { color: "#67e8f9", fontWeight: "900" },
  marketPrice: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  stockValue: { color: "#cbd5e1", marginTop: 4 },
  summaryStrip: {
    marginTop: 18,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "#94a3b8", fontSize: 11 },
  summaryValue: { color: "#67e8f9", fontWeight: "900", marginTop: 5 },
  summaryValueYellow: { color: "#fde047", fontWeight: "900", marginTop: 5 },
  dividendBox: {
    marginTop: 14,
    backgroundColor: "rgba(16,185,129,.10)",
    borderColor: "rgba(16,185,129,.45)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },
  dividendValue: {
    color: "#86efac",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6
  },
  unused: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#1c1917",
    borderColor: "#854d0e",
    borderWidth: 1
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 10
  },
  dropdownHalf: {
    flex: 1
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.75)",
    justifyContent: "center",
    padding: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  resultModal: {
    backgroundColor: "#020617",
    padding: 20,
    borderRadius: 24,
    borderColor: "#9333ea",
    borderWidth: 1,
    maxHeight: "88%"
  }
});