import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { buildCalendarMonthDays, buildVerifiedCalendarEvents, calendarRangeForTab, getCalendarSummary, monthLabel } from "../../src/calendar/calendarHubData";
import { loadVerifiedCalendar } from "../../src/services/calendar/verifiedCalendarApi";
import { loadCorporateActions } from "../../src/features/corporate-actions/corporateActionStore";

export default function Calendar() {
  const { accessToken } = useAuth();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [actions, setActions] = useState([]);
  const [externalEvents, setExternalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const range = calendarRangeForTab("This Month", visibleMonth);
    const [localResult, remoteResult] = await Promise.allSettled([
      loadCorporateActions(),
      loadVerifiedCalendar({ accessToken, ...range })
    ]);
    setActions(localResult.status === "fulfilled" && Array.isArray(localResult.value) ? localResult.value : []);
    if (remoteResult.status === "fulfilled") {
      setExternalEvents(Array.isArray(remoteResult.value.events) ? remoteResult.value.events : []);
    } else {
      setExternalEvents([]);
      setError(remoteResult.reason?.message || "Verified calendar evidence is unavailable.");
    }
    setLoading(false);
  }, [accessToken, visibleMonth]);

  useEffect(() => { if (accessToken) load(); }, [accessToken, load]);

  const events = useMemo(() => buildVerifiedCalendarEvents(actions, "This Month", visibleMonth, externalEvents), [actions, externalEvents, visibleMonth]);
  const summary = useMemo(() => getCalendarSummary(events), [events]);
  const days = useMemo(() => buildCalendarMonthDays(events, visibleMonth), [events, visibleMonth]);
  const selectedEvents = useMemo(() => events.filter((event) => event.date === selectedDate), [events, selectedDate]);
  const moveMonth = (offset) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <Text style={s.title}>Calendar</Text>
    <Text style={s.subtitle}>Verified corporate actions and explicitly dated market events.</Text>
    <ActiveUserBanner />
    <View style={s.monthNav}><Pressable accessibilityLabel="Previous month" style={s.navButton} onPress={() => moveMonth(-1)}><Text style={s.navText}>‹</Text></Pressable><View style={s.monthCenter}><Text style={s.monthTitle}>{monthLabel(visibleMonth)}</Text><Pressable onPress={() => setVisibleMonth(new Date())}><Text style={s.today}>Today</Text></Pressable></View><Pressable accessibilityLabel="Next month" style={s.navButton} onPress={() => moveMonth(1)}><Text style={s.navText}>›</Text></Pressable></View>
    <View style={s.summary}><Metric label="Events" value={summary.total}/><Metric label="Dividends" value={summary.dividends}/><Metric label="Deadlines" value={summary.deadlines}/><Metric label="Securities" value={summary.actions}/></View>
    <View style={s.card}>
      <View style={s.cardHead}><Text style={s.cardTitle}>Market calendar</Text><Pressable style={s.refresh} onPress={load}><Text style={s.refreshText}>Refresh</Text></Pressable></View>
      {loading ? <Text style={s.body}>Loading verified events…</Text> : null}
      {!loading && error ? <Text style={s.error}>{error} Existing verified local corporate actions remain available.</Text> : null}
      <View style={s.weekdays}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <Text key={day} style={s.weekday}>{day}</Text>)}</View>
      <View style={s.monthGrid}>{days.map((item) => <Pressable key={item.date} accessibilityLabel={`${item.date}, ${item.events.length} verified events`} style={[s.day, !item.inMonth && s.outsideDay, item.events.length > 0 && s.eventDay]} onPress={() => setSelectedDate(item.date)}><Text style={[s.dayNumber, !item.inMonth && s.outsideText]}>{item.day}</Text>{item.events.length ? <View style={s.dayEvent}><Text style={s.dayEventText}>{item.events.length}</Text></View> : null}</Pressable>)}</View>
      {!loading && !events.length ? <Text style={s.empty}>No verified events are available for this month. GateCEP does not display sample dates.</Text> : null}
    </View>
    <View style={s.policy}><Text style={s.cardTitle}>Evidence policy</Text><Text style={s.body}>Only explicitly labelled event dates from an official, reported, broker, custodian, manual or provider reference are displayed. Article publication dates do not become investment deadlines.</Text></View>
    <Modal visible={Boolean(selectedDate)} transparent animationType="fade" onRequestClose={() => setSelectedDate("")}><Pressable style={s.overlay} onPress={() => setSelectedDate("")}><Pressable style={s.modal} onPress={(event) => event.stopPropagation()}><View style={s.modalHead}><View><Text style={s.modalTitle}>{selectedDate}</Text><Text style={s.modalSubtitle}>{selectedEvents.length} verified {selectedEvents.length === 1 ? "event" : "events"}</Text></View><Pressable style={s.close} onPress={() => setSelectedDate("")}><Text style={s.closeText}>×</Text></Pressable></View><ScrollView style={s.modalScroll}>{selectedEvents.length ? selectedEvents.map((event) => <EventDetail key={event.id} event={event} />) : <Text style={s.body}>No verified events for this date.</Text>}</ScrollView></Pressable></Pressable></Modal>
  </ScrollView>;
}

function Metric({ label, value }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }
function EventDetail({ event }) { return <View style={s.row}><View style={s.eventMain}><View style={s.badges}><View style={[s.badge, event.trustLevel === "OFFICIAL" ? s.official : s.verified]}><Text style={s.badgeText}>{event.trustLevel === "OFFICIAL" ? "Official" : event.trustLevel === "REPORTED" ? "Reported" : "Verified"}</Text></View><Text style={s.type}>{event.type.replaceAll("_", " ")}</Text></View><Text style={s.eventTitle}>{event.title}</Text><Text style={s.company}>{event.company}</Text><Text style={s.body}>{event.detail}</Text><Text style={s.source}>{event.source}</Text>{event.url ? <Pressable onPress={() => Linking.openURL(event.url)}><Text style={s.open}>Open original evidence ↗</Text></Pressable> : null}</View></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" }, content: { padding: 22, paddingTop: 70, paddingBottom: 120 }, title: { color: "white", fontSize: 32, fontWeight: "900" }, subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 22 }, monthNav: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0f172a", borderRadius: 18, padding: 10 }, navButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, navText: { color: "#67e8f9", fontSize: 30, lineHeight: 32, fontWeight: "900" }, monthCenter: { alignItems: "center" }, monthTitle: { color: "white", fontWeight: "900", fontSize: 18 }, today: { color: "#a78bfa", fontWeight: "900", marginTop: 4, fontSize: 12 }, summary: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "47%", backgroundColor: "#0f172a", borderRadius: 16, padding: 14 }, metricLabel: { color: "#94a3b8", fontSize: 12 }, metricValue: { color: "white", fontWeight: "900", marginTop: 4 }, card: { marginTop: 18, backgroundColor: "#0f172a", borderRadius: 20, padding: 16 }, cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 18 }, refresh: { backgroundColor: "#155e75", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }, refreshText: { color: "#67e8f9", fontWeight: "900" }, body: { color: "#cbd5e1", marginTop: 7, lineHeight: 20 }, error: { color: "#fca5a5", marginTop: 9, lineHeight: 20 }, weekdays: { flexDirection: "row", marginTop: 18 }, weekday: { width: "14.2857%", textAlign: "center", color: "#94a3b8", fontSize: 11, fontWeight: "900" }, monthGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 }, day: { width: "14.2857%", minHeight: 58, borderColor: "#1e293b", borderWidth: 0.5, padding: 6, backgroundColor: "#020617" }, outsideDay: { opacity: 0.38 }, eventDay: { backgroundColor: "rgba(147,51,234,.18)", borderColor: "#9333ea" }, dayNumber: { color: "white", fontWeight: "800", fontSize: 12 }, outsideText: { color: "#64748b" }, dayEvent: { marginTop: 8, alignSelf: "flex-start", minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#06b6d4", alignItems: "center", justifyContent: "center" }, dayEventText: { color: "#020617", fontWeight: "900", fontSize: 10 }, empty: { color: "#94a3b8", marginTop: 14, lineHeight: 20 }, row: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomColor: "#1e293b", borderBottomWidth: 1 }, eventMain: { flex: 1 }, badges: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" }, badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, official: { backgroundColor: "#065f46" }, verified: { backgroundColor: "#334155" }, badgeText: { color: "white", fontWeight: "900", fontSize: 10 }, type: { color: "#fbbf24", fontWeight: "900", fontSize: 11 }, eventTitle: { color: "white", fontWeight: "900", marginTop: 7 }, company: { color: "#67e8f9", marginTop: 5 }, source: { color: "#94a3b8", fontSize: 11, marginTop: 6 }, open: { color: "#a78bfa", fontWeight: "900", marginTop: 8, fontSize: 12 }, policy: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: "rgba(6,182,212,.1)", borderColor: "rgba(6,182,212,.4)", borderWidth: 1 }, overlay: { flex: 1, backgroundColor: "rgba(2,6,23,.82)", alignItems: "center", justifyContent: "center", padding: 18 }, modal: { width: "100%", maxWidth: 620, maxHeight: "82%", backgroundColor: "#0f172a", borderRadius: 22, borderWidth: 1, borderColor: "#334155", padding: 18 }, modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }, modalTitle: { color: "white", fontWeight: "900", fontSize: 21 }, modalSubtitle: { color: "#94a3b8", marginTop: 4 }, close: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, closeText: { color: "white", fontSize: 26, lineHeight: 28 }, modalScroll: { flexGrow: 0 }
});
