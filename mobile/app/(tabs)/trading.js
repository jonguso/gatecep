import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { loadTradingHubData } from "../../src/services/trade/tradingHubStore";
import { ContainedPanel } from "../../src/components/mobile/MobileUI";

import {
  buildDecisionLabBaseline,
  buildRecoveryStressTable
} from "../../src/features/trading/coachGDecisionLabService";
const TABS = ["Account", "Orders", "Depth", "Activity"];

/* PC-030M20AQ2 Decision Lab Home — read-only analytical entry point.
 * Uses inline styles deliberately so this patch does not depend on the host
 * file's StyleSheet.create formatting or closing syntax.
 */
function DecisionLabHome({ data }) {
  const holdings =
    (Array.isArray(data?.portfolio) && data.portfolio) ||
    (Array.isArray(data?.holdings) && data.holdings) ||
    (Array.isArray(data?.brokerPortfolio) && data.brokerPortfolio) ||
    [];

  const availableCash = Number(
    data?.cash ??
    data?.availableCash ??
    data?.cashBalance ??
    data?.broker?.availableCash ??
    0
  );

  const baseline = buildDecisionLabBaseline({ holdings, availableCash });
  const recoveryStress = buildRecoveryStressTable();

  const ui = {
    hero: { backgroundColor: "#10243e", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
    eyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
    title: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 5, marginBottom: 6 },
    body: { color: "#cbd5e1", lineHeight: 20 },
    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    primary: { flex: 1, backgroundColor: "#0891b2", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
    primaryText: { color: "#ffffff", fontWeight: "900" },
    secondary: { flex: 1, borderColor: "#67e8f9", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, alignItems: "center" },
    secondaryText: { color: "#67e8f9", fontWeight: "900" },
    card: { backgroundColor: "#111c2e", borderColor: "#243b53", borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
    cardTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900", marginBottom: 7 },
    note: { color: "#94a3b8", fontSize: 12, marginTop: 8 },
    recoveryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopColor: "#243b53", borderTopWidth: 1, paddingVertical: 8 },
    recoveryLoss: { color: "#fca5a5", fontWeight: "800" },
    recoveryNeed: { color: "#fde68a", fontWeight: "800", textAlign: "right", flex: 1 },
    link: { marginTop: 10, borderColor: "#475569", borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
    linkText: { color: "#cbd5e1", fontWeight: "800" },
    evidence: { color: "#67e8f9", fontSize: 13, fontWeight: "900", letterSpacing: 1, marginTop: 4, marginBottom: 8 }
  };

  return (
    <>
      <View style={ui.hero}>
        <Text style={ui.eyebrow}>COACH G DECISION LAB</Text>
        <Text style={ui.title}>What happens if I do this?</Text>
        <Text style={ui.body}>
          Test a hypothetical investment decision against your portfolio, goals,
          liquidity, concentration and recovery risk before you act. This does
          not place a REAL trade or change your portfolio.
        </Text>

        <View style={ui.actions}>
          <Pressable
            style={ui.primary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "BUY", decisionLab: "1" }
              })
            }
          >
            <Text style={ui.primaryText}>Simulate a Buy</Text>
          </Pressable>

          <Pressable
            style={ui.secondary}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: { mode: "AVERAGE_COST", side: "SELL", decisionLab: "1" }
              })
            }
          >
            <Text style={ui.secondaryText}>Simulate a Sell</Text>
          </Pressable>
        </View>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Current Decision Baseline</Text>
        <Text style={ui.body}>
          Holdings: {baseline.holdingsCount} • Portfolio evidence: KES {money(baseline.holdingsValue)}
        </Text>
        <Text style={ui.body}>Available cash: KES {money(baseline.availableCash)}</Text>
        <Text style={ui.body}>
          Largest position: {baseline.largestHolding || "N/A"}
          {baseline.largestHolding ? ` • ${baseline.largestHoldingWeight}%` : ""}
        </Text>
        <Text style={ui.note}>
          Detailed scenarios compare CURRENT vs PROJECTED. Projected values never overwrite REAL holdings.
        </Text>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Risk & Recovery — what “Aggressive” means</Text>
        <Text style={ui.body}>
          Coach G must explain risk from evidence such as concentration, liquidity,
          goal impact and downside. Recovery percentages are mathematical stress
          tests, not return forecasts.
        </Text>
        {recoveryStress.map((row) => (
          <View key={row.lossPercent} style={ui.recoveryRow}>
            <Text style={ui.recoveryLoss}>-{row.lossPercent}% loss</Text>
            <Text style={ui.recoveryNeed}>needs +{row.recoveryPercent}% to recover</Text>
          </View>
        ))}
        <Pressable style={ui.link} onPress={() => router.push("/wealth-journey")}>
          <Text style={ui.linkText}>Review Goal & Recovery Context</Text>
        </Pressable>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>Decision path</Text>
        <Text style={ui.body}>
          Explore → test portfolio and goal impact → understand risk and recovery → compare → save preferred scenario → Broker Action Plan.
        </Text>
        <Pressable
          style={ui.link}
          onPress={() =>
            router.push({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })
          }
        >
          <Text style={ui.linkText}>Review Broker Action Plan</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function Trading() {
  const [tab,setTab]=useState("Account"), [data,setData]=useState(null), [error,setError]=useState("");
  const load=useCallback(async()=>{try{setError("");setData(await loadTradingHubData());}catch(e){setData(null);setError(e?.message||"Verified broker information is unavailable.");}},[]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const broker=data?.broker, cash=Number(data?.cash||0);
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <View style={s.header}><View style={{flex:1}}><Text style={s.title}>Trading</Text><Text style={s.subtitle}>Test investment decisions against your portfolio, goals and risk before you act.</Text></View><Pressable style={s.headerButton} onPress={()=>router.replace("/(tabs)/dashboard")}><Text style={s.headerButtonText}>Home</Text></Pressable></View>
          {/* PC-030M20AQ3 UI consolidation — account context first; legacy broker evidence UI removed. */}
      <ActiveUserBanner />

      <DecisionLabHome data={data} />

</ScrollView>;
}
function Unavailable({title,message,action,onPress}){return <View style={s.unavailable}><Text style={s.cardTitle}>{title}</Text><Text style={s.body}>{message}</Text>{action?<Pressable style={s.secondary} onPress={onPress}><Text style={s.secondaryText}>{action}</Text></Pressable>:null}</View>}
function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:"#020617"},content:{padding:22,paddingTop:70,paddingBottom:120},header:{flexDirection:"row",alignItems:"center",gap:12},title:{color:"white",fontSize:34,fontWeight:"900"},subtitle:{color:"#94a3b8",marginTop:7,lineHeight:21},headerButton:{backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,borderRadius:14,paddingHorizontal:15,paddingVertical:11},headerButtonText:{color:"#67e8f9",fontWeight:"900"},notice:{marginTop:18,padding:16,borderRadius:20,backgroundColor:"rgba(6,182,212,.10)",borderColor:"rgba(6,182,212,.4)",borderWidth:1},noticeTitle:{color:"#67e8f9",fontWeight:"900",fontSize:18},body:{color:"#cbd5e1",marginTop:8,lineHeight:21},tabs:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:18},tab:{backgroundColor:"#1e293b",paddingHorizontal:14,paddingVertical:10,borderRadius:14},activeTab:{backgroundColor:"#9333ea"},tabText:{color:"#94a3b8",fontWeight:"900"},activeTabText:{color:"white",fontWeight:"900"},card:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#1e293b",borderWidth:1},label:{color:"#94a3b8",fontSize:12},cardTitle:{color:"white",fontWeight:"900",fontSize:19,marginTop:5},unavailable:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#334155",borderWidth:1},primary:{marginTop:16,padding:16,borderRadius:16,backgroundColor:"#9333ea",alignItems:"center"},primaryText:{color:"white",fontWeight:"900"},secondary:{marginTop:12,padding:15,borderRadius:16,backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,alignItems:"center"},secondaryText:{color:"#67e8f9",fontWeight:"900"}});
