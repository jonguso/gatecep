import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { userGetItem } from "../src/auth/userStorage";
import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { buildSyncStatus } from "../src/portfolio/syncStatus";

export default function PortfolioSyncCenter() {
  const [cash, setCash] = useState(0);
  const [holdingsCount, setHoldingsCount] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioUploaded, setPortfolioUploaded] = useState(false);
  const [cashUploaded, setCashUploaded] = useState(false);
  const [transactionsUploaded, setTransactionsUploaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [portfolioSource, setPortfolioSource] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const portfolio = await loadUnifiedPortfolio();
    const holdings = portfolio?.holdings || [];
    const cashRaw = await userGetItem("availableCash");
    const portfolioUploadedRaw = await userGetItem("statementUploaded");
    const cashUploadedRaw = await userGetItem("cashStatementUploaded");
    const transactionsUploadedRaw = await userGetItem("transactionsUploaded");
    const status = await buildSyncStatus();
    setSyncStatus(status);

    setCash(Number(cashRaw || 0));
    setHoldingsCount(holdings.length);
    setPortfolioValue(
      holdings.reduce(
        (sum, h) => sum + Number(h.marketValue || h.value || 0),
        0
      )
    );

    setPortfolioUploaded(portfolioUploadedRaw === "true");
    setCashUploaded(cashUploadedRaw === "true");
    setTransactionsUploaded(transactionsUploadedRaw === "true");
    setPortfolioSource(portfolio?.priceSource || portfolio?.source || "");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Portfolio Sync Center</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Sync holdings, cash, transactions, and Coach G intelligence from one
        place.
      </Text>

      <ActiveUserBanner />

      {portfolioSource ? (
  <Text style={styles.syncNote}>Portfolio source: {portfolioSource}</Text>
) : null}

<View style={styles.summary}>
        <Metric label="Holdings" value={String(holdingsCount)} />
        <Metric label="Portfolio" value={`KES ${money(portfolioValue)}`} />
        <Metric label="Cash" value={`KES ${money(cash)}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Status</Text>

        <StatusRow label="Portfolio Valuation" done={portfolioUploaded} />
        <StatusRow label="Cash Statement" done={cashUploaded} />
        <StatusRow label="Transaction History" done={transactionsUploaded} />
      </View>

       <View style={styles.card}>
  <Text style={styles.cardTitle}>Portfolio Sync Status</Text>

  <StatusRow
    label="Broker"
    done={syncStatus?.brokerConnected}
    value={syncStatus?.broker || "No broker"}
  />

  <StatusRow
    label="Portfolio Holdings"
    done={Number(syncStatus?.holdingsCount || 0) > 0}
    value={`${syncStatus?.holdingsCount || 0} holdings`}
  />

  <StatusRow
    label="Transactions"
    done={Number(syncStatus?.transactionCount || 0) > 0}
    value={`${syncStatus?.transactionCount || 0} records`}
  />

  <StatusRow
    label="Available Cash"
    done={Number(syncStatus?.availableCash || 0) > 0}
    value={`KES ${money(syncStatus?.availableCash || 0)}`}
  />

  <Text style={styles.syncNote}>
    Last updated:{" "}
    {syncStatus?.updatedAt
      ? new Date(syncStatus.updatedAt).toLocaleString()
      : "N/A"}
  </Text>
</View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload & Sync</Text>

        <SyncAction
          title="Upload Portfolio Valuation"
          detail="Import holdings and market value from broker valuation."
          route="/broker-upload"
        />

        <SyncAction
          title="Upload Cash Statement"
          detail="Import available cash, ledger balance, or trading space."
          route="/funds"
        />

        <SyncAction
          title="Upload Transaction History"
          detail="Import buy/sell activity for Coach G behavior analysis."
          route="/transactions-upload"
        />

        <SyncAction
          title="Manual Portfolio Entry"
          detail="Manually enter or edit holdings."
          route="/manual-portfolio-entry"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>After Sync</Text>

        <Text style={styles.body}>
          Gatecep updates Dashboard, Holdings, Performance, Coach G Insights,
          Watchlist, and Portfolio Activity using the latest synced data.
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/coach-insights")}
        >
          <Text style={styles.primaryText}>Open Coach G Insights</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}


function StatusRow({ label, done, value }) {
  return (
    <View style={styles.statusRow}>
      <View>
        <Text style={styles.statusLabel}>{label}</Text>
        {value ? <Text style={styles.statusValue}>{value}</Text> : null}
      </View>

      <Text style={done ? styles.done : styles.missing}>
        {done ? "SYNCED" : "MISSING"}
      </Text>
    </View>
  );
}

function SyncAction({ title, detail, route }) {
  return (
    <Pressable style={styles.syncAction} onPress={() => router.push(route)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
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
    padding: 22,
    paddingTop: 70,
    paddingBottom: 100
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    flex: 1
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
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
  summary: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10
  },
  metric: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
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
    marginTop: 8,
    fontSize: 13
  },
  card: {
    marginTop: 20,
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
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  statusLabel: {
    color: "white",
    fontWeight: "800"
  },
  done: {
    color: "#86efac",
    fontWeight: "900"
  },
  missing: {
    color: "#fca5a5",
    fontWeight: "900"
  },
  syncAction: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  actionTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 15
  },
  actionDetail: {
    color: "#94a3b8",
    marginTop: 5,
    lineHeight: 18,
    fontSize: 12
  },
  arrow: {
    color: "#c084fc",
    fontSize: 28,
    fontWeight: "900"
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginTop: 8
  },
  primary: {
    marginTop: 18,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 16
  },

statusValue: {
  color: "#94a3b8",
  marginTop: 4,
  fontSize: 12
},

syncNote: {
  color: "#64748b",
  marginTop: 14,
  fontSize: 12
},

  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  }
});