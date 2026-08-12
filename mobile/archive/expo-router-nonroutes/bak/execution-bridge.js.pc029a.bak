import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  refreshExecutionBridge
} from "../src/execution/executionBridgeStore";

export default function ExecutionBridge() {
  const [bridge, setBridge] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const data = await refreshExecutionBridge();
    setBridge(data);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Execution Bridge
      </Text>

      <Text style={styles.subtitle}>
        Coach G → Broker Execution Pipeline
      </Text>

      <ActiveUserBanner />

      <SummaryCard
        label="Pending Review"
        value={bridge?.pendingReview?.length || 0}
      />

      <SummaryCard
        label="Ready To Queue"
        value={bridge?.readyToQueue?.length || 0}
      />

      <SummaryCard
        label="Queued"
        value={bridge?.queued?.length || 0}
      />

      <SummaryCard
        label="Completed"
        value={bridge?.completed?.length || 0}
      />

      <SummaryCard
        label="Failed"
        value={bridge?.failed?.length || 0}
      />

      <Pressable
        style={styles.primary}
        onPress={() =>
          router.push("/orders-review")
        }
      >
        <Text style={styles.primaryText}>
          Review Orders
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() =>
          router.push("/trading")
        }
      >
        <Text style={styles.secondaryText}>
          Open Queue Manager
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() =>
          router.push("/oms-orders")
        }
      >
        <Text style={styles.secondaryText}>
          OMS Orders
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() =>
          router.push("/execution-audit")
        }
      >
        <Text style={styles.secondaryText}>
          Execution Audit
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>
        {label}
      </Text>

      <Text style={styles.cardValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#020617"},
  content:{padding:22,paddingTop:70,paddingBottom:120},
  title:{color:"white",fontSize:34,fontWeight:"900"},
  subtitle:{color:"#94a3b8",marginTop:8},
  card:{
    marginTop:16,
    backgroundColor:"#0f172a",
    borderRadius:18,
    padding:18,
    borderWidth:1,
    borderColor:"#1e293b"
  },
  cardLabel:{
    color:"#94a3b8"
  },
  cardValue:{
    color:"white",
    fontSize:32,
    fontWeight:"900",
    marginTop:6
  },
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
  },
  secondary:{
    marginTop:12,
    backgroundColor:"#1e293b",
    padding:16,
    borderRadius:16
  },
  secondaryText:{
    color:"#67e8f9",
    textAlign:"center",
    fontWeight:"900"
  }
});