#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADING="$ROOT/mobile/app/(tabs)/trading.js"
FLOATING="$ROOT/mobile/src/components/coach/FloatingCoachG.js"

echo "PC-030M20AT — Floating Coach G Discovery → Summary → Recommendation"
[[ -f "$TRADING" && -f "$FLOATING" ]] || { echo "ERROR — canonical Trading/Floating Coach files missing"; exit 1; }

python - "$TRADING" "$FLOATING" <<'PY'
from pathlib import Path
import re,sys
trading,floating=map(Path,sys.argv[1:])

# ---------- Trading handoff ----------
s=trading.read_text(encoding="utf-8")
if "PC-030M20AT floating decision conversation" not in s:
    if "createDecisionScenario" not in s or "buildDecisionConversation" not in s:
        raise SystemExit("ERROR — M20AR Decision Lab layers missing; refusing unsafe patch")
    imports=list(re.finditer(r'^import\s+.*?;\s*$',s,re.M|re.S))
    if not imports: raise SystemExit("ERROR — import block missing")
    pos=imports[-1].end()
    s=s[:pos]+'\nimport { startDecisionConversation } from "../../src/features/trading/coachGDecisionConversationSession";'+s[pos:]
    anchor='  function targetSectorWeightsFromData() {'
    if anchor not in s: raise SystemExit("ERROR — Decision Lab helper anchor missing")
    helper='''  // PC-030M20AT floating decision conversation
  function openFloatingDecisionCoach() {
    const scenario=createDecisionScenario({source:ideaSource,security:ideaSymbol,action:ideaSide,amount:ideaAmount,investorReason:ideaReason,decisionPriority:ideaPriority,notes:ideaNotes});
    const conversation=buildDecisionConversation({scenario,baseline,investorDNA:data?.investorDNA || data?.profile?.investorDNA || data?.profile?.dna});
    startDecisionConversation({scenario,openingText:conversation.opening,openingQuestion:conversation.nextQuestion});
    setConversationOpen(false);
  }

'''
    s=s.replace(anchor,helper+anchor,1)
    old='<Pressable style={ui.primary} onPress={askCoach}><Text style={ui.primaryText}>{coachTurn ? "Recheck with Coach G" : "Ask Coach G"}</Text></Pressable>'
    if old not in s: old='<Pressable style={ui.primary} onPress={askCoach}><Text style={ui.primaryText}>Ask Coach G</Text></Pressable>'
    if old not in s: raise SystemExit("ERROR — Coach button anchor missing")
    s=s.replace(old,'<Pressable style={ui.primary} onPress={openFloatingDecisionCoach}><Text style={ui.primaryText}>{coachTurn ? "Continue discussion with Coach G" : "Discuss with Coach G"}</Text></Pressable>',1)
    s=s.replace('<Text style={ui.primaryText}>Continue to Simulation</Text>','<Text style={ui.primaryText}>Skip discussion → Simulation</Text>',1)
    trading.write_text(s,encoding="utf-8")
    print("UPDATED — Decision Lab now hands scenario to Floating Coach G.")
else: print("SKIP — Trading handoff already installed")

# ---------- Floating Coach integration ----------
f=floating.read_text(encoding="utf-8")
if "PC-030M20AT decision session" not in f:
    if 'useGlobalSearchParams, usePathname' not in f or 'askFloatingCoachG' not in f:
        raise SystemExit("ERROR — canonical authenticated Floating Coach contract missing")
    f=f.replace('useGlobalSearchParams, usePathname } from "expo-router"','useGlobalSearchParams, usePathname, useRouter } from "expo-router"',1)
    market='import { loadCanonicalNseQuotes } from "../../services/markets/canonicalNseQuoteService";'
    imp='''import {
  subscribeDecisionConversation, getDecisionConversationSession,
  submitDecisionConversationAnswer, requestDecisionConversationSummary,
  correctDecisionConversationSummary, confirmDecisionConversationSummary,
  completeDecisionRecommendation, buildRecommendationPrompt,
  clearDecisionConversation
} from "../../features/trading/coachGDecisionConversationSession";'''
    if market not in f: raise SystemExit("ERROR — Floating Coach import anchor missing")
    f=f.replace(market,market+"\n"+imp,1)
    f=f.replace('  const pathname = usePathname();','  const pathname = usePathname();\n  const router = useRouter();',1)
    f=f.replace('  const [speaking, setSpeaking] = useState(false);','''  const [speaking, setSpeaking] = useState(false);
  const [decisionSession, setDecisionSession] = useState(() => getDecisionConversationSession()); // PC-030M20AT decision session
  const [decisionInput, setDecisionInput] = useState("");''',1)
    auth='  if (authLoading || !user || shouldHide(pathname)) return null;'
    extra='''  useEffect(() => subscribeDecisionConversation((session) => {
    setDecisionSession(session);
    if (session) setOpen(true);
  }), []);

  async function sendDecisionAnswer() {
    const text=String(decisionInput||"").trim(); if(!text)return;
    submitDecisionConversationAnswer(text); setDecisionInput("");
  }
  async function confirmAndRecommend() {
    const session=confirmDecisionConversationSummary(); if(!session)return;
    try {
      setAsking(true);
      const result=await askFloatingCoachG({accessToken,question:buildRecommendationPrompt(session),screenContext:await buildScreenContext()});
      completeDecisionRecommendation(result);
      if(autoSpeak) speakAnswer(result?.answer);
    } catch(error) {
      completeDecisionRecommendation({answer:error?.message||"Coach G could not complete the recommendation.",confidence:null,evidence:[]});
    } finally { setAsking(false); }
  }
  function continueDecisionSimulation() {
    const x=decisionSession?.scenario||{};
    const p={mode:"AVERAGE_COST",side:String(x.action||"BUY").toUpperCase(),decisionLab:"1",decisionSource:x.source||"DIRECT"};
    if(x.security)p.symbol=String(x.security).toUpperCase();
    if(x.amount)p.decisionAmount=String(x.amount);
    if(x.investorReason)p.decisionReason=x.investorReason;
    if(x.decisionPriority)p.decisionPriority=x.decisionPriority;
    setOpen(false); router.push({pathname:"/trade",params:p});
  }

'''
    if auth not in f: raise SystemExit("ERROR — Floating Coach auth anchor missing")
    f=f.replace(auth,extra+auth,1)

    generic='<View style={styles.promptWrap}>{prompts.map((item) => <Pressable key={item} style={styles.prompt} onPress={() => { setQuestion(item); ask(item); }}><Text style={styles.promptText}>{item}</Text></Pressable>)}</View>'
    if generic not in f: raise SystemExit("ERROR — Floating Coach prompt anchor missing")
    decision='''{decisionSession ? <View style={styles.decisionBox}>
              <View style={styles.phaseRow}>{["DISCOVERY","SUMMARY","RECOMMENDATION"].map(x=><Text key={x} style={[styles.phase, (decisionSession.phase===x || (x==="RECOMMENDATION"&&decisionSession.phase==="RECOMMENDATION_READY"))&&styles.phaseOn]}>{x}</Text>)}</View>
              {(decisionSession.turns||[]).map(t=><View key={t.id} style={[styles.turn,t.role==="INVESTOR"?styles.turnInvestor:styles.turnCoach]}><Text style={styles.turnRole}>{t.role==="INVESTOR"?"YOU":"COACH G"}</Text><Text style={styles.turnText}>{t.text}</Text></View>)}
              {decisionSession.phase==="DISCOVERY"?<><TextInput value={decisionInput} onChangeText={setDecisionInput} multiline placeholder="Reply to Coach G…" placeholderTextColor="#64748b" style={styles.input}/><View style={styles.actions}><Pressable style={styles.ask} onPress={sendDecisionAnswer}><Text style={styles.askText}>Send reply</Text></Pressable><Pressable style={styles.altButton} onPress={requestDecisionConversationSummary}><Text style={styles.altText}>Summarize now</Text></Pressable></View></>:null}
              {decisionSession.phase==="SUMMARY"?<><TextInput value={decisionInput} onChangeText={setDecisionInput} multiline placeholder="Correction or missing context…" placeholderTextColor="#64748b" style={styles.input}/><View style={styles.actions}><Pressable style={styles.ask} disabled={asking} onPress={confirmAndRecommend}>{asking?<ActivityIndicator color="white"/>:<Text style={styles.askText}>Yes — recommend</Text>}</Pressable><Pressable style={styles.altButton} onPress={()=>{const t=String(decisionInput||"").trim();if(t){correctDecisionConversationSummary(t);setDecisionInput("");}}}><Text style={styles.altText}>Correct summary</Text></Pressable></View></>:null}
              {decisionSession.phase==="RECOMMENDATION_READY"&&asking?<Text style={styles.voiceStatus}>Coach G is evaluating the confirmed scenario…</Text>:null}
              {decisionSession.phase==="RECOMMENDATION"?<><View style={styles.answerCard}><Text style={styles.answer}>{decisionSession.recommendation?.answer}</Text><Text style={styles.disclaimer}>Recommendation follows confirmed discovery. Educational guidance—not an order. The decision remains yours.</Text></View><Pressable style={styles.ask} onPress={continueDecisionSimulation}><Text style={styles.askText}>Continue to Simulation</Text></Pressable></>:null}
              <Pressable style={styles.endDecision} onPress={()=>{clearDecisionConversation();setDecisionInput("");}}><Text style={styles.endDecisionText}>End decision conversation</Text></Pressable>
            </View> : <>'''+generic
    f=f.replace(generic,decision,1)
    # Close the generic fragment immediately after the existing answer card.
    close='''            {answer ? <View style={styles.answerCard}>
              <View style={styles.meta}>{answer?.recommendation ? <Text style={styles.chip}>{answer.recommendation}</Text> : null}{Number.isFinite(Number(answer?.confidence)) ? <Text style={styles.chip}>{answer.confidence}% confidence</Text> : null}</View>
              <Text style={styles.answer}>{answer.answer}</Text>
              <View style={styles.speechActions}><Pressable onPress={() => speaking ? (Speech.stop(), setSpeaking(false)) : speakAnswer(answer.answer)}><Text style={styles.replay}>{speaking ? "■ Stop voice" : "▶ Read aloud"}</Text></Pressable></View>
              {(answer.evidence || []).map((item) => <Text key={item} style={styles.evidence}>• {item}</Text>)}
              <Text style={styles.disclaimer}>Educational guidance—not an order. Coach G cannot modify holdings, cash, goals, or Investor DNA.</Text>
            </View> : null}'''
    if close not in f: raise SystemExit("ERROR — Floating Coach answer anchor missing")
    f=f.replace(close,close+"\n            </>}",1)
    style='  layer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },'
    additions='''  decisionBox:{marginTop:8,gap:8}, phaseRow:{flexDirection:"row",gap:6,marginBottom:2}, phase:{color:"#64748b",borderColor:"#334155",borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:9,fontWeight:"900"}, phaseOn:{color:"#67e8f9",borderColor:"#22d3ee",backgroundColor:"#083344"}, turn:{maxWidth:"94%",borderRadius:14,padding:11,borderWidth:1}, turnCoach:{alignSelf:"flex-start",backgroundColor:"#10243e",borderColor:"#155e75"}, turnInvestor:{alignSelf:"flex-end",backgroundColor:"#312e81",borderColor:"#6366f1"}, turnRole:{color:"#94a3b8",fontSize:9,fontWeight:"900",marginBottom:4}, turnText:{color:"white",lineHeight:20}, altButton:{flex:1,borderColor:"#67e8f9",borderWidth:1,padding:13,borderRadius:14,alignItems:"center"}, altText:{color:"#67e8f9",fontWeight:"900"}, endDecision:{alignSelf:"center",marginTop:8,padding:8}, endDecisionText:{color:"#94a3b8",fontSize:11,fontWeight:"800"},
'''
    if style not in f: raise SystemExit("ERROR — Floating Coach style anchor missing")
    f=f.replace(style,additions+style,1)
    floating.write_text(f,encoding="utf-8")
    print("UPDATED — Floating Coach now owns free-text Discovery → Summary → Recommendation.")
else: print("SKIP — Floating Coach decision session already installed")
PY

echo "PC-030M20AT applied successfully."
