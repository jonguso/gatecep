import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions
} from "react-native";
import { router } from "expo-router";

// PC-030M20AV3I RESPONSIVE CALIBRATION
export default function BrokerMarketplace() {
  const { width: windowWidth } = useWindowDimensions();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}
    >
      <Text
        style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}
      >
        Broker Marketplace
      </Text>
      <Text style={styles.subtitle}>
        Connect or review supported NSE brokers.
      </Text>

      {["AIB-AXYS", "ABC Capital", "NCBA Investment Bank", "Faida", "Genghis Capital"].map(
        (broker) => (
          <View key={broker} style={styles.card}>
            <Text style={styles.broker}>{broker}</Text>

            <Pressable
              style={styles.primary}
              onPress={() => router.push("/link-broker-account")}
            >
              <Text style={styles.primaryText}>Connect</Text>
            </Pressable>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10 },
  card: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18
  },
  broker: { color: "white", fontSize: 18, fontWeight: "900" },
  primary: {
    marginTop: 14,
    backgroundColor: "#9333ea",
    padding: 14,
    borderRadius: 14
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" }
});