import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import useMarketData from "../../src/services/markets/useMarketData";
import { loadCorporateActions } from "../../src/features/corporate-actions/corporateActionStore";
import { loadVerifiedNews } from "../../src/services/news/verifiedNewsApi";
import { NEWS_TABS, buildVerifiedNews, getNewsForTab, getNewsSummary } from "../../src/news/newsHubData";
import { ContainedPanel } from "../../src/components/mobile/MobileUI";
import { loadUnifiedPortfolioRuntime } from "../../src/portfolio/unifiedPortfolioApi";
import { buildPortfolioAwareInvestorAlerts } from "../../src/features/intelligence/portfolioAwareInvestorAlertService";

export default function News() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState("For You");
  const [actions, setActions] = useState([]);
  const [externalNews, setExternalNews] = useState([]);
  const [holdings, setHoldings] = useState([]);
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
    Promise.allSettled([loadCorporateActions(), loadUnifiedPortfolioRuntime({ broker: "ALL" })]).then(([actionResult, portfolioResult]) => {
      if (!active) return;
      setActions(actionResult.status === "fulfilled" && Array.isArray(actionResult.value) ? actionResult.value : []);
      setHoldings(portfolioResult.status === "fulfilled" && Array.isArray(portfolioResult.value?.holdings) ? portfolioResult.value.holdings : []);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (accessToken) refreshNews(); }, [accessToken, refreshNews]);

  const all = useMemo(() => buildVerifiedNews({ quotes: market.rows, actions, generatedAt: market.lastUpdated, provider: market.provider, externalNews }), [market.rows, market.lastUpdated, market.provider, actions, externalNews]);
  const personalizedAlerts = useMemo(() => buildPortfolioAwareInvestorAlerts({ evidence: all, holdings }).filter((alert) => alert.portfolioImpact.held || alert.dividendImpact.relevant || alert.action !== "NO_ACTION"), [all, holdings]);
  const rows = useMemo(() => tab === "For You" ? personalizedAlerts : getNewsForTab(all, tab), [all, personalizedAlerts, tab]);
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
      subtitle={tab === "For You" ? "Portfolio-aware educational alerts" : "Scroll verified items"}
      emptyMessage={!newsStatus.loading ? `No verified ${tab.toLowerCase()} items are available. GateCEP does not substitute placeholder news.` : "Loading verified news…"}
      testID="news-contained-panel"
    >
      {rows.map((item) => tab === "For You" ? <Pressable key={item.id} style={s.row} onPress={() => router.push({ pathname: "/investor-alert-review", params: { alert: JSON.stringify(item) } })}>
        <View style={s.top}><View style={[s.badge, item.severity === "HIGH" ? s.high : s.official]}><Text style={s.badgeText}>{item.label}</Text></View><Text style={s.date}>{item.publishedAt ? String(item.publishedAt).slice(0, 10) : "Date unavailable"}</Text></View>
        <Text style={s.newsTitle}>{item.symbol ? `${item.symbol} · ` : ""}{item.title}</Text>
        <Text style={s.source}>{item.portfolioImpact.held ? `${item.portfolioImpact.portfolioWeight.toFixed(2)}% of your REAL portfolio` : "Not currently held"}</Text>
        <Text style={s.body}>{item.rationale}</Text>
        <Text style={s.open}>Review portfolio impact ›</Text>
      </Pressable> : <View key={item.id} style={s.row}>
        <View style={s.top}><View style={[s.badge, item.trustLevel === "OFFICIAL" ? s.official : s.reported]}><Text style={s.badgeText}>{item.trustLevel === "OFFICIAL" ? "Official" : item.category === "Coach G" ? "Analysis" : "Reported"}</Text></View><Text style={s.date}>{item.date || "Date unavailable"}</Text></View>
        <Text style={s.newsTitle}>{item.symbol ? `${item.symbol} · ` : ""}{item.title}</Text>
        <Text style={s.source}>{item.source}</Text>
        <Text style={s.body}>{item.detail}</Text>
        <View style={s.itemActions}><Pressable onPress={() => router.push({ pathname: "/investor-alert-review", params: { alert: JSON.stringify(buildPortfolioAwareInvestorAlerts({ evidence: [item], holdings })[0]) } })}><Text style={s.open}>Review portfolio impact ›</Text></Pressable>{item.url ? <Pressable onPress={() => Linking.openURL(item.url)}><Text style={s.open}>Original source ↗</Text></Pressable> : null}</View>
      </View>)}
    </ContainedPanel>
  </ScrollView>;
}

function Metric({ label, value }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" }, content: { padding: 22, paddingTop: 70, paddingBottom: 120 }, title: { color: "white", fontSize: 32, fontWeight: "900" }, subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 22 }, status: { marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: "rgba(6,182,212,.10)", borderColor: "rgba(6,182,212,.4)", borderWidth: 1 }, statusTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, statusTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 17, flex: 1 }, refresh: { backgroundColor: "#155e75", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, refreshText: { color: "#67e8f9", fontWeight: "900" }, body: { color: "#cbd5e1", marginTop: 7, lineHeight: 20 }, tabs: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 8 }, tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: "#1e293b" }, active: { backgroundColor: "#9333ea" }, tabText: { color: "#94a3b8", fontWeight: "900" }, activeText: { color: "white", fontWeight: "900" }, summary: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "47%", backgroundColor: "#0f172a", borderRadius: 16, padding: 14 }, metricLabel: { color: "#94a3b8", fontSize: 12 }, metricValue: { color: "white", fontWeight: "900", marginTop: 4 }, card: { marginTop: 18, backgroundColor: "#0f172a", borderRadius: 20, padding: 16 }, cardTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 18 }, row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, maxWidth: "72%" }, official: { backgroundColor: "#065f46" }, high: { backgroundColor: "#991b1b" }, reported: { backgroundColor: "#334155" }, badgeText: { color: "white", fontSize: 11, fontWeight: "900" }, date: { color: "#94a3b8", fontSize: 12 }, newsTitle: { color: "white", fontWeight: "900", marginTop: 8, lineHeight: 21 }, source: { color: "#67e8f9", marginTop: 6, fontSize: 12 }, open: { color: "#a78bfa", fontWeight: "900", marginTop: 9, fontSize: 12 }, itemActions: { flexDirection: "row", flexWrap: "wrap", gap: 18 }
});
