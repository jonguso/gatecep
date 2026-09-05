import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { loadTradingHubData } from "../../src/services/trade/tradingHubStore";
import { ContainedPanel } from "../../src/components/mobile/MobileUI";

const TABS = ["Account", "Orders", "Depth", "Activity"];
export default function Trading() {
  const [tab,setTab]=useState("Account"), [data,setData]=useState(null), [error,setError]=useState("");
  const load=useCallback(async()=>{try{setError("");setData(await loadTradingHubData());}catch(e){setData(null);setError(e?.message||"Verified broker information is unavailable.");}},[]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const broker=data?.broker, cash=Number(data?.cash||0);
  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <View style={s.header}><View style={{flex:1}}><Text style={s.title}>Trading</Text><Text style={s.subtitle}>Read-only broker account, order, depth, and execution evidence.</Text></View><Pressable style={s.headerButton} onPress={()=>router.replace("/(tabs)/dashboard")}><Text style={s.headerButtonText}>Home</Text></Pressable></View>
    <ActiveUserBanner />
    <View style={s.notice}><Text style={s.noticeTitle}>Broker controlled</Text><Text style={s.body}>GateCEP does not submit trades, move money, or mark orders filled. Records appear only from a verified broker connection or import.</Text></View>
    <View style={s.tabs}>{TABS.map(x=><Pressable key={x} style={[s.tab,tab===x&&s.activeTab]} onPress={()=>setTab(x)}><Text style={tab===x?s.activeTabText:s.tabText}>{x}</Text></Pressable>)}</View>
    <ContainedPanel title={tab} subtitle="One trading view at a time" testID="trading-contained-panel">
      {error?<Unavailable title="Trading data unavailable" message={error}/>:null}
      {!error&&tab==="Account"?<><View style={s.card}><Text style={s.label}>Trading account</Text><Text style={s.cardTitle}>{broker?.broker||broker?.name||"No verified broker account"}</Text><Text style={s.body}>Client: {broker?.clientNumber||broker?.accountNumber||"Unavailable"}</Text><Text style={s.body}>Available cash: {data?.cashAvailable?`KES ${money(cash)}`:"Unavailable until a verified statement is loaded"}</Text></View><Pressable style={s.primary} onPress={()=>router.push("/broker-accounts")}><Text style={s.primaryText}>{broker?"Manage Broker Account":"Connect Broker Account"}</Text></Pressable><Pressable style={s.secondary} onPress={()=>router.push("/portfolio-sync-center")}><Text style={s.secondaryText}>Sync Broker Evidence</Text></Pressable></>:null}
      {!error&&tab==="Orders"?<Unavailable title="Verified broker orders" message="No verified broker order feed is connected. GateCEP will not display locally simulated orders as broker orders."/>:null}
      {!error&&tab==="Depth"?<Unavailable title="Verified market depth" message="Level 2 order-book depth is unavailable until a licensed NSE or broker depth feed is connected. Local EOD prices are not market depth."/>:null}
      {!error&&tab==="Activity"?<Unavailable title="Verified execution activity" message="No verified broker execution feed is connected. Completed transactions can be reviewed after broker import or API synchronization." action="Open Portfolio Activity" onPress={()=>router.push("/portfolio-activity")}/>:null}
    </ContainedPanel>
  </ScrollView>;
}
function Unavailable({title,message,action,onPress}){return <View style={s.unavailable}><Text style={s.cardTitle}>{title}</Text><Text style={s.body}>{message}</Text>{action?<Pressable style={s.secondary} onPress={onPress}><Text style={s.secondaryText}>{action}</Text></Pressable>:null}</View>}
function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:"#020617"},content:{padding:22,paddingTop:70,paddingBottom:120},header:{flexDirection:"row",alignItems:"center",gap:12},title:{color:"white",fontSize:34,fontWeight:"900"},subtitle:{color:"#94a3b8",marginTop:7,lineHeight:21},headerButton:{backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,borderRadius:14,paddingHorizontal:15,paddingVertical:11},headerButtonText:{color:"#67e8f9",fontWeight:"900"},notice:{marginTop:18,padding:16,borderRadius:20,backgroundColor:"rgba(6,182,212,.10)",borderColor:"rgba(6,182,212,.4)",borderWidth:1},noticeTitle:{color:"#67e8f9",fontWeight:"900",fontSize:18},body:{color:"#cbd5e1",marginTop:8,lineHeight:21},tabs:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:18},tab:{backgroundColor:"#1e293b",paddingHorizontal:14,paddingVertical:10,borderRadius:14},activeTab:{backgroundColor:"#9333ea"},tabText:{color:"#94a3b8",fontWeight:"900"},activeTabText:{color:"white",fontWeight:"900"},card:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#1e293b",borderWidth:1},label:{color:"#94a3b8",fontSize:12},cardTitle:{color:"white",fontWeight:"900",fontSize:19,marginTop:5},unavailable:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#334155",borderWidth:1},primary:{marginTop:16,padding:16,borderRadius:16,backgroundColor:"#9333ea",alignItems:"center"},primaryText:{color:"white",fontWeight:"900"},secondary:{marginTop:12,padding:15,borderRadius:16,backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,alignItems:"center"},secondaryText:{color:"#67e8f9",fontWeight:"900"}});
