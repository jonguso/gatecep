import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { userGetItem, userSetItem } from "../src/auth/userStorage";

const BROKER_ACCOUNTS_KEY = "brokerAccounts";
const DEFAULT_BROKER_KEY = "defaultBrokerProfile";

const AVAILABLE_BROKERS = [
  {
    id: "AIB",
    name: "AIB-AXYS",
    shortName: "AIB",
    bestFor: "All-round NSE execution"
  },
  {
    id: "ABC",
    name: "ABC Capital",
    shortName: "ABC",
    bestFor: "Digital onboarding and research"
  },
  {
    id: "NCBA",
    name: "NCBA Investment Bank",
    shortName: "NCBA",
    bestFor: "Banking integration"
  },
  {
    id: "DYER",
    name: "Dyer & Blair",
    shortName: "Dyer",
    bestFor: "Full-service advisory"
  },
  {
    id: "FAIDA",
    name: "Faida Investment Bank",
    shortName: "Faida",
    bestFor: "Retail investor access"
  }
];

export default function BrokerAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [editingBroker, setEditingBroker] = useState(null);
  const [form, setForm] = useState({
    accountNumber: "",
    cdsNumber: "",
    nickname: ""
  });

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const raw = await userGetItem(BROKER_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    setAccounts(Array.isArray(parsed) ? parsed : []);
  }

  const connectedIds = useMemo(() => {
    return accounts
      .filter((item) => item.connected)
      .map((item) => item.id);
  }, [accounts]);

  const availableBrokers = useMemo(() => {
  return AVAILABLE_BROKERS.filter(
    (broker) => !connectedIds.includes(broker.id)
  );
}, [connectedIds]);

  const defaultBroker = accounts.find((item) => item.defaultBroker);

  function startConnect(broker) {
    const existing = accounts.find((item) => item.id === broker.id);

    setEditingBroker(broker);

    setForm({
      accountNumber: existing?.accountNumber || "",
      cdsNumber: existing?.cdsNumber || "",
      nickname: existing?.nickname || broker.shortName || broker.name
    });
  }

  async function saveBrokerConnection() {
    if (!editingBroker) return;

    const now = new Date().toISOString();

    const nextAccount = {
      id: editingBroker.id,
      brokerId: editingBroker.id,
      name: editingBroker.name,
      broker: editingBroker.name,
      shortName: editingBroker.shortName,
      nickname: form.nickname.trim() || editingBroker.shortName,
      accountNumber: form.accountNumber.trim(),
      clientNumber: form.accountNumber.trim(),
      cdsNumber: form.cdsNumber.trim(),
      connected: true,
      linked: true,
      status: "ACTIVE",
      connectionMode: "MANUAL_PROFILE",
      apiMode: "PENDING_BROKER_API",
      bestFor: editingBroker.bestFor,
      defaultBroker: accounts.length === 0,
      connectedAt: now,
      updatedAt: now,
      lastSyncAt: null
    };

    const without = accounts.filter((item) => item.id !== editingBroker.id);
    let next = [nextAccount, ...without];

    if (!next.some((item) => item.defaultBroker)) {
      next = next.map((item, index) => ({
        ...item,
        defaultBroker: index === 0
      }));
    }

    await persistAccounts(next);

    setEditingBroker(null);
    setForm({
      accountNumber: "",
      cdsNumber: "",
      nickname: ""
    });

    Alert.alert("Broker Connected", `${editingBroker.name} profile saved.`);
  }

  async function setDefaultBroker(account) {
    const next = accounts.map((item) => ({
      ...item,
      defaultBroker: item.id === account.id,
      updatedAt: new Date().toISOString()
    }));

    await persistAccounts(next);
  }

  async function disconnectBroker(account) {
    Alert.alert(
      "Disconnect Broker",
      `Disconnect ${account.name}? This will not delete portfolio history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            let next = accounts.filter((item) => item.id !== account.id);

            if (next.length && !next.some((item) => item.defaultBroker)) {
              next = next.map((item, index) => ({
                ...item,
                defaultBroker: index === 0
              }));
            }

            await persistAccounts(next);
          }
        }
      ]
    );
  }

  async function persistAccounts(next) {
    await userSetItem(BROKER_ACCOUNTS_KEY, JSON.stringify(next));

    const defaultAccount =
      next.find((item) => item.defaultBroker) || next[0] || null;

    if (defaultAccount) {
      await userSetItem(
        DEFAULT_BROKER_KEY,
        JSON.stringify({
          id: defaultAccount.id,
          brokerId: defaultAccount.id,
          broker: defaultAccount.name,
          name: defaultAccount.name,
          nickname: defaultAccount.nickname,
          accountNumber: defaultAccount.accountNumber,
          clientNumber: defaultAccount.clientNumber,
          cdsNumber: defaultAccount.cdsNumber,
          connected: defaultAccount.connected,
          linked: defaultAccount.linked,
          defaultBroker: true,
          connectionMode: defaultAccount.connectionMode,
          apiMode: defaultAccount.apiMode,
          status: defaultAccount.status,
          updatedAt: new Date().toISOString()
        })
      );
    }

    setAccounts(next);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Broker Accounts</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Connect broker profiles so GateCEP can route orders and later sync
        holdings, cash, trades, and confirmations.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Metric label="Connected" value={String(accounts.length)} />
        <Metric
          label="Default Broker"
          value={defaultBroker?.shortName || defaultBroker?.name || "None"}
        />
        <Metric label="Execution Mode" value="Broker-Agnostic" />
        <Metric label="API Status" value="Manual Now" />
      </View>

      {editingBroker ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect {editingBroker.name}</Text>

          <Text style={styles.label}>Nickname</Text>
          <TextInput
            value={form.nickname}
            onChangeText={(value) => setForm({ ...form, nickname: value })}
            placeholder="Main Broker"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Text style={styles.label}>Broker Account / Client Number</Text>
          <TextInput
            value={form.accountNumber}
            onChangeText={(value) =>
              setForm({ ...form, accountNumber: value })
            }
            placeholder="Optional for now"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Text style={styles.label}>
  CDS Number (Optional)
</Text>
          <TextInput
            value={form.cdsNumber}
            onChangeText={(value) => setForm({ ...form, cdsNumber: value })}
            placeholder="Optional for now"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Pressable style={styles.primary} onPress={saveBrokerConnection}>
            <Text style={styles.primaryText}>Save Broker Profile</Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={() => setEditingBroker(null)}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connected Brokers</Text>
        {accounts.length === 0 ? (
          <Text style={styles.body}>
            No brokers connected yet. Add a broker profile below.
          </Text>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brokerName}>{account.name}</Text>
                  <Text style={styles.small}>
                    {account.nickname} • {account.status}
                  </Text>
                </View>

                <Text
                  style={
                    account.defaultBroker
                      ? styles.defaultBadge
                      : styles.connectedBadge
                  }
                >
                  {account.defaultBroker ? "DEFAULT" : "CONNECTED"}
                </Text>
              </View>

              <Text style={styles.detail}>
  CDS: {account.cdsNumber || "Not Provided"}
</Text>
        
              <Text style={styles.detail}>
                API Mode: {account.apiMode || "PENDING_BROKER_API"}
              </Text>

              <View style={styles.buttonRow}>
                {!account.defaultBroker ? (
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => setDefaultBroker(account)}
                  >
                    <Text style={styles.smallButtonText}>Set Default</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={styles.smallButton}
                  onPress={() => startConnect(account)}
                >
                  <Text style={styles.smallButtonText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.dangerSmallButton}
                  onPress={() => disconnectBroker(account)}
                >
                  <Text style={styles.dangerSmallText}>Disconnect</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
  <Text style={styles.cardTitle}>Available Brokers</Text>

  {availableBrokers.length === 0 ? (
    <Text style={styles.body}>
      All supported brokers are already connected.
    </Text>
  ) : (
    availableBrokers.map((broker) => (
      <View key={broker.id} style={styles.availableRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brokerName}>{broker.name}</Text>
          <Text style={styles.small}>{broker.bestFor}</Text>
        </View>

        <Pressable
          style={styles.connectButton}
          onPress={() => startConnect(broker)}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </Pressable>
      </View>
    ))
  )}
</View>
         
      <Pressable
  style={styles.primary}
  onPress={() => router.replace("/trading")}
>
  <Text style={styles.primaryText}>Return to Trading</Text>
</Pressable>

    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 110 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  metricLabel: { color: "#94a3b8", fontSize: 12 },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6,
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
  body: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 21
  },
  label: {
    color: "#94a3b8",
    marginTop: 14,
    marginBottom: 7,
    fontSize: 12
  },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  accountCard: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  accountTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  brokerName: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },
  small: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12
  },
  detail: {
    color: "#cbd5e1",
    marginTop: 8,
    fontSize: 12
  },
  defaultBadge: {
    color: "#86efac",
    fontWeight: "900",
    fontSize: 11
  },
  connectedBadge: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 11
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  smallButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  smallButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 12
  },
  dangerSmallButton: {
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  dangerSmallText: {
    color: "#fca5a5",
    fontWeight: "900",
    fontSize: 12
  },
  availableRow: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  connectButton: {
    backgroundColor: "#9333ea",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  connectButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 12
  },
  connectedButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  connectedButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 12
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});