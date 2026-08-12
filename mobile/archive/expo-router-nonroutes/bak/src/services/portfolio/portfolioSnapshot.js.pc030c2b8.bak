/**
 * =====================================================
 * Portfolio Snapshot Store
 * Version: 2.0.0
 *
 * Changes:
 * - Migrated from global AsyncStorage
 * - User-scoped snapshot storage
 * - Multi-user safe
 * =====================================================
 */

import {
  userGetItem,
  userSetItem
} from "../auth/userStorage";

const PORTFOLIO_SNAPSHOTS_KEY = "portfolioSnapshots";

export async function savePortfolioSnapshot({
  investedValue = 0,
  currentValue = 0,
  cash = 0,
  healthScore = 0,
  healthRating = "",
  netGainLoss = 0,
  gainLossPct = 0
} = {}) {
  const today = new Date().toISOString().slice(0, 10);

  const raw = await userGetItem(PORTFOLIO_SNAPSHOTS_KEY);
  const existing = raw ? JSON.parse(raw) : [];

  const snapshot = {
    id: `SNAP-${today}`,
    date: today,
    investedValue: Number(investedValue || 0),
    currentValue: Number(currentValue || 0),
    cash: Number(cash || 0),
    totalValue: Number(currentValue || 0) + Number(cash || 0),
    healthScore: Number(healthScore || 0),
    healthRating,
    netGainLoss: Number(netGainLoss || 0),
    gainLossPct: Number(gainLossPct || 0),
    savedAt: new Date().toISOString()
  };

  const withoutToday = Array.isArray(existing)
    ? existing.filter((item) => item.date !== today)
    : [];

  const next = [snapshot, ...withoutToday]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 365);

  await userSetItem(PORTFOLIO_SNAPSHOTS_KEY, JSON.stringify(next));

  return snapshot;
}

export async function loadPortfolioSnapshots() {
  const raw = await userGetItem(PORTFOLIO_SNAPSHOTS_KEY);

  if (!raw) return [];

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) return [];

  return parsed.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function clearPortfolioSnapshots() {
  await userSetItem(PORTFOLIO_SNAPSHOTS_KEY, JSON.stringify([]));
}