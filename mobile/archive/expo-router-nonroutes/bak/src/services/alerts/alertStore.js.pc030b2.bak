import { userGetItem, userSetItem } from "../auth/userStorage";
import { loadUnifiedPortfolio } from "../portfolio/unifiedPortfolioApi";

export async function buildAlerts() {
  const portfolioData = await loadUnifiedPortfolio();
  const portfolio = portfolioData?.holdings || [];

  const cashRaw = await userGetItem("availableCash");
  const calendarRaw = await userGetItem("marketCalendar");
  const txRaw = await userGetItem("transactionHistory");

  const cash = Number(cashRaw || 0);
  const calendar = calendarRaw ? JSON.parse(calendarRaw) : [];
  const transactions = txRaw ? JSON.parse(txRaw) : [];

  const alerts = [];

  if (cash > 0) {
    alerts.push({
      id: "cash-available",
      type: "CASH",
      symbol: "CASH",
      title: "Cash available for deployment",
      message: `You have KES ${money(cash)} available for investing.`,
      route: "/portfolio-sync-center",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  portfolio.forEach((holding) => {
    const changePct = Number(holding.marketChangePct || holding.changePct || 0);

    if (Math.abs(changePct) >= 3) {
      alerts.push({
        id: `move-${holding.symbol}`,
        type: "PRICE_MOVE",
        symbol: holding.symbol,
        title: `${holding.symbol} moved ${changePct.toFixed(2)}%`,
        message:
          changePct > 0
            ? `${holding.name || holding.symbol} is moving strongly upward.`
            : `${holding.name || holding.symbol} is under pressure today.`,
        route: `/security/${holding.symbol}`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
  });

  calendar.slice(0, 5).forEach((event) => {
    alerts.push({
      id: `event-${event.symbol}-${event.date}-${event.type}`,
      type: "CALENDAR",
      symbol: event.symbol,
      title: `${event.symbol} ${event.type}`,
      message: `${event.detail || "Upcoming market calendar event"} on ${event.date}.`,
      route: `/security/${event.symbol}`,
      createdAt: new Date().toISOString(),
      read: false
    });
  });

  if (transactions.length >= 15) {
    alerts.push({
      id: "trading-frequency",
      type: "BEHAVIOR",
      symbol: "COACH",
      title: "Trading frequency elevated",
      message: "Coach G detected higher trading activity. Review behavior insights.",
      route: "/coach-insights",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  await userSetItem("alerts", JSON.stringify(alerts));

  return alerts;
}

export async function loadAlerts() {
  const raw = await userGetItem("alerts");

  if (raw) {
    return JSON.parse(raw);
  }

  return await buildAlerts();
}

export async function saveAlerts(alerts = []) {
  await userSetItem("alerts", JSON.stringify(alerts));
  return alerts;
}

export async function unreadAlertCount() {
  const alerts = await loadAlerts();
  return alerts.filter((item) => !item.read).length;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}