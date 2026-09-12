
import React,{useCallback,useState} from "react";
import {Pressable,ScrollView,StyleSheet,Text,View,
  useWindowDimensions
} from "react-native";
import {router,useFocusEffect,useLocalSearchParams} from "expo-router";
import {loadCanonicalRealWealthMetrics} from "../src/features/wealth-journey/canonicalRealWealthMetricsService";
import {buildDiversifiedRecoveryPortfolioPreview} from "../src/features/wealth-journey/goalRecoveryPortfolioPreviewService";
import {buildRecoveryBasketExecution} from "../src/features/wealth-journey/goalRecoveryBasketHandoffService";
import {buildRecoveryBrokerActionPlan} from "../src/features/wealth-journey/goalRecoveryBrokerActionPlanBridge";
import {saveBasketExecution} from "../src/services/trade/basketExecutionStore";
import {saveBrokerActionPlan} from "../src/services/trade/brokerActionPlanStore";
import {loadBrokerAccounts} from "../src/services/brokers/brokerAccountStore";
import {buildChargesAwareRecoveryBasket} from "../src/features/wealth-journey/goalRecoveryChargesAwareBasketService";

function first(v){return Array.isArray(v)?v[0]:v;}
function num(v){const x=Number(first(v));return Number.isFinite(x)?x:0;}
function maybeNum(v){
  const raw=first(v);
  if(raw===undefined||raw===null||String(raw).trim()==="")return null;
  const x=Number(raw);
  return Number.isFinite(x)?x:null;
}
function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function parseJson(v,fallback){try{return JSON.parse(first(v)||"");}catch{return fallback;}}

// PC-030M20AV3C RESPONSIVE CALIBRATION
export default function GoalRecoveryPortfolioPreview(){
  const { width: av3cWidth } = useWindowDimensions();
  const params=useLocalSearchParams();
  const [state,setState]=useState({
  loading:true,
  error:"",
  preview:null,
  executionAllocation:null,
  chargeSummary:null
});

  const goalName=first(params.goalName)||"Financial Goal";
  const targetAmount=num(params.targetAmount);
  const targetDate=first(params.targetDate)||"";
  const monthlyContribution=num(params.monthlyContribution);
  const recoveryAmount=num(params.recoveryAmount);
  const projectedValueBeforeRecovery=maybeNum(params.projectedValueBeforeRecovery);
  const projectedShortfallBeforeRecovery=maybeNum(params.projectedShortfallBeforeRecovery);
  const allocation=parseJson(params.allocationJson,[]);

  useFocusEffect(useCallback(()=>{load();},[]));

  async function load(){
    try{
      const [metrics,brokerAccounts]=await Promise.all([
        loadCanonicalRealWealthMetrics(),
        loadBrokerAccounts()
      ]);
      const chargeSummary=buildChargesAwareRecoveryBasket({
        allocation,
        accounts:brokerAccounts||[],
        recoveryAmount
      });
      const executionAllocation=chargeSummary?.available?chargeSummary.rows:allocation;
      const preview=buildDiversifiedRecoveryPortfolioPreview({
        holdings:metrics?.holdings||[],
        allocation:executionAllocation,
        recoveryAmount,
        realAvailableCash:metrics?.availableCash||0,
        realNetWorth:metrics?.netWorth,
        chargeSummary,
        goalContext:{goalName,targetAmount,targetDate,monthlyContribution,projectedValueBeforeRecovery,projectedShortfallBeforeRecovery}
      });
      setState({loading:false,error:preview?.available?"":"A diversified allocation is required before projected portfolio review.",preview,executionAllocation,chargeSummary});
    }catch(error){
      setState({loading:false,error:error?.message||"Unable to build projected portfolio review.",preview:null});
    }
  }

  async function prepareBrokerActionPlan(){
    if(!state.preview?.available)return;
    const handoff=buildRecoveryBasketExecution({
      allocation:state.executionAllocation||allocation,recoveryAmount,goalContext:{goalName,targetAmount,targetDate,monthlyContribution}
    });
    if(!handoff?.ok||!handoff?.execution){
      setState((c)=>({...c,error:"The diversified basket could not be prepared for review."}));
      return;
    }
    await saveBasketExecution(handoff.execution);

    const brokerPlan=buildRecoveryBrokerActionPlan({
      execution:handoff.execution,recoveryAmount,goalContext:{goalName,targetAmount,targetDate,monthlyContribution}
    });
    if(!brokerPlan?.ok||!brokerPlan?.plan){
      setState((c)=>({...c,error:"The Broker Action Plan could not be prepared."}));
      return;
    }
    await saveBrokerActionPlan(brokerPlan.plan);

    router.push({pathname:"/basket-execution",params:{mode:"BROKER_PLAN",source:"GOAL_RECOVERY",scenarioFunding:String(recoveryAmount||0),goalName}});
  }

  const p=state.preview;

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, av3cWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" }, av3cWidth < 720 && { paddingHorizontal: 16, paddingBottom: 128 }, av3cWidth < 480 && { paddingHorizontal: 12 }]}>
    <Text style={styles.eyebrow}>COACH G · PROJECTED PORTFOLIO</Text>
    <Text style={[styles.title, av3cWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3cWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Review the portfolio before broker execution</Text>
    <Text style={styles.body}>This is a scenario preview only. It models the proposed diversified recovery basket against the current REAL portfolio without changing holdings or cash.</Text>

    {state.error?<View style={styles.warning}><Text style={styles.warningTitle}>Projection unavailable</Text><Text style={styles.body}>{state.error}</Text></View>:null}
    {state.loading?<Text style={styles.body}>Building projected portfolio…</Text>:null}

    {p?.available?<>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scenario funding</Text>
        <Metric label="REAL available cash" value={`KES ${money(p.current.realAvailableCash)}`}/>
        <Metric label="New recovery scenario funding" value={`KES ${money(p.recoveryAmount)}`}/>
        <Metric label="Planned gross purchases" value={`KES ${money(p.projected.grossInvestedBeforeCharges)}`}/>
        <Metric label="Verified estimated charges" value={p.projected.estimatedCharges!==null?`KES ${money(p.projected.estimatedCharges)}`:"Unavailable"}/>
        {p.projected.estimatedTotalCost!==null?<Metric label="Estimated total basket cost" value={`KES ${money(p.projected.estimatedTotalCost)}`}/>:null}
        {p.projected.allChargesVerified
          ?<Metric label="Scenario funding remaining after estimated charges" value={`KES ${money(p.projected.scenarioFundingRemainingAfterCharges)}`}/>
          :<Metric label="Gross funding remaining before charges" value={`KES ${money(p.projected.grossFundingRemainingBeforeCharges)}`}/>}
        <Text style={styles.note}>{p.projected.allChargesVerified ? "Verified broker fee evidence has been applied and each order remains within its allocated recovery budget." : "Verified broker fee schedules are unavailable for one or more orders. The gross residual shown above is before unknown charges and is not treated as confirmed spendable funding."}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Projected portfolio</Text>
        <Metric label="Current holdings value" value={`KES ${money(p.current.holdingsValue)}`}/>
        <Metric label="Projected holdings value" value={`KES ${money(p.projected.holdingsValueBeforeCharges)}`}/>
        <Metric label="Current REAL net worth" value={`KES ${money(p.current.netWorth)}`}/>
        <Metric label="Scenario net worth before charges" value={`KES ${money(p.projected.scenarioNetWorthBeforeCharges)}`}/>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proposed purchases</Text>
        {p.rows.map((row)=><View key={row.symbol} style={[styles.orderRow, av3cWidth < 480 && { flexDirection: "column" }]}>
          <View style={{flex:1}}>
            <Text style={styles.symbol}>{row.symbol}</Text>
            <Text style={styles.bodySmall}>{row.sector}</Text>
            <Text style={styles.bodySmall}>Qty {row.quantity.toLocaleString()} @ KES {money(row.price)}</Text>
            {row.estimatedCharges!==null&&row.estimatedCharges!==undefined?<Text style={styles.bodySmall}>Verified charges KES {money(row.estimatedCharges)} • total KES {money(row.estimatedTotalCost)}</Text>:<Text style={styles.bodySmall}>Verified charges unavailable</Text>}
          </View>
          <Text style={[styles.value, av3cWidth < 480 && { textAlign: "left" }]}>KES {money(row.projectedGross)}</Text>
        </View>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sector exposure — current → projected</Text>
        {p.sectorProjection.map((row)=><View key={row.sector} style={[styles.sectorRow, av3cWidth < 480 && { flexDirection: "column", alignItems: "flex-start" }]}>
          <Text style={styles.body}>{row.sector}</Text>
          <Text style={styles.value}>{row.currentWeightPct.toFixed(2)}% → {row.projectedWeightPct.toFixed(2)}%</Text>
        </View>)}
        {p.projected.largestSector?<Text style={styles.note}>Largest projected sector: {p.projected.largestSector.sector} at {p.projected.largestSector.projectedWeightPct.toFixed(2)}%.</Text>:null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal context</Text>
        <Metric label="Goal" value={p.goal.goalName}/>
        <Metric label="Target" value={`KES ${money(p.goal.targetAmount)}`}/>
        <Metric label="Target date" value={p.goal.targetDate||"N/A"}/>
        <Metric label="Monthly contribution" value={`KES ${money(p.goal.monthlyContribution)}`}/>
        {p.goal.projectedValueBeforeRecovery!==null?<Metric label="Projected value before recovery" value={`KES ${money(p.goal.projectedValueBeforeRecovery)}`}/>:null}
        {p.goal.projectedShortfallBeforeRecovery!==null?<Metric label="Projected shortfall before recovery" value={`KES ${money(p.goal.projectedShortfallBeforeRecovery)}`}/>:null}
        <Text style={styles.note}>This recovery scenario preserves the goal target, date and monthly contribution. GateCEP does not reclassify the saved goal trajectory until actual broker execution is later imported and verified.</Text>
      </View>

      <View style={styles.safeguard}>
        <Text style={styles.safeguardTitle}>Projection only — nothing has executed</Text>
        <Text style={styles.bodySmall}>No REAL cash, holdings, cost basis, goal, Investor DNA, Practice portfolio or broker execution record has changed.</Text>
      </View>

      <Pressable style={styles.primary} onPress={prepareBrokerActionPlan}><Text style={styles.primaryText}>Continue to Broker Action Plan</Text></Pressable>
      <Pressable style={styles.secondary} onPress={()=>router.back()}><Text style={styles.secondaryText}>Revise diversified allocation</Text></Pressable>
    </>:null}
  </ScrollView>;
}

function Metric({label,value}){return <View style={styles.metricRow}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.value}>{value}</Text></View>;}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:"#020617"},content:{padding:20,paddingBottom:80,gap:16},
  eyebrow:{color:"#22d3ee",fontWeight:"900",fontSize:12},title:{color:"#f8fafc",fontSize:28,fontWeight:"900"},
  body:{color:"#cbd5e1",fontSize:15,lineHeight:22},bodySmall:{color:"#94a3b8",fontSize:12,lineHeight:18},
  card:{backgroundColor:"#111827",borderColor:"#334155",borderWidth:1,borderRadius:18,padding:16,gap:10},
  cardTitle:{color:"#67e8f9",fontWeight:"900",fontSize:18},
  metricRow:{flexDirection:"row",justifyContent:"space-between",gap:16,paddingVertical:5},
  metricLabel:{color:"#94a3b8",flex:1},value:{color:"#f8fafc",fontWeight:"800",textAlign:"right"},
  orderRow:{flexDirection:"row",gap:12,paddingVertical:12,borderBottomColor:"#334155",borderBottomWidth:1},
  symbol:{color:"#f8fafc",fontWeight:"900",fontSize:16},
  sectorRow:{flexDirection:"row",justifyContent:"space-between",gap:12,paddingVertical:8,borderBottomColor:"#334155",borderBottomWidth:1},
  note:{color:"#94a3b8",fontSize:12,lineHeight:18},
  safeguard:{backgroundColor:"#082f49",borderColor:"#22d3ee",borderWidth:1,borderRadius:16,padding:16,gap:6},
  safeguardTitle:{color:"#67e8f9",fontWeight:"900"},
  warning:{backgroundColor:"#451a03",borderColor:"#f59e0b",borderWidth:1,borderRadius:14,padding:14,gap:6},
  warningTitle:{color:"#fde68a",fontWeight:"900"},
  primary:{backgroundColor:"#9333ea",borderRadius:12,padding:15,alignItems:"center"},primaryText:{color:"#fff",fontWeight:"900"},
  secondary:{backgroundColor:"#1e293b",borderRadius:12,padding:15,alignItems:"center"},secondaryText:{color:"#67e8f9",fontWeight:"900"}
});
