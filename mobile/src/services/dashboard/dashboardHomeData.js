export function buildDashboardHome() {
  return {
    portfolioValue: 1250000,
    todaysPnL: 12400,
    cash: 250000,
    openOrders: 3,

    marketPulse: {
      topGainer: "SCOM",
      topLoser: "KPLC",
      mostActive: "EQT",
      foreignActivity: "Net Buy"
    },

    coachInsight: {
      symbol: "SCOM",
      confidence: 84,
      message:
        "Momentum remains positive with strong institutional demand."
    },

    notifications: [
      "Dividend paid - KCB",
      "Order filled - SCOM",
      "Broker statement ready",
      "Price alert triggered - EABL"
    ],

    goalTracker: {
      target: 5000000,
      current: 1250000
    }
  };
}