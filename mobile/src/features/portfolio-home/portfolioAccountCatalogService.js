function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function realBrokerKey(value) {
  const broker = String(value || "").trim();
  const key = broker.toUpperCase();
  if (!broker || key === "ALL" || key === "PRACTICE" || key === "GATECEP-DEMO") return null;
  return { broker, key };
}

export function derivePortfolioAccounts(portfolio = {}) {
  const accounts = new Map();
  const add = (rawBroker, values = {}) => {
    const identity = realBrokerKey(rawBroker);
    if (!identity) return;
    const current = accounts.get(identity.key) || {
      broker: identity.broker,
      label: identity.broker,
      type: "BROKER",
      holdingsCount: 0,
      holdingsValue: 0,
      availableCash: 0
    };
    current.holdingsCount += n(values.holdingsCount);
    current.holdingsValue += n(values.holdingsValue);
    current.availableCash += n(values.availableCash);
    current.totalValue = current.holdingsValue + current.availableCash;
    accounts.set(identity.key, current);
  };

  (Array.isArray(portfolio?.holdings) ? portfolio.holdings : []).forEach((holding) => {
    add(holding?.brokerAccountId ?? holding?.accountId ?? holding?.broker, {
      holdingsCount: 1,
      holdingsValue: holding?.marketValue ?? holding?.value
    });
  });
  (Array.isArray(portfolio?.cashBalances) ? portfolio.cashBalances : []).forEach((balance) => {
    add(balance?.brokerAccountId ?? balance?.accountId ?? balance?.broker, {
      availableCash: balance?.cashBalance ?? balance?.availableCash
    });
  });
  return Array.from(accounts.values());
}

export function mergePortfolioAccounts(primary = [], fallback = []) {
  const merged = new Map();
  [...fallback, ...primary].forEach((account) => {
    const identity = realBrokerKey(account?.broker);
    if (!identity || account?.type === "ALL") return;
    const previous = merged.get(identity.key) || {};
    merged.set(identity.key, {
      ...previous,
      ...account,
      broker: identity.broker,
      label: account?.label || previous?.label || identity.broker,
      type: account?.type || previous?.type || "BROKER"
    });
  });
  return Array.from(merged.values());
}
