import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../src/features/auth/hooks/useAuth";
import { getInvestorProfile } from "../src/features/profile/api/investorProfileApi";
import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import { getUserCash } from "../src/features/cash/api/userCashApi";
import { getUserBrokers } from "../src/features/brokers/api/userBrokerApi";
import { logout } from "../src/auth/authStore";
import ActiveUserBanner from "../src/components/ActiveUserBanner";

export default function MyProfile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [broker, setBroker] = useState(null);
  const [cash, setCash] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      const [investor, portfolio, cashResult, brokerResult] =
        await Promise.all([
          getInvestorProfile().catch(() => ({ profile: null })),
          loadUnifiedPortfolio().catch(() => ({ holdings: [] })),
          getUserCash().catch(() => ({ summary: { totalCash: 0 } })),
          getUserBrokers().catch(() => ({ brokers: [] }))
        ]);

      const investorProfile =
        investor?.profile || investor?.investorProfile || investor || null;

      const holdings = portfolio?.holdings || [];
      const brokerList = brokerResult?.brokers || [];

      setProfile(investorProfile);
      setBroker(brokerList.length ? brokerList[0] : null);
      setCash(Number(cashResult?.summary?.totalCash || 0));

      setPortfolioValue(
        holdings.reduce(
          (sum, h) => sum + Number(h.marketValue || h.value || 0),
          0
        )
      );
    } catch (error) {
      console.log("My profile load error:", error.message);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const constraints = profile?.constraints || {};
const displayName =
  constraints.name ||
  profile?.name ||
  user?.username ||
  user?.email?.split("@")[0] ||
  "Unknown";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Profile</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Account, investor profile, broker status, and portfolio summary.
      </Text>

      <ActiveUserBanner />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Account</Text>

          <Pressable
            style={styles.editChip}
            onPress={() => router.push("/account-edit")}
          >
            <Text style={styles.editChipText}>Edit</Text>
          </Pressable>
        </View>

        <Info label="Username" value={user?.username || "N/A"} />
        <Info label="Email" value={user?.email || "N/A"} />
        <Info label="User ID" value={user?.id || "N/A"} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Investor Profile</Text>

          <Pressable
            style={styles.editChip}
            onPress={() => router.push("/investor-profile-edit")}
          >
            <Text style={styles.editChipText}>Edit</Text>
          </Pressable>
        </View>

        <Info label="Name" value={constraints.name || profile?.name || "User"} />
        <Info label="Goal" value={profile?.goal || "Not set"} />
        <Info label="Risk" value={profile?.risk || "Not set"} />
        <Info label="Experience" value={profile?.experience || "Not set"} />
        <Info label="Time Horizon" value={profile?.timeHorizon || profile?.time_horizon || "Not set"} />
        <Info label="Contribution" value={profile?.contribution || "Not set"} />
        <Info label="Market Drop Response" value={constraints.marketDrop || "Not set"} />
        <Info label="Starting Amount" value={`KES ${money(constraints.amount || 0)}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker</Text>

        <Info
          label="Status"
          value={broker ? "Connected / Profile Added" : "No broker connected"}
        />
        <Info label="Broker" value={broker?.broker || "N/A"} />
        <Info label="Client Number" value={broker?.clientNumber || "N/A"} />
        <Info label="CDS Number" value={broker?.cdsNumber || "N/A"} />

        <Pressable
          style={styles.secondary}
          onPress={() => router.push("/broker-profile")}
        >
          <Text style={styles.secondaryText}>Update Broker Profile</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Portfolio Summary</Text>

        <Info label="Available Cash" value={`KES ${money(cash)}`} />
        <Info label="Portfolio Value" value={`KES ${money(portfolioValue)}`} />

        <Pressable
          style={styles.secondary}
          onPress={() => router.push("/portfolio-command-center")}
        >
          <Text style={styles.secondaryText}>Open Command Center</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/portfolio-sync-center")}
      >
        <Text style={styles.secondaryText}>Open Sync Center</Text>
      </Pressable>

      <Pressable style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
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
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" },
  editChip: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  editChipText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: { color: "white", fontWeight: "900", marginTop: 4 },
  secondary: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  logout: {
    marginTop: 24,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 18
  },
  logoutText: { color: "#fca5a5", textAlign: "center", fontWeight: "900" }
});