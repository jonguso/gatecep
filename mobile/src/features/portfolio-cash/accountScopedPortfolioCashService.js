import {
  userGetItem
} from "../../services/auth/userStorage";

/*
 * PC-028S
 * Account-scoped cash service.
 *
 * Current canonical cash storage supports:
 * - aggregate real cash in userStorage["availableCash"]
 * - optional per-account cash map in userStorage["portfolioCashBySource"]
 *
 * Practice remains separate and is never part of real account cash.
 */

function n(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseObject(raw) {
  if (!raw) return {};

  if (typeof raw === "object") {
    return raw;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeKey(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export async function loadAggregateRealAvailableCash() {
  const raw = await userGetItem("availableCash");
  return n(raw);
}

export async function loadAccountCashMap() {
  const raw = await userGetItem("portfolioCashBySource");
  return parseObject(raw);
}

export function buildPortfolioCashLookupKeys(source = {}) {
  const keys = [];

  const push = (value) => {
    const key = normalizeKey(value);
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  push(source?.id);
  push(source?.sourceId);
  push(source?.brokerAccountId);
  push(source?.accountId);
  push(source?.brokerId);
  push(source?.broker);
  push(source?.name);
  push(source?.label);

  return keys;
}

export async function loadRealAvailableCashForSource(source = {}) {
  const type = String(source?.type || "").toUpperCase();

  if (type === "ALL") {
    return loadAggregateRealAvailableCash();
  }

  const cashMap = await loadAccountCashMap();
  const keys = buildPortfolioCashLookupKeys(source);

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(cashMap, key) &&
      Number.isFinite(Number(cashMap[key]))
    ) {
      return Number(cashMap[key]);
    }
  }

  /*
   * Do not attach aggregate All-Accounts cash to a single broker/account.
   * Returning 0 is safer than duplicating aggregate cash across accounts.
   */
  return 0;
}

export function loadPracticeAvailableCash(practicePortfolio = {}) {
  return n(practicePortfolio?.availableCash);
}

export async function buildAccountScopedCashContext({
  source = {},
  practicePortfolio = null
} = {}) {
  const type = String(source?.type || "").toUpperCase();

  if (type === "PRACTICE") {
    return {
      cash: loadPracticeAvailableCash(practicePortfolio),
      scope: "PRACTICE",
      sourceType: "PRACTICE",
      fallbackUsed: false
    };
  }

  const cash = await loadRealAvailableCashForSource(source);

  return {
    cash,
    scope: type === "ALL" ? "ALL_REAL_ACCOUNTS" : "REAL_ACCOUNT",
    sourceType: type || "REAL",
    fallbackUsed: false
  };
}
