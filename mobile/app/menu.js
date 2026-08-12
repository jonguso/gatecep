import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/features/auth/hooks/useAuth";

import { getCurrentSession, logout } from "../src/auth/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUILD_INFO } from "../src/config/buildInfo";


const items = [
  {
  title: "My Journey",
  detail: "Learning progress, Coach G guidance, goals, and portfolio summary",
  route: "/(tabs)/dashboard"
},

   {
  title: "My Profile",
  detail: "View account, investor profile, broker, and cash details",
  route: "/my-profile"
},

{
  title: "Portfolio Sync Center",
  detail: "Sync holdings, cash, statements, and transaction history",
  route: "/portfolio-sync-center"
},

  {
    title: "Upload Center",
    detail: "Upload valuation, statement, holdings, and order history",
    route: "/broker-upload"
  },
  {
    title: "Broker Profile",
    detail: "Update Broker profile",
    route: "/broker-profile"
  },
{
  title: "Activity",
  detail: "View buys, sells, deposits, withdrawals, dividends, and fees",
  route: "/portfolio-activity"
},
{
  title: "Coach G",
  detail: "Personalized portfolio, cash, risk, and wealth recommendations",
  route: "/(tabs)/coach"
},
{
  title: "Wealth Journey",
  detail: "Goals, progress, reconciliation, and Coach G guidance over time",
  route: "/wealth-journey"
},

  {
    title: "Manual Portfolio Entry",
    detail: "Enter holdings manually",
    route: "/manual-portfolio-entry"
  }
];

export default function Menu() {

const { user } = useAuth();
const [session, setSession] = useState(null);

useEffect(() => {
  loadSession();
}, []);

async function loadSession() {
  const current = await getCurrentSession();
  setSession(current);
}

async function handleLogout() {
  await logout();

  await AsyncStorage.removeItem("gatecepSession");
  await AsyncStorage.removeItem("gatecepCurrentUserId");
  await AsyncStorage.setItem("gatecepIsLoggedIn", "false");

  router.replace("/login");
}

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Menu</Text>

      <Text style={styles.subtitle}>
        Setup, maintenance, uploads, profile, and support actions.
      </Text>
     
       <View style={styles.userCard}>
  <Text style={styles.userLabel}>Logged in as</Text>
  <Text style={styles.userName}>
    {user?.username || user?.email || "User"}
  </Text>
</View>

      {items.map((item) => (
        <Pressable
          key={item.title}
          style={styles.item}
          onPress={() => router.push(item.route)}
        >
          <View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDetail}>{item.detail}</Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}

      <Pressable
  style={styles.logout}
  onPress={handleLogout}
>
  <Text style={styles.logoutText}>Logout</Text>
</Pressable>

    </ScrollView>
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
    paddingBottom: 40
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22
  },
  item: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  itemTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 16
  },

userCard: {
  marginTop: 16,
  backgroundColor: "#0f172a",
  borderColor: "#1e293b",
  borderWidth: 1,
  borderRadius: 18,
  padding: 16
},

userLabel: {
  color: "#94a3b8",
  fontSize: 12
},

userName: {
  color: "#67e8f9",
  fontSize: 18,
  fontWeight: "900",
  marginTop: 4
},

  itemDetail: {
    color: "#94a3b8",
    marginTop: 6,
    maxWidth: 290
  },
  arrow: {
    color: "#c084fc",
    fontSize: 26,
    fontWeight: "900"
  },
  logout: {
    marginTop: 24,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 18
  },
  logoutText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900"
  }
});