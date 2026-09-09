import { userGetItem, userSetItem } from "../auth/userStorage";
import { loadUnifiedPortfolio } from "../portfolio/unifiedPortfolioApi";
import { loadCanonicalRealTransactionHistory } from "../../features/wealth-journey/canonicalRealBehaviorHistoryService";

export async function buildAlerts() {
  const existing = await readStoredAlerts();
  const portfolioData = await loadUnifiedPortfolio();
  const portfolio = portfolioData?.holdings || [];
  const cashRaw = await userGetItem("availableCash");
  const calendarRaw = await userGetItem("marketCalendar");
  const cash = Number(cashRaw || 0);
  const calendar = calendarRaw ? JSON.parse(calendarRaw) : [];
  const transactions = await loadCanonicalRealTransactionHistory();
  const alerts = [];

  if (cash > 0) alerts.push({ id: "cash-available", type: "CASH", symbol: "CASH", title: "Cash available for deployment", message: `You have KES ${money(cash)} available for investing.`, route: "/portfolio-sync-center", createdAt: new Date().toISOString(), read: false });

  portfolio.forEach((holding) => {
    const changePct = Number(holding.marketChangePct || holding.changePct || 0);
    if (Math.abs(changePct) >= 3) alerts.push({ id: `move-${holding.symbol}`, type: "PRICE_MOVE", symbol: holding.symbol, title: `${holding.symbol} moved ${changePct.toFixed(2)}%`, message: changePct > 0 ? `${holding.name || holding.symbol} is moving strongly upward.` : `${holding.name || holding.symbol} is under pressure today.`, route: `/security/${holding.symbol}`, createdAt: new Date().toISOString(), read: false });
  });

  calendar.slice(0, 5).forEach((event) => alerts.push({ id: `event-${event.symbol}-${event.date}-${event.type}`, type: "CALENDAR", symbol: event.symbol, title: `${event.symbol} ${event.type}`, message: `${event.detail || "Upcoming market calendar event"} on ${event.date}.`, route: `/security/${event.symbol}`, createdAt: new Date().toISOString(), read: false }));
  if (transactions.length >= 15) alerts.push({ id: "trading-frequency", type: "BEHAVIOR", symbol: "COACH", title: "Trading frequency elevated", message: "Coach G detected higher trading activity. Review behavior insights.", route: "/(tabs)/coach", createdAt: new Date().toISOString(), read: false });

  alerts.push(...existing.filter((item) => item.source === "PORTFOLIO_AWARE_NEWS"));
  return saveAlerts(alerts);
}

export async function loadAlerts() {
  const stored = await readStoredAlerts();
  return stored.length ? stored : buildAlerts();
}

export async function savePortfolioAwareAlerts(portfolioAlerts = []) {
  const existing = await readStoredAlerts();
  const prior = new Map(existing.filter((item) => item.source === "PORTFOLIO_AWARE_NEWS").map((item) => [item.id, item]));
  const retained = existing.filter((item) => item.source !== "PORTFOLIO_AWARE_NEWS");
  const next = (Array.isArray(portfolioAlerts) ? portfolioAlerts : []).map((alert) => ({ id: alert.id, type: alert.dividendImpact?.relevant ? "DIVIDEND" : "PORTFOLIO_NEWS", symbol: alert.symbol || "MARKET", title: alert.label, message: alert.coachMessage || alert.rationale, severity: alert.severity || "MEDIUM", createdAt: alert.publishedAt || new Date().toISOString(), read: prior.get(alert.id)?.read === true, source: "PORTFOLIO_AWARE_NEWS", route: "/investor-alert-review", payload: alert }));
  return saveAlerts([...retained, ...next]);
}

export async function saveAlerts(alerts = []) {
  await userSetItem("alerts", JSON.stringify(alerts));
  return alerts;
}

export async function unreadAlertCount() {
  const alerts = await loadAlerts();
  return alerts.filter((item) => !item.read).length;
}

async function readStoredAlerts() {
  const raw = await userGetItem("alerts");
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function money(value) { return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
