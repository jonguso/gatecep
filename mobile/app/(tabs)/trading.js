import RecoveryRecommendationSelector from "../../src/components/coach/RecoveryRecommendationSelector";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Modal, TextInput,
  useWindowDimensions
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { loadTradingHubData } from "../../src/services/trade/tradingHubStore";
import { ContainedPanel } from "../../src/components/mobile/MobileUI";

import {
  buildAccommodationAnalysis,
  buildAlternativeComparison
} from "../../src/features/trading/coachGDecisionAccommodationService";
import { NSE_SECURITIES, getSecurityBySymbol } from "../../src/utils/nseSecurityMaster";
import {
  DECISION_SOURCES,
  createDecisionScenario,
  buildDecisionConversation
} from "../../src/features/trading/coachGDecisionConversationService";
import {
  buildDecisionLabBaseline,
  buildRecoveryStressTable
} from "../../src/features/trading/coachGDecisionLabService";
import {
  normalizeDecisionEntryContext,
  buildEntryDialogue,
  summarizeInvestorTurn,
  buildAccommodationDialogue,
  buildAlternativeDialogue,
  appendDialogueTurn
} from "../../src/features/trading/coachGDecisionDialogueService";
import { startDecisionConversation } from "../../src/features/trading/coachGDecisionConversationSession";
const TABS = ["Account", "Orders", "Depth", "Activity"];

/* PC-030M20AQ2 Decision Lab Home — PC-030M20AR conversational extension. */
function DecisionLabHome({ data, entryParams }) {
  const { width: decisionWidth } = useWindowDimensions();
  const [recoveryOwnWhatIf, setRecoveryOwnWhatIf] = useState(false); // PC-030M20AU recommendation selector

  const recoveryRecommendationEntry =
    String(entryParams?.decisionSource || "").toUpperCase() === "COACH_G_RECOVERY";
 // PC-030M20AR9 action-aware controls
  const [conversationOpen, setConversationOpen] = React.useState(false);
  const [ideaSource, setIdeaSource] = React.useState(DECISION_SOURCES.DIRECT);
  const [ideaSide, setIdeaSide] = React.useState("BUY");
  const [ideaSymbol, setIdeaSymbol] = React.useState("");
  const [securityQuery, setSecurityQuery] = React.useState("");
  const [securityPickerError, setSecurityPickerError] = React.useState("");
  const [securityDropdownOpen, setSecurityDropdownOpen] = React.useState(false); // PC-030M20AR7 canonical NSE dropdown
  const [ideaAmount, setIdeaAmount] = React.useState("");
  const [ideaReason, setIdeaReason] = React.useState("");
  const [ideaPriority, setIdeaPriority] = React.useState("");
  const [ideaNotes, setIdeaNotes] = React.useState("");
  const [coachTurn, setCoachTurn] = React.useState(null);
  const [accommodation, setAccommodation] = React.useState(null);
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [dialogueTurns, setDialogueTurns] = React.useState([]);
  const recoveryOpenedRef = React.useRef(false);
  const entryContext = normalizeDecisionEntryContext(entryParams || {});

  const selectedSecurity = React.useMemo(() => NSE_SECURITIES.find(x => String(x.symbol||"").toUpperCase() === String(ideaSymbol||"").toUpperCase()) || null, [ideaSymbol]);
  const securityMatches = React.useMemo(() => {
    const q=String(securityQuery||"").trim().toLowerCase();
    if(!q) return [];
    return NSE_SECURITIES.filter(x => [x.symbol,x.name,...(Array.isArray(x.aliases)?x.aliases:[])].some(v=>String(v||"").toLowerCase().includes(q))).slice(0,8);
  }, [securityQuery]);
  function chooseSecurity(security) {
    setIdeaSymbol(String(security?.symbol||"").toUpperCase());
    setSecurityQuery("");
    setSecurityPickerError("");
    setSecurityDropdownOpen(false);
    setCoachTurn(null); setAccommodation(null); setShowAlternatives(false);
  }
  function changeSecurityQuery(value) {
    setSecurityQuery(value);
    setSecurityPickerError("");
  }
  function toggleSecurityDropdown() {
    setSecurityDropdownOpen(open => !open);
    setSecurityQuery("");
    setSecurityPickerError("");
  }
  const holdings = (Array.isArray(data?.portfolio) && data.portfolio) || (Array.isArray(data?.holdings) && data.holdings) || (Array.isArray(data?.brokerPortfolio) && data.brokerPortfolio) || [];
  const rawCash = data?.cash ?? data?.availableCash ?? data?.cashBalance ?? data?.broker?.availableCash;
  const evidenceAvailable = holdings.length > 0 || rawCash !== null && rawCash !== undefined;
  const availableCash = Number(rawCash || 0);
  const baseline = buildDecisionLabBaseline({ holdings, availableCash });
  const recoveryStress = buildRecoveryStressTable();
  const ui = {
    hero:{backgroundColor:"#10243e",borderColor:"#22d3ee",borderWidth:1,borderRadius:18,padding:16,marginBottom:12}, eyebrow:{color:"#67e8f9",fontSize:11,fontWeight:"900",letterSpacing:1}, title:{color:"#fff",fontSize:22,fontWeight:"900",marginTop:5,marginBottom:6}, body:{color:"#cbd5e1",lineHeight:20}, actions:{flexDirection:"row",gap:10,marginTop:14,flexWrap:"wrap"}, primary:{flex:1,minWidth:150,backgroundColor:"#0891b2",paddingVertical:12,paddingHorizontal:10,borderRadius:12,alignItems:"center"}, primaryText:{color:"#fff",fontWeight:"900"}, secondary:{flex:1,minWidth:150,borderColor:"#67e8f9",borderWidth:1,paddingVertical:12,paddingHorizontal:10,borderRadius:12,alignItems:"center"}, secondaryText:{color:"#67e8f9",fontWeight:"900"}, card:{backgroundColor:"#111c2e",borderColor:"#243b53",borderWidth:1,borderRadius:16,padding:14,marginBottom:12}, cardTitle:{color:"#fff",fontSize:17,fontWeight:"900",marginBottom:7}, note:{color:"#94a3b8",fontSize:12,marginTop:8}, recoveryRow:{flexDirection:"row",justifyContent:"space-between",gap:12,borderTopColor:"#243b53",borderTopWidth:1,paddingVertical:8}, recoveryLoss:{color:"#fca5a5",fontWeight:"800"}, recoveryNeed:{color:"#fde68a",fontWeight:"800",textAlign:"right",flex:1}, link:{marginTop:10,borderColor:"#475569",borderWidth:1,borderRadius:10,padding:10,alignItems:"center"}, linkText:{color:"#cbd5e1",fontWeight:"800"}, modalShade:{flex:1,backgroundColor:"rgba(0,0,0,0.72)",justifyContent:"flex-end"}, modal:{backgroundColor:"#071426",borderTopColor:"#22d3ee",borderTopWidth:1,borderTopLeftRadius:22,borderTopRightRadius:22,padding:18,maxHeight:"92%"}, input:{backgroundColor:"#111c2e",borderColor:"#334155",borderWidth:1,borderRadius:10,color:"#fff",padding:11,marginTop:7}, chipRow:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:8}, chip:{borderColor:"#475569",borderWidth:1,borderRadius:999,paddingVertical:8,paddingHorizontal:11}, chipOn:{backgroundColor:"#164e63",borderColor:"#67e8f9"}, chipText:{color:"#cbd5e1",fontWeight:"700"}, coach:{backgroundColor:"#10243e",borderColor:"#22d3ee",borderWidth:1,borderRadius:14,padding:12,marginVertical:10}, option:{backgroundColor:"#0f172a",borderColor:"#334155",borderWidth:1,borderRadius:12,padding:12,marginTop:9}, optionTitle:{color:"#fff",fontWeight:"900"}, metric:{color:"#67e8f9",fontWeight:"900",marginTop:5}, warning:{color:"#fbbf24",fontWeight:"800",marginTop:7}, transcript:{marginTop:12,gap:8}, bubbleCoach:{alignSelf:"flex-start",maxWidth:"92%",backgroundColor:"#10243e",borderColor:"#155e75",borderWidth:1,borderRadius:14,borderBottomLeftRadius:4,padding:11}, bubbleInvestor:{alignSelf:"flex-end",maxWidth:"92%",backgroundColor:"#312e81",borderColor:"#6366f1",borderWidth:1,borderRadius:14,borderBottomRightRadius:4,padding:11}, bubbleRole:{color:"#94a3b8",fontSize:10,fontWeight:"900",letterSpacing:.8,marginBottom:4}, question:{color:"#fff",fontWeight:"900",marginTop:6,lineHeight:20}, securityList:{marginTop:6,borderColor:"#334155",borderWidth:1,borderRadius:10,overflow:"hidden"}, securityChoice:{paddingVertical:10,paddingHorizontal:11,backgroundColor:"#0f172a",borderBottomColor:"#1e293b",borderBottomWidth:1}, securityChoiceTitle:{color:"#fff",fontWeight:"900"}, securityChoiceMeta:{color:"#94a3b8",fontSize:12,marginTop:2}, securitySelected:{color:"#67e8f9",fontSize:12,fontWeight:"800",marginTop:6}, inputError:{color:"#fca5a5",fontSize:12,fontWeight:"800",marginTop:6}
  };

  function addDialogueTurn(turn) {
    setDialogueTurns(previous => appendDialogueTurn(previous, turn));
  }
  function beginDialogue(source, side="BUY", context=null) {
    setIdeaSource(source);
    setIdeaSide(side);
    setIdeaSymbol(""); setSecurityQuery(""); setSecurityPickerError(""); setSecurityDropdownOpen(false);
    setCoachTurn(null);
    setAccommodation(null);
    setShowAlternatives(false);
    const opening = buildEntryDialogue(context || { source });
    setDialogueTurns([
      { id:`coach-${Date.now()}`, role:"COACH", text:opening.text, question:opening.question || null }
    ]);
    setConversationOpen(true);
  }
  React.useEffect(() => {
    if (entryContext.source === "COACH_G_RECOVERY" && !recoveryOpenedRef.current) {
      recoveryOpenedRef.current = true;
      setIdeaSource(DECISION_SOURCES.COACH_G_RECOVERY || "COACH_G_RECOVERY");
      setIdeaPriority("GOAL_PROGRESS");
      if (entryContext.goalName) setIdeaNotes(`Recovery recommendation for ${entryContext.goalName}`);
      beginDialogue("COACH_G_RECOVERY", "BUY", entryContext);
    }
  }, [entryContext.source]);
  // PC-030M20AT floating decision conversation
  function openFloatingDecisionCoach() {
    const scenario=createDecisionScenario({source:ideaSource,security:ideaSymbol,action:ideaSide,amount:ideaAmount,investorReason:ideaReason,decisionPriority:ideaPriority,notes:ideaNotes});
    const conversation=buildDecisionConversation({scenario,baseline,investorDNA:data?.investorDNA || data?.profile?.investorDNA || data?.profile?.dna});
    // PC-030M20AT1 normalize handoff question
    const handoffQuestion =
      String(conversation?.nextQuestion || "").trim().endsWith("?")
        ? conversation.nextQuestion
        : "";
    startDecisionConversation({scenario,openingText:conversation.opening,openingQuestion:handoffQuestion});
    setConversationOpen(false);
  }

  function targetSectorWeightsFromData() {
    const candidates=[data?.targetSectorWeights,data?.sectorTargets,data?.rebalanceTarget?.sectorWeights,data?.rebalanceTarget?.allocation?.sectors,data?.targetAllocation?.sectors];
    const found=candidates.find(x=>x&&typeof x==="object"&&!Array.isArray(x));
    return found || {};
  }
  function buildAccommodation(scenario) {
    if(!scenario?.security || !scenario?.amount) return null;
    const security=getSecurityBySymbol(scenario.security);
    if(!security?.symbol || !security?.sector || security.sector === "Unknown") return null;
    return buildAccommodationAnalysis({scenario,holdings,proposedSector:security?.sector || "Unknown",targetSectorWeights:targetSectorWeightsFromData(),sectorLimitPercent:40});
  }
  function openConversation(source, side="BUY") { beginDialogue(source, side, { source }); }
  function askCoach() {
    const typedSecurity=String(securityQuery||"").trim();
    if(typedSecurity && !selectedSecurity) {
      const message="Select a security from the NSE list so I can use the correct portfolio and sector evidence.";
      setSecurityPickerError(message);
      addDialogueTurn({role:"COACH",text:message,question:"Which listed security did you mean?"});
      return;
    }
    const scenario=createDecisionScenario({source:ideaSource,security:selectedSecurity?.symbol || "",action:ideaSide,amount:ideaAmount,investorReason:ideaReason,decisionPriority:ideaPriority,notes:ideaNotes});
    const conversation=buildDecisionConversation({scenario,baseline,investorDNA:data?.investorDNA || data?.profile?.investorDNA || data?.profile?.dna});
    const nextAccommodation=conversation.readyToSimulate ? buildAccommodation(scenario) : null;
    setCoachTurn({scenario, conversation});
    setAccommodation(nextAccommodation);
    setShowAlternatives(false);
    addDialogueTurn({role:"INVESTOR",text:summarizeInvestorTurn(scenario)});
    addDialogueTurn({role:"COACH",text:conversation.opening,question:conversation.nextQuestion});
    const fitTurn=buildAccommodationDialogue(nextAccommodation);
    if(fitTurn) addDialogueTurn(fitTurn);
  }
  function continueSimulation() {
    const p={mode:"AVERAGE_COST",side:ideaSide,decisionLab:"1",decisionSource:ideaSource};
    if(ideaSymbol.trim()) p.symbol=ideaSymbol.trim().toUpperCase();
    if(ideaAmount) p.decisionAmount=ideaAmount;
    if(ideaReason) p.decisionReason=ideaReason;
    if(ideaPriority) p.decisionPriority=ideaPriority;
    setConversationOpen(false); router.push({pathname:"/trade",params:p});
  }

  return (<>
    <View style={ui.hero}>
      <Text style={ui.eyebrow}>COACH G DECISION LAB</Text><Text style={ui.title}>What are you thinking about?</Text>
      <Text style={ui.body}>Talk the idea through with Coach G first. Test a direct BUY/SELL, a recovery recommendation, new money, or a security you heard about. Coach G advises; you decide.</Text>
      <View style={ui.actions}>
        <Pressable style={ui.primary} onPress={()=>openConversation(DECISION_SOURCES.DIRECT,"BUY")}><Text style={ui.primaryText}>I have a decision</Text></Pressable>
        <Pressable style={ui.secondary} onPress={()=>openConversation(DECISION_SOURCES.WHAT_IF,"BUY")}><Text style={ui.secondaryText}>What if I add money?</Text></Pressable>
        <Pressable style={ui.secondary} onPress={()=>openConversation(DECISION_SOURCES.SECURITY_IDEA,"BUY")}><Text style={ui.secondaryText}>Explore a security idea</Text></Pressable>
        <Pressable style={ui.secondary} onPress={()=>openConversation(DECISION_SOURCES.DIRECT,"SELL")}><Text style={ui.secondaryText}>Explore a reduction / sell</Text></Pressable>
      </View>
    </View>

    <View style={ui.card}><Text style={ui.cardTitle}>Current Decision Baseline</Text>
      {evidenceAvailable ? <><Text style={ui.body}>Holdings: {baseline.holdingsCount} • Portfolio evidence: KES {money(baseline.holdingsValue)}</Text><Text style={ui.body}>Available cash: KES {money(baseline.availableCash)}</Text><Text style={ui.body}>Largest position: {baseline.largestHolding || "N/A"}{baseline.largestHolding ? ` • ${baseline.largestHoldingWeight}%` : ""}</Text></> : <Text style={ui.body}>REAL portfolio evidence is unavailable. Coach G will not present missing evidence as a zero portfolio.</Text>}
      <Text style={ui.note}>Detailed scenarios compare CURRENT vs PROJECTED. Projected values never overwrite REAL holdings.</Text></View>

    <View style={ui.card}><Text style={ui.cardTitle}>Risk & Recovery — what “Aggressive” means</Text><Text style={ui.body}>Coach G explains risk from concentration, liquidity, goal impact and downside. Recovery percentages are mathematical stress tests, not return forecasts.</Text>{recoveryStress.map(row=><View key={row.lossPercent} style={[ui.recoveryRow, decisionWidth < 480 && { flexDirection: "column" }]}><Text style={ui.recoveryLoss}>-{row.lossPercent}% loss</Text><Text style={[ui.recoveryNeed, decisionWidth < 480 && { textAlign: "left" }]}>needs +{row.recoveryPercent}% to recover</Text></View>)}<Pressable style={ui.link} onPress={()=>router.push("/wealth-journey")}><Text style={ui.linkText}>Review Goal & Recovery Context</Text></Pressable></View>
    <View style={ui.card}><Text style={ui.cardTitle}>Decision path</Text><Text style={ui.body}>Discuss → simulate → explore alternatives → compare → investor decides → save preferred scenario → Broker Action Plan.</Text><Pressable style={ui.link} onPress={()=>router.push({pathname:"/basket-execution",params:{mode:"BROKER_PLAN"}})}><Text style={ui.linkText}>Review Broker Action Plan</Text></Pressable></View>

    <Modal visible={conversationOpen} transparent animationType="slide" onRequestClose={()=>setConversationOpen(false)}><View style={ui.modalShade}><ScrollView style={[ui.modal, decisionWidth >= 720 && { width: "100%", maxWidth: 760, alignSelf: "center" }]} contentContainerStyle={{paddingBottom:30}}>
      <Text style={ui.eyebrow}>COACH G DECISION CONVERSATION</Text><Text style={ui.title}>Tell me what you are considering.</Text>
      <Text style={ui.body}>I will keep your reason, priority and source of the idea with the scenario so you do not have to start over.</Text>
      <View style={ui.transcript}>{dialogueTurns.map(turn=><View key={turn.id} style={turn.role==="INVESTOR"?ui.bubbleInvestor:ui.bubbleCoach}><Text style={ui.bubbleRole}>{turn.role==="INVESTOR"?"YOU":"COACH G"}</Text><Text style={ui.body}>{turn.text}</Text>{turn.question?<Text style={ui.question}>{turn.question}</Text>:null}</View>)}</View>
      {recoveryRecommendationEntry && !recoveryOwnWhatIf ? (
          <RecoveryRecommendationSelector
            onCreateOwnWhatIf={() => setRecoveryOwnWhatIf(true)}
          
              onConversationStarted={() => setConversationOpen(false)}
            />
        ) : null}

        {(!recoveryRecommendationEntry || recoveryOwnWhatIf) ? (
          <>
        <Text style={[ui.body,{marginTop:12}]}>Action</Text><View style={ui.chipRow}>{["BUY","SELL"].map(x=><Pressable key={x} style={[ui.chip,ideaSide===x&&ui.chipOn]} onPress={()=>setIdeaSide(x)}><Text style={ui.chipText}>{x}</Text></Pressable>)}</View>
      <Text style={[ui.body,{marginTop:12}]}>Security (optional for open what-if)</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Select NSE security" onPress={toggleSecurityDropdown} style={[ui.input,{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}]}>
        <Text style={{color:selectedSecurity?"#fff":"#94a3b8",fontWeight:selectedSecurity?"800":"500",flex:1}}>{selectedSecurity ? `${selectedSecurity.symbol} — ${selectedSecurity.name}` : "Select NSE security"}</Text>
        <Text style={{color:"#67e8f9",fontWeight:"900",marginLeft:10}}>{securityDropdownOpen ? "▲" : "▼"}</Text>
      </Pressable>
      {selectedSecurity?<Text style={ui.securitySelected}>{selectedSecurity.sector} • Canonical symbol: {selectedSecurity.symbol}</Text>:null}
      {securityDropdownOpen?<View style={ui.securityList}>
        <View style={{padding:8,backgroundColor:"#071426"}}><TextInput value={securityQuery} onChangeText={changeSecurityQuery} autoCapitalize="characters" autoFocus placeholder="Search symbol or company name" placeholderTextColor="#64748b" style={ui.input}/></View>
        {(securityQuery.trim()?securityMatches:NSE_SECURITIES.slice(0,12)).map(x=><Pressable key={x.symbol} style={ui.securityChoice} onPress={()=>chooseSecurity(x)}><Text style={ui.securityChoiceTitle}>{x.symbol} — {x.name}</Text><Text style={ui.securityChoiceMeta}>{x.sector}</Text></Pressable>)}
        {securityQuery.trim() && !securityMatches.length?<Text style={[ui.note,{padding:10}]}>No matching NSE security. Try the symbol or company name.</Text>:null}
      </View>:null}
      {securityPickerError?<Text style={ui.inputError}>{securityPickerError}</Text>:null}
      <Text style={[ui.body,{marginTop:12}]}>Amount you want to explore</Text><TextInput value={ideaAmount} onChangeText={setIdeaAmount} keyboardType="numeric" placeholder="KES amount" placeholderTextColor="#64748b" style={ui.input}/>
      <Text style={[ui.body,{marginTop:12}]}>Why are you considering it?</Text><View style={ui.chipRow}>{[["GROWTH","Growth"],["INCOME","Income / dividend"],["UNDERVALUED","Undervalued"],["REDUCE_CONCENTRATION","Reduce concentration"],["RAISE_CASH","Raise cash"],["FRIEND_OR_MARKET_IDEA","Friend / market idea"],["JUST_EXPLORING","Just exploring"]].map(([v,l])=><Pressable key={v} style={[ui.chip,ideaReason===v&&ui.chipOn]} onPress={()=>setIdeaReason(v)}><Text style={ui.chipText}>{l}</Text></Pressable>)}</View>
      <Text style={[ui.body,{marginTop:12}]}>What matters most?</Text><View style={ui.chipRow}>{[["CAPITAL_GROWTH","Capital growth"],["GOAL_PROGRESS","Goal progress"],["INCOME","Income"],["LOWER_RISK","Lower risk"],["DIVERSIFICATION","Diversification"],["LIQUIDITY","Liquidity"]].map(([v,l])=><Pressable key={v} style={[ui.chip,ideaPriority===v&&ui.chipOn]} onPress={()=>setIdeaPriority(v)}><Text style={ui.chipText}>{l}</Text></Pressable>)}</View>
      <Text style={[ui.body,{marginTop:12}]}>Anything else you want Coach G to know?</Text><TextInput value={ideaNotes} onChangeText={setIdeaNotes} multiline placeholder="Optional note" placeholderTextColor="#64748b" style={[ui.input,{minHeight:70,textAlignVertical:"top"}]}/>
          </>
        ) : null}
        
      {accommodation ? <View style={ui.chipRow}><Pressable style={[ui.chip,showAlternatives&&ui.chipOn]} onPress={()=>{setShowAlternatives(true);addDialogueTurn(buildAlternativeDialogue(accommodation));}}><Text style={ui.chipText}>{accommodation?.isSell ? "Explore released cash" : "Yes — show me options"}</Text></Pressable>
          <Pressable style={ui.chip} onPress={continueSimulation}><Text style={ui.chipText}>{accommodation?.isSell ? "Keep original reduction" : "Keep original idea"}</Text></Pressable>
          <Pressable style={ui.chip} onPress={()=>{setShowAlternatives(true);addDialogueTurn(buildAlternativeDialogue(accommodation));}}><Text style={ui.chipText}>{accommodation?.isSell ? "Compare uses of cash" : "Compare alternatives"}</Text></Pressable></View> : null}
      {showAlternatives && accommodation ? <View style={ui.card}>
        <Text style={ui.cardTitle}>{accommodation?.isSell ? "Ways Coach G can use the released cash" : "Ways Coach G can accommodate the idea"}</Text>
        {buildAlternativeComparison({analysis:accommodation}).map(option=><View key={option.id} style={ui.option}><Text style={ui.optionTitle}>{option.label}</Text><Text style={ui.body}>{option.description}</Text>{option.bankOrSectorWeight!==null&&option.bankOrSectorWeight!==undefined?<Text style={ui.metric}>{accommodation.sector} exposure: {option.bankOrSectorWeight}%</Text>:null}</View>)}
        <Text style={[ui.body,{marginTop:12,fontWeight:"900"}]}>Which direction would you like me to examine more closely?</Text>
        {!accommodation.isSell ? (accommodation.rotationCandidates.length ? <><Text style={ui.note}>Same-sector funding candidates come from your current holdings. Coach G will not choose one for you.</Text>{accommodation.rotationCandidates.slice(0,4).map(x=><Pressable key={x.symbol} style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:"SELL",symbol:x.symbol,decisionLab:"1",decisionSource:"ACCOMMODATE_SECURITY",fundTarget:accommodation.symbol,proposedAmount:String(accommodation.amount)}})}><Text style={ui.linkText}>Explore reducing {x.symbol} → fund {accommodation.symbol}</Text></Pressable>)}</> : <Text style={ui.note}>No current holding in {accommodation.sector} can be offered as a rotation candidate.</Text>) : <Text style={ui.note}>Detailed realized proceeds, remaining WAP and realized gain/loss are confirmed in the detailed SELL simulation using the existing FIFO evidence. This preliminary conversation does not invent those values.</Text>}
        {accommodation.underweightEvidenceAvailable ? accommodation.underweightSectors.slice(0,3).map(x=><View key={x.sector} style={ui.option}><Text style={ui.optionTitle}>Explore {x.sector}</Text><Text style={ui.body}>Current {x.currentWeight}% vs saved target {x.targetWeight}% • gap {x.gap}%.</Text></View>) : <Text style={ui.note}>Saved sector-target evidence is not available in this Trading payload, so Coach G will not invent an “underweight” sector.</Text>}
        {!accommodation.isSell ? <Pressable style={ui.link} onPress={()=>router.push({pathname:"/trade",params:{mode:"AVERAGE_COST",side:ideaSide,decisionLab:"1",decisionSource:"REDUCED_AMOUNT",symbol:accommodation.symbol,decisionAmount:String(Math.min(accommodation.amount, accommodation.sectorImpact.maxAdditionalBeforeSectorGuard || accommodation.amount))}})}><Text style={ui.linkText}>Test a smaller {accommodation.symbol} amount</Text></Pressable> : null}
      </View> : null}
      <View style={ui.actions}><Pressable style={ui.secondary} onPress={()=>setConversationOpen(false)}><Text style={ui.secondaryText}>Close</Text></Pressable><Pressable style={ui.primary} onPress={openFloatingDecisionCoach}><Text style={ui.primaryText}>{coachTurn ? "Continue discussion with Coach G" : "Discuss with Coach G"}</Text></Pressable>{coachTurn?.conversation?.readyToSimulate ? <Pressable style={ui.primary} onPress={continueSimulation}><Text style={ui.primaryText}>Skip discussion → Simulation</Text></Pressable> : null}</View>
    </ScrollView></View></Modal>
  </>);
}

// PC-030M20AV3D RESPONSIVE CALIBRATION
export default function Trading() {
  const { width: av3dWidth } = useWindowDimensions();
  const entryParams=useLocalSearchParams();
  const [tab,setTab]=useState("Account"), [data,setData]=useState(null), [error,setError]=useState("");
  const load=useCallback(async()=>{try{setError("");setData(await loadTradingHubData());}catch(e){setData(null);setError(e?.message||"Verified broker information is unavailable.");}},[]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  const broker=data?.broker, cash=Number(data?.cash||0);
  return <ScrollView style={s.screen} contentContainerStyle={[
      s.content,
      av3dWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      av3dWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
      av3dWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
    ]}>
    <View style={[s.header, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}><View style={{flex:1}}><Text style={[s.title, av3dWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3dWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Trading</Text><Text style={s.subtitle}>Test investment decisions against your portfolio, goals and risk before you act.</Text></View><Pressable style={s.headerButton} onPress={()=>router.replace("/(tabs)/dashboard")}><Text style={s.headerButtonText}>Home</Text></Pressable></View>
          {/* PC-030M20AQ3 UI consolidation — account context first; legacy broker evidence UI removed. */}
      <ActiveUserBanner />

      <DecisionLabHome data={data} entryParams={entryParams} />

</ScrollView>;
}
function Unavailable({title,message,action,onPress}){return <View style={s.unavailable}><Text style={s.cardTitle}>{title}</Text><Text style={s.body}>{message}</Text>{action?<Pressable style={s.secondary} onPress={onPress}><Text style={s.secondaryText}>{action}</Text></Pressable>:null}</View>}
function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:"#020617"},content:{padding:22,paddingTop:70,paddingBottom:120},header:{flexDirection:"row",alignItems:"center",gap:12},title:{color:"white",fontSize:34,fontWeight:"900"},subtitle:{color:"#94a3b8",marginTop:7,lineHeight:21},headerButton:{backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,borderRadius:14,paddingHorizontal:15,paddingVertical:11},headerButtonText:{color:"#67e8f9",fontWeight:"900"},notice:{marginTop:18,padding:16,borderRadius:20,backgroundColor:"rgba(6,182,212,.10)",borderColor:"rgba(6,182,212,.4)",borderWidth:1},noticeTitle:{color:"#67e8f9",fontWeight:"900",fontSize:18},body:{color:"#cbd5e1",marginTop:8,lineHeight:21},tabs:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:18},tab:{backgroundColor:"#1e293b",paddingHorizontal:14,paddingVertical:10,borderRadius:14},activeTab:{backgroundColor:"#9333ea"},tabText:{color:"#94a3b8",fontWeight:"900"},activeTabText:{color:"white",fontWeight:"900"},card:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#1e293b",borderWidth:1},label:{color:"#94a3b8",fontSize:12},cardTitle:{color:"white",fontWeight:"900",fontSize:19,marginTop:5},unavailable:{marginTop:18,padding:18,borderRadius:20,backgroundColor:"#0f172a",borderColor:"#334155",borderWidth:1},primary:{marginTop:16,padding:16,borderRadius:16,backgroundColor:"#9333ea",alignItems:"center"},primaryText:{color:"white",fontWeight:"900"},secondary:{marginTop:12,padding:15,borderRadius:16,backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,alignItems:"center"},secondaryText:{color:"#67e8f9",fontWeight:"900"}});
