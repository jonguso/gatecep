import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import useMarketData from "../../src/services/markets/useMarketData";
import { loadCorporateActions } from "../../src/features/corporate-actions/corporateActionStore";
import { loadVerifiedNews } from "../../src/services/news/verifiedNewsApi";
import { NEWS_TABS, buildVerifiedNews, getNewsForTab, getNewsSummary } from "../../src/news/newsHubData";
import { ContainedPanel } from "../../src/components/mobile/MobileUI";

export default function News() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState("Market");
  const [actions, setActions] = useState([]);
  const [externalNews, setExternalNews] = useState([]);
  const [newsStatus, setNewsStatus] = useState({ loading: true, error: "", provider: "", sources: [] });
  const market = useMarketData();

  const refreshNews = useCallback(async () => {
    try {
      setNewsStatus((value) => ({ ...value, loading: true, error: "" }));
      const result = await loadVerifiedNews({ accessToken });
      setExternalNews(Array.isArray(result.items) ? result.items : []);
      setNewsStatus({ loading: false, error: "", provider: result.provider || "", sources: result.sources || [] });
    } catch (error) {
      setExternalNews([]);
      setNewsStatus({ loading: false, error: error.message || "Verified news is unavailable.", provider: "", sources: [] });
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    loadCorporateActions().then((items) => { if (active) setActions(Array.isArray(items) ? items : []); }).catch(() => { if (active) setActions([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (accessToken) refreshNews(); }, [accessToken, refreshNews]);

  const all = useMemo(() => buildVerifiedNews({ quotes: market.rows, actions, generatedAt: market.lastUpdated, provider: market.provider, externalNews }), [market.rows, market.lastUpdated, market.provider, actions, externalNews]);
  const rows = useMemo(() => getNewsForTab(all, tab), [all, tab]);
  const summary = useMemo(() => getNewsSummary(all), [all]);

  return <ScrollView style={s.screen} contentContainerStyle={s.content}>
    <Text style={s.title}>News & Insights</Text>
    <Text style={s.subtitle}>Official NSE evidence, attributable reporting, and clearly labelled Coach G analysis.</Text>
    <ActiveUserBanner />
    <View style={s.status}>
      <View style={s.statusTop}><Text style={s.statusTitle}>{newsStatus.loading ? "Loading verified news" : newsStatus.error ? "Verified news source unavailable" : "Verified news sources connected"}</Text><Pressable style={s.refresh} onPress={refreshNews}><Text style={s.refreshText}>Refresh</Text></Pressable></View>
      <Text style={s.body}>{newsStatus.loading ? "Checking the stored evidence feed…" : newsStatus.error ? `${newsStatus.error} Existing market evidence remains separate.` : `${externalNews.length} articles from ${newsStatus.sources.length} attributable source${newsStatus.sources.length === 1 ? "" : "s"}.`}</Text>
    </View>
    <View style={s.tabs}>{NEWS_TABS.map((item) => <Pressable key={item} style={[s.tab, tab === item && s.active]} onPress={() => setTab(item)}><Text style={tab === item ? s.activeText : s.tabText}>{item}</Text></Pressable>)}</View>
    <View style={s.summary}><Metric label="Market" value={summary.market}/><Metric label="Company" value={summary.company}/><Metric label="Dividends" value={summary.dividends}/><Metric label="Coach G" value={summary.coachG}/></View>
    <ContainedPanel
      title={`${tab} (${rows.length})`}
      subtitle="Scroll verified items"
      emptyMessage={!newsStatus.loading ? `No verified ${tab.toLowerCase()} items are available. GateCEP does not substitute placeholder news.` : "Loading verified news…"}
      testID="news-contained-panel"
    >
      {rows.map((item) => <Pressable key={item.id} disabled={!item.url} style={s.row} onPress={() => item.url && Linking.openURL(item.url)}>
        <View style={s.top}><View style={[s.badge, item.trustLevel === "OFFICIAL" ? s.official : s.reported]}><Text style={s.badgeText}>{item.trustLevel === "OFFICIAL" ? "Official" : item.category === "Coach G" ? "Analysis" : "Reported"}</Text></View><Text style={s.date}>{item.date || "Date unavailable"}</Text></View>
        <Text style={s.newsTitle}>{item.symbol ? `${item.symbol} · ` : ""}{item.title}</Text>
        <Text style={s.source}>{item.source}</Text>
        <Text style={s.body}>{item.detail}</Text>
        {item.url ? <Text style={s.open}>Open original source ↗</Text> : null}
      </Pressable>)}
    </ContainedPanel>
  </ScrollView>;
}

function Metric({ label, value }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" }, content: { padding: 22, paddingTop: 70, paddingBottom: 120 }, title: { color: "white", fontSize: 32, fontWeight: "900" }, subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 22 }, status: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: "rgba(6,182,212,.10)", borderColor: "rgba(6,182,212,.4)", borderWidth: 1 }, statusTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, statusTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 17, flex: 1 }, refresh: { backgroundColor: "#155e75", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, refreshText: { color: "#67e8f9", fontWeight: "900" }, body: { color: "#cbd5e1", marginTop: 7, lineHeight: 20 }, tabs: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 8 }, tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: "#1e293b" }, active: { backgroundColor: "#9333ea" }, tabText: { color: "#94a3b8", fontWeight: "900" }, activeText: { color: "white", fontWeight: "900" }, summary: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "47%", backgroundColor: "#0f172a", borderRadius: 16, padding: 14 }, metricLabel: { color: "#94a3b8", fontSize: 12 }, metricValue: { color: "white", fontWeight: "900", marginTop: 4 }, card: { marginTop: 18, backgroundColor: "#0f172a", borderRadius: 20, padding: 16 }, cardTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 18 }, row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, official: { backgroundColor: "#065f46" }, reported: { backgroundColor: "#334155" }, badgeText: { color: "white", fontSize: 11, fontWeight: "900" }, date: { color: "#94a3b8", fontSize: 12 }, newsTitle: { color: "white", fontWeight: "900", marginTop: 8, lineHeight: 21 }, source: { color: "#67e8f9", marginTop: 6, fontSize: 12 }, open: { color: "#a78bfa", fontWeight: "900", marginTop: 9, fontSize: 12 }
});
