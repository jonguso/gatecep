import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as Speech from "expo-speech";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { askFloatingCoachG, transcribeFloatingCoachG } from "../../features/coach/api/floatingCoachApi";
import { loadCanonicalNseQuotes } from "../../services/markets/canonicalNseQuoteService";
import {
  subscribeDecisionConversation, getDecisionConversationSession,
  submitDecisionConversationAnswer, requestDecisionConversationSummary,
  correctDecisionConversationSummary, confirmDecisionConversationSummary,
  completeDecisionRecommendation, buildRecommendationPrompt,
  clearDecisionConversation
} from "../../features/trading/coachGDecisionConversationSession";

import { subscribeFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";
const HIDDEN_PATHS = new Set(["/", "/login", "/register", "/menu", "/trade", "/first-trade", "/portfolio-simulator", "/practice-decision", "/demo", "/coach", "/coach-insights"]);
const MAX_RECORDING_SECONDS = 45;

function shouldHide(pathname) {
  const path = String(pathname || "");
  return HIDDEN_PATHS.has(path) || path.startsWith("/onboarding");
}

export default function FloatingCoachG() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, accessToken } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [open, setOpen] = useState(false);
  // PC-030M20AU4B runtime-state-aware activation
  React.useEffect(() => {
    return subscribeFloatingCoachGOpen((request) => {
      if (request?.question) {
        setQuestion(request.question);
      }
      setOpen(true);
    });
  }, []);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [decisionSession, setDecisionSession] = useState(() => getDecisionConversationSession()); // PC-030M20AT decision session
  const [decisionInput, setDecisionInput] = useState("");
  const symbol = String(params?.symbol || (pathname.startsWith("/security/") ? pathname.split("/").pop() : "")).trim().toUpperCase();
  const isTabRoute = ["/markets", "/trading", "/calendar", "/news"].includes(pathname);
  const prompts = useMemo(() => [
    ...(symbol ? [`Explain ${symbol}`] : []),
    "Analyze my portfolio risk",
    "How much broker cash do I have?",
    "What should I focus on next?"
  ], [symbol]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (recording && recordingSeconds >= MAX_RECORDING_SECONDS) stopRecordingAndTranscribe();
  }, [recording, recordingSeconds]);

  useEffect(() => subscribeDecisionConversation((session) => {
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

  if (authLoading || !user || shouldHide(pathname)) return null;

  async function buildScreenContext() {
    let quote = null;
    if (symbol) {
      const snapshot = await loadCanonicalNseQuotes().catch(() => null);
      const found = snapshot?.quotes?.find((item) => String(item.symbol).toUpperCase() === symbol);
      quote = found ? { price: found.price, changePct: found.changePct, quotedAt: found.quotedAt, provider: snapshot?.source } : null;
    }
    return { pathname, symbol: symbol || null, quote };
  }

  function speakAnswer(text) {
    const spokenText = String(text || "").trim();
    if (!spokenText) return;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(spokenText, { language: "en-KE", rate: 0.92, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }

  async function ask(promptText = question) {
    const finalQuestion = String(promptText || "").trim();
    if (!finalQuestion) { setAnswer({ answer: "Ask or speak a question first.", confidence: null, evidence: [] }); return; }
    try {
      setAsking(true);
      setAnswer(null);
      const result = await askFloatingCoachG({ accessToken, question: finalQuestion, screenContext: await buildScreenContext() });
      setAnswer(result);
      if (autoSpeak) speakAnswer(result?.answer);
    } catch (error) {
      setAnswer({ answer: error?.message || "Coach G is temporarily unavailable.", confidence: null, evidence: [] });
    } finally {
      setAsking(false);
    }
  }

  async function startRecording() {
    try {
      setAnswer(null);
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Microphone permission is required to speak to Coach G.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingSeconds(0);
      setRecording(true);
    } catch (error) {
      setAnswer({ answer: error?.message || "Coach G could not start recording.", confidence: null, evidence: [] });
    }
  }

  async function stopRecordingAndTranscribe() {
    if (!recording || transcribing) return;
    try {
      setRecording(false);
      setTranscribing(true);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const result = await transcribeFloatingCoachG({ accessToken, uri: recorder.uri, mimeType: Platform.OS === "web" ? "audio/webm" : "audio/m4a" });
      setQuestion(result.transcript);
      await ask(result.transcript);
    } catch (error) {
      setAnswer({ answer: error?.message || "Coach G could not understand that recording.", confidence: null, evidence: [] });
    } finally {
      setTranscribing(false);
      setRecordingSeconds(0);
    }
  }

  function closeCoach() {
    Speech.stop();
    setSpeaking(false);
    setOpen(false);
  }

  return <View pointerEvents="box-none" style={styles.layer}>
    <Modal visible={open} transparent animationType="fade" onRequestClose={closeCoach}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={closeCoach} />
        <View style={styles.panel}>
          <View style={styles.header}><View><Text style={styles.title}>Coach G</Text><Text style={styles.subtitle}>{symbol ? `${symbol} · Context-aware guidance` : "Your investing companion"}</Text></View><Pressable accessibilityLabel="Close Coach G" onPress={closeCoach}><Text style={styles.close}>✕</Text></Pressable></View>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.policy}>Uses authenticated REAL broker evidence. Practice activity stays separate. Voice recordings are not retained.</Text>
            {decisionSession ? <View style={styles.decisionBox}>
              <View style={styles.phaseRow}>{["DISCOVERY","SUMMARY","RECOMMENDATION"].map(x=><Text key={x} style={[styles.phase, (decisionSession.phase===x || (x==="RECOMMENDATION"&&decisionSession.phase==="RECOMMENDATION_READY"))&&styles.phaseOn]}>{x}</Text>)}</View>
              {(decisionSession.turns||[]).map(t=><View key={t.id} style={[styles.turn,t.role==="INVESTOR"?styles.turnInvestor:styles.turnCoach]}><Text style={styles.turnRole}>{t.role==="INVESTOR"?"YOU":"COACH G"}</Text><Text style={styles.turnText}>{t.text}</Text></View>)}
              {decisionSession.phase==="DISCOVERY"?<><TextInput value={decisionInput} onChangeText={setDecisionInput} multiline placeholder="Reply to Coach G…" placeholderTextColor="#64748b" style={styles.input}/><View style={styles.actions}><Pressable style={styles.ask} onPress={sendDecisionAnswer}><Text style={styles.askText}>Send reply</Text></Pressable><Pressable style={styles.altButton} onPress={requestDecisionConversationSummary}><Text style={styles.altText}>Summarize now</Text></Pressable></View></>:null}
              {decisionSession.phase==="SUMMARY"?<><TextInput value={decisionInput} onChangeText={setDecisionInput} multiline placeholder="Correction or missing context…" placeholderTextColor="#64748b" style={styles.input}/><View style={styles.actions}><Pressable style={styles.ask} disabled={asking} onPress={confirmAndRecommend}>{asking?<ActivityIndicator color="white"/>:<Text style={styles.askText}>Yes — recommend</Text>}</Pressable><Pressable style={styles.altButton} onPress={()=>{const t=String(decisionInput||"").trim();if(t){correctDecisionConversationSummary(t);setDecisionInput("");}}}><Text style={styles.altText}>Correct summary</Text></Pressable></View></>:null}
              {decisionSession.phase==="RECOMMENDATION_READY"&&asking?<Text style={styles.voiceStatus}>Coach G is evaluating the confirmed scenario…</Text>:null}
              {decisionSession.phase==="RECOMMENDATION"?<><View style={styles.answerCard}><Text style={styles.answer}>{decisionSession.recommendation?.answer}</Text><Text style={styles.disclaimer}>Recommendation follows confirmed discovery. Educational guidance—not an order. The decision remains yours.</Text></View><Pressable style={styles.ask} onPress={continueDecisionSimulation}><Text style={styles.askText}>Continue to Simulation</Text></Pressable></>:null}
              <Pressable style={styles.endDecision} onPress={()=>{clearDecisionConversation();setDecisionInput("");}}><Text style={styles.endDecisionText}>End decision conversation</Text></Pressable>
            </View> : <><View style={styles.promptWrap}>{prompts.map((item) => <Pressable key={item} style={styles.prompt} onPress={() => { setQuestion(item); ask(item); }}><Text style={styles.promptText}>{item}</Text></Pressable>)}</View>
            <TextInput value={question} onChangeText={setQuestion} maxLength={500} multiline placeholder="Ask or speak to Coach G…" placeholderTextColor="#64748b" style={styles.input} />
            <View style={styles.actions}>
              <Pressable disabled={asking || transcribing} style={[styles.ask, (asking || transcribing) && styles.disabled]} onPress={() => ask()}>{asking ? <ActivityIndicator color="white" /> : <Text style={styles.askText}>Ask</Text>}</Pressable>
              <Pressable accessibilityLabel={recording ? "Stop recording" : "Speak to Coach G"} disabled={asking || transcribing} style={[styles.mic, recording && styles.micRecording, (asking || transcribing) && styles.disabled]} onPress={recording ? stopRecordingAndTranscribe : startRecording}><Text style={styles.micText}>{transcribing ? "…" : recording ? "■" : "🎙"}</Text></Pressable>
            </View>
            {recording ? <Text style={styles.voiceStatus}>Listening… {recordingSeconds}s / {MAX_RECORDING_SECONDS}s · Tap stop when finished</Text> : null}
            {transcribing ? <Text style={styles.voiceStatus}>Transcribing securely…</Text> : null}
            <Pressable style={styles.voicePreference} onPress={() => { if (autoSpeak) Speech.stop(); setAutoSpeak((value) => !value); }}><Text style={styles.voicePreferenceText}>{autoSpeak ? "🔊 Spoken replies on" : "🔇 Spoken replies off"}</Text></Pressable>
            {answer ? <View style={styles.answerCard}>
              <View style={styles.meta}>{answer?.recommendation ? <Text style={styles.chip}>{answer.recommendation}</Text> : null}{Number.isFinite(Number(answer?.confidence)) ? <Text style={styles.chip}>{answer.confidence}% confidence</Text> : null}</View>
              <Text style={styles.answer}>{answer.answer}</Text>
              <View style={styles.speechActions}><Pressable onPress={() => speaking ? (Speech.stop(), setSpeaking(false)) : speakAnswer(answer.answer)}><Text style={styles.replay}>{speaking ? "■ Stop voice" : "▶ Read aloud"}</Text></Pressable></View>
              {(answer.evidence || []).map((item) => <Text key={item} style={styles.evidence}>• {item}</Text>)}
              <Text style={styles.disclaimer}>Educational guidance—not an order. Coach G cannot modify holdings, cash, goals, or Investor DNA.</Text>
            </View> : null}
            </>}
          </ScrollView>
        </View>
      </View>
    </Modal>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Coach G" onPress={() => setOpen(true)} style={({ pressed }) => [styles.floating, { bottom: Math.max(insets.bottom, 10) + (isTabRoute ? 70 : 8) }, pressed && styles.pressed]}><Text style={styles.g}>G</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  decisionBox:{marginTop:8,gap:8}, phaseRow:{flexDirection:"row",gap:6,marginBottom:2}, phase:{color:"#64748b",borderColor:"#334155",borderWidth:1,borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:9,fontWeight:"900"}, phaseOn:{color:"#67e8f9",borderColor:"#22d3ee",backgroundColor:"#083344"}, turn:{maxWidth:"94%",borderRadius:14,padding:11,borderWidth:1}, turnCoach:{alignSelf:"flex-start",backgroundColor:"#10243e",borderColor:"#155e75"}, turnInvestor:{alignSelf:"flex-end",backgroundColor:"#312e81",borderColor:"#6366f1"}, turnRole:{color:"#94a3b8",fontSize:9,fontWeight:"900",marginBottom:4}, turnText:{color:"white",lineHeight:20}, altButton:{flex:1,borderColor:"#67e8f9",borderWidth:1,padding:13,borderRadius:14,alignItems:"center"}, altText:{color:"#67e8f9",fontWeight:"900"}, endDecision:{alignSelf:"center",marginTop:8,padding:8}, endDecisionText:{color:"#94a3b8",fontSize:11,fontWeight:"800"},
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 999 }, floating: { position: "absolute", left: 14, width: 54, height: 54, borderRadius: 27, backgroundColor: "#22d3ee", borderWidth: 2, borderColor: "#a5f3fc", alignItems: "center", justifyContent: "center", shadowColor: "#22d3ee", shadowOpacity: 0.42, shadowRadius: 12, elevation: 9 }, pressed: { transform: [{ scale: 0.96 }], backgroundColor: "#06b6d4" }, g: { color: "#020617", fontSize: 25, fontWeight: "900" }, overlay: { flex: 1, backgroundColor: "rgba(2,6,23,.75)", justifyContent: "flex-end", padding: 14 }, dismiss: { flex: 1 }, panel: { maxHeight: "82%", backgroundColor: "#0f172a", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 24, padding: 17, marginBottom: 12 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, title: { color: "white", fontSize: 23, fontWeight: "900" }, subtitle: { color: "#67e8f9", marginTop: 3 }, close: { color: "white", fontSize: 22, fontWeight: "900", padding: 8 }, scroll: { flexGrow: 0 }, policy: { color: "#a7f3d0", backgroundColor: "#052e2b", borderRadius: 12, padding: 11, lineHeight: 18, fontSize: 12 }, promptWrap: { marginTop: 8 }, prompt: { backgroundColor: "#020617", borderColor: "#334155", borderWidth: 1, borderRadius: 13, padding: 12, marginTop: 8 }, promptText: { color: "#cbd5e1", fontWeight: "800" }, input: { minHeight: 70, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "#334155", backgroundColor: "#020617", color: "white", padding: 13, textAlignVertical: "top" }, actions: { flexDirection: "row", gap: 9, marginTop: 10 }, ask: { flex: 1, backgroundColor: "#0891b2", padding: 14, borderRadius: 14, alignItems: "center" }, mic: { width: 54, backgroundColor: "#1e293b", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" }, micRecording: { backgroundColor: "#991b1b", borderColor: "#fca5a5" }, disabled: { opacity: 0.65 }, askText: { color: "white", fontWeight: "900" }, micText: { color: "white", fontSize: 20, fontWeight: "900" }, voiceStatus: { color: "#fca5a5", textAlign: "center", marginTop: 8, fontSize: 12, fontWeight: "800" }, voicePreference: { alignSelf: "flex-start", marginTop: 9, paddingVertical: 5 }, voicePreferenceText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" }, answerCard: { marginTop: 13, backgroundColor: "#082f49", borderColor: "#155e75", borderWidth: 1, borderRadius: 15, padding: 14 }, meta: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 8 }, chip: { color: "#67e8f9", backgroundColor: "#020617", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "900" }, answer: { color: "white", lineHeight: 21 }, speechActions: { marginTop: 9 }, replay: { color: "#67e8f9", fontWeight: "900", fontSize: 12 }, evidence: { color: "#94a3b8", fontSize: 12, marginTop: 6 }, disclaimer: { color: "#fcd34d", fontSize: 11, lineHeight: 17, marginTop: 11 }
});
