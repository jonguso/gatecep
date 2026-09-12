import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { calculatePreserveGoalFundingNeed } from "../src/features/wealth-journey/preserveGoalRecoveryService";
import { startDecisionConversation } from "../src/features/trading/coachGDecisionConversationSession";
import { requestFloatingCoachGOpen } from "../src/features/trading/floatingCoachGActivationService";

function first(params,names=[]){for(const name of names){const v=params?.[name];if(v!==undefined&&v!==null&&String(v).trim()!=="")return Array.isArray(v)?v[0]:v;}return null;}
function num(v){if(v===null||v===undefined||v==="")return null;const x=Number(v);return Number.isFinite(x)?x:null;}
function money(v){const x=num(v);return x===null?"N/A":`KES ${x.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;}

// PC-030M20AV3C RESPONSIVE CALIBRATION
export default function GoalRecoveryChoice(){
  const { width: av3cWidth } = useWindowDimensions();
  const params=useLocalSearchParams();
  const goalName=first(params,["goalName","name","goal"])||"Financial Goal";
  const targetAmount=num(first(params,["targetAmount","goalTarget","targetValue"]));
  const targetDate=first(params,["targetDate","goalTargetDate","date"]);
  const monthlyContribution=num(first(params,["monthlyContribution","contribution","monthly"]));
  const annualReturnPercentage=num(first(params,["annualReturnPercentage","annualReturn","expectedAnnualReturn","returnPercentage"]))??8;
  const projectedValue=num(first(params,["projectedValue","goalProjectedValue"]));
  const requiredMonthlyContribution=num(first(params,["requiredMonthlyContribution","requiredMonthly"]));
  const sectorTargetsJson=first(params,["sectorTargetsJson","targetSectorWeights"]);
  let projectedShortfall=num(first(params,["goalShortfall","shortfall","projectedShortfall","goalGap","gap"]));
  if(!(Math.abs(projectedShortfall||0)>0)&&targetAmount!==null&&projectedValue!==null)projectedShortfall=Math.max(targetAmount-projectedValue,0);
  const additionalMonthly=requiredMonthlyContribution!==null&&monthlyContribution!==null?Math.max(0,requiredMonthlyContribution-monthlyContribution):null;
  const fundingNeed=calculatePreserveGoalFundingNeed({projectedShortfall,targetDate,annualReturnPercentage});

  function openDiversifiedAllocation(){
    router.push({pathname:"/goal-recovery-allocation",params:{
      goalName,targetAmount:targetAmount??"",targetDate:targetDate||"",
      monthlyContribution:monthlyContribution??"",recoveryAmount:fundingNeed?.requiredNow??"",
      projectedShortfall:fundingNeed?.futureShortfall??projectedShortfall??"",
      projectedValue:projectedValue??"",
      requiredMonthlyContribution:requiredMonthlyContribution??"",
      sectorTargetsJson:sectorTargetsJson||""
    }});
  }

  function discuss(option){
    const scenario={source:"COACH_G_RECOVERY",action:"EXPLORE",security:null,amount:null,quantity:null,price:null,
      investorReason:`${option} recovery for ${goalName}.`,decisionPriority:"GOAL_RECOVERY",
      goalContext:{goalName,targetAmount,targetDate,monthlyContribution,requiredMonthlyContribution,
        additionalMonthlyContribution:additionalMonthly,projectedShortfall:fundingNeed?.futureShortfall??projectedShortfall??null,
        preserveGoalTarget:true},recommendationContext:{recoveryOption:option}};
    let openingText="",openingQuestion="";
    if(option==="MONTHLY"){
      openingText=`Keep ${goalName} and ${targetDate||"the current target date"} unchanged by increasing the monthly contribution from ${money(monthlyContribution)} to ${money(requiredMonthlyContribution)}. That is ${money(additionalMonthly)} more per month under the current planning assumptions.`;
      openingQuestion="Would that higher monthly contribution be sustainable without putting pressure on short-term liquidity?";
    } else if(option==="TIMELINE"){
      openingText=`Keep ${goalName}, the target amount and the current ${money(monthlyContribution)} monthly contribution, but give the goal more time.`;
      openingQuestion="How much additional time would feel acceptable before we compare timeline alternatives?";
    } else {
      openingText=`Use a balanced recovery for ${goalName}: a smaller monthly increase plus a smaller target-date extension.`;
      openingQuestion="Would you prefer the balanced option to minimize the monthly increase or minimize the date extension?";
    }
    startDecisionConversation({scenario,openingText,openingQuestion});
    requestFloatingCoachGOpen({source:"GOAL_RECOVERY_OPTION",question:openingQuestion,context:scenario});
  }

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, av3cWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" }, av3cWidth < 720 && { paddingHorizontal: 16, paddingBottom: 128 }, av3cWidth < 480 && { paddingHorizontal: 12 }]}>
    <Text style={styles.eyebrow}>COACH G · GOAL RECOVERY</Text>
    <Text style={[styles.title, av3cWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3cWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>Choose how you want to close the gap</Text>
    <Text style={styles.body}>A projected future shortfall, a lump sum needed today, and an additional monthly contribution are different recovery amounts.</Text>

    <View style={styles.card}>
      <Text style={styles.goal}>{goalName}</Text>
      <View style={styles.grid}>
        <Metric label="Current monthly contribution" value={money(monthlyContribution)}/>
        <Metric label="Required monthly contribution" value={money(requiredMonthlyContribution)}/>
        <Metric label="Additional monthly contribution" value={money(additionalMonthly)}/>
        <Metric label="Projected future shortfall" value={money(fundingNeed?.futureShortfall??projectedShortfall)}/>
      </View>
    </View>

    <Option title="OPTION 1 · ADD MONEY NOW" headline={money(fundingNeed?.requiredNow)}
      body="Add the estimated lump sum today while keeping the goal target, target date and monthly contribution unchanged."
      note="This is a present-value estimate of the projected future shortfall. It is not the same as the future shortfall itself."
      action="Use the add-money-now option" onPress={openDiversifiedAllocation}/>

    <Option title="OPTION 2 · INCREASE MONTHLY CONTRIBUTION"
      headline={`${money(monthlyContribution)} → ${money(requiredMonthlyContribution)}`}
      body={`Increase the monthly contribution by ${money(additionalMonthly)} while keeping the goal target and target date unchanged.`}
      action="Discuss monthly increase with Coach G" onPress={()=>discuss("MONTHLY")}/>

    <Option title="OPTION 3 · EXTEND THE TIMELINE" headline={`Keep ${money(monthlyContribution)}/month`}
      body="Keep the target amount and current monthly contribution, then compare how much additional time would be required."
      action="Compare timeline alternatives" onPress={()=>discuss("TIMELINE")}/>

    <Option title="OPTION 4 · BALANCED RECOVERY" headline="Smaller monthly increase + smaller extension"
      body="Combine a smaller contribution increase with a modest timeline extension so one assumption does not carry the entire recovery plan."
      action="Build a balanced recovery" onPress={()=>discuss("BALANCED")}/>

    <View style={styles.safeguard}><Text style={styles.safeguardTitle}>Advisory only</Text><Text style={styles.small}>Choosing an option does not change your saved goal, contribution, REAL portfolio, Practice portfolio, Investor DNA, or place a broker order.</Text></View>
  </ScrollView>;
}
function Option({title,headline,body,note,action,onPress}){return <View style={styles.option}><Text style={styles.optionLabel}>{title}</Text><Text style={styles.optionTitle}>{headline}</Text><Text style={styles.body}>{body}</Text>{note?<Text style={styles.small}>{note}</Text>:null}<Pressable style={styles.secondary} onPress={onPress}><Text style={styles.secondaryText}>{action}</Text></Pressable></View>;}
function Metric({label,value}){return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:"#020617"},content:{padding:20,paddingBottom:80,gap:16},eyebrow:{color:"#22d3ee",fontWeight:"900",fontSize:12},title:{color:"#f8fafc",fontSize:28,fontWeight:"900"},body:{color:"#cbd5e1",fontSize:15,lineHeight:22},small:{color:"#94a3b8",lineHeight:19,fontSize:12},card:{backgroundColor:"#111827",borderColor:"#334155",borderWidth:1,borderRadius:18,padding:16,gap:12},option:{backgroundColor:"#0f172a",borderColor:"#334155",borderWidth:1,borderRadius:18,padding:16,gap:12},optionLabel:{color:"#67e8f9",fontWeight:"900",fontSize:11},optionTitle:{color:"#f8fafc",fontWeight:"900",fontSize:21},goal:{color:"#67e8f9",fontWeight:"900",fontSize:20},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},metric:{minWidth:190,flexGrow:1,backgroundColor:"#020617",borderRadius:12,padding:12},metricLabel:{color:"#94a3b8",fontSize:12},metricValue:{color:"#f8fafc",fontWeight:"800",marginTop:4},secondary:{borderColor:"#22d3ee",borderWidth:1,borderRadius:12,padding:13,alignItems:"center"},secondaryText:{color:"#67e8f9",fontWeight:"800"},safeguard:{backgroundColor:"#1c1917",borderColor:"#a16207",borderWidth:1,borderRadius:14,padding:14,gap:6},safeguardTitle:{color:"#fde047",fontWeight:"900"}});
