import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as Clipboard from "expo-clipboard";

import {
  generateOrderPack,
  buildText
} from "../src/execution/orderHandoff";
import { router } from "expo-router";
import { userSetItem } from "../src/auth/userStorage";

export default function OrderHandoff() {
  const [pack, setPack] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const result = await generateOrderPack();
    setPack(result);
  }

  async function copyOrders() {
    const text = buildText(pack);

    await Clipboard.setStringAsync(text);

    Alert.alert(
      "Copied",
      "Practice order scenario copied."
    );
  }

async function saveAndReturn() {
  await userSetItem(
    "latestPracticeOrderHandoff",
    JSON.stringify({
      broker: pack?.broker || null,
      orders: pack?.orders || [],
      totalOrders: pack?.totalOrders || 0,
      totalValue: pack?.totalValue || 0,
      status: "PRACTICE_SCENARIO_READY",
      isPractice: true,
      savedAt: new Date().toISOString()
    })
  );

  Alert.alert("Saved", "Order handoff strategy saved.");
  router.replace("/(tabs)/dashboard");
}

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Practice Order Scenario
      </Text>
      
      <Text style={styles.subtitle}>
        Learning-only order scenario. This cannot be submitted to a REAL broker by GateCEP.
      </Text>
   
      <View style={styles.card}>
        <Text style={styles.label}>
          Broker
        </Text>

        <Text style={styles.value}>
          {pack?.broker?.brokerName ||
            "No Broker"}
        </Text>
      </View>

      {pack?.orders?.map((order) => (
        <View
          key={order.id}
          style={styles.order}
        >
          <Text style={styles.symbol}>
            {order.side} {order.symbol}
          </Text>

          <Text style={styles.detail}>
            Qty {order.quantity}
          </Text>

          <Text style={styles.detail}>
            Price {order.price}
          </Text>
        </View>
      ))}

      <Pressable
        style={styles.primary}
        onPress={copyOrders}
      >
        <Text style={styles.primaryText}>
          Copy Practice Scenario
        </Text>
      </Pressable>
<Pressable style={styles.primary} onPress={saveAndReturn}>
  <Text style={styles.primaryText}>Save Strategy and Return to Dashboard</Text>
</Pressable>

<Pressable style={styles.secondary} onPress={() => router.replace("/(tabs)/dashboard")}>
  <Text style={styles.secondaryText}>Dashboard</Text>
</Pressable>
                
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#020617"},
  content:{padding:22,paddingTop:70},
  title:{color:"white",fontSize:32,fontWeight:"900"},
  subtitle:{color:"#94a3b8",marginTop:8},
  card:{
    marginTop:20,
    backgroundColor:"#0f172a",
    padding:18,
    borderRadius:18
  },
  label:{color:"#94a3b8"},
  value:{color:"white",fontWeight:"900",marginTop:6},
  order:{
    marginTop:12,
    backgroundColor:"#0f172a",
    padding:16,
    borderRadius:16
  },
  symbol:{color:"white",fontWeight:"900"},
  detail:{color:"#94a3b8",marginTop:4},
  primary:{
    marginTop:24,
    backgroundColor:"#9333ea",
    padding:18,
    borderRadius:18
  },
  primaryText:{
    color:"white",
    textAlign:"center",
    fontWeight:"900"
  }
});
