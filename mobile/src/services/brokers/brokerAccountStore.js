import { userGetItem, userSetItem } from "../auth/userStorage";
import { findBrokerById } from "./brokerRegistry";

const CDS_PROFILE_KEY = "cdsProfile";
const BROKER_ACCOUNTS_KEY = "brokerAccounts";
const DEFAULT_BROKER_KEY = "defaultBrokerProfile";

export async function saveCdsProfile({
  cdsNumber = "",
  holderName = "",
  source = "USER_PROVIDED"
} = {}) {
  const profile = {
    cdsNumber: String(cdsNumber || "").trim(),
    holderName: String(holderName || "").trim(),
    source,
    updatedAt: new Date().toISOString()
  };

  await userSetItem(CDS_PROFILE_KEY, JSON.stringify(profile));

  return profile;
}

export async function loadCdsProfile() {
  const raw = await userGetItem(CDS_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function loadBrokerAccounts() {
  const raw = await userGetItem(BROKER_ACCOUNTS_KEY);

  if (!raw) return [];

  const parsed = JSON.parse(raw);

  return Array.isArray(parsed) ? parsed : [];
}

export async function saveBrokerAccounts(accounts = []) {
  await userSetItem(BROKER_ACCOUNTS_KEY, JSON.stringify(accounts));

  const defaultAccount =
    accounts.find((item) => item.defaultBroker) || accounts[0] || null;

  if (defaultAccount) {
    await userSetItem(
      DEFAULT_BROKER_KEY,
      JSON.stringify(toDefaultBrokerProfile(defaultAccount))
    );
  }

  return accounts;
}

export async function upsertBrokerAccount({
  brokerId,
  brokerName,
  clientNumber = "",
  nickname = "",
  defaultBroker = false,
  status = "ACTIVE",
  connectionMode = "MANUAL_PROFILE",
  apiMode = "PENDING_BROKER_API",
  feeSchedule = null
} = {}) {
  const broker = findBrokerById(brokerId || "SIM");
  const accounts = await loadBrokerAccounts();

  const resolvedBrokerId = brokerId || broker.id;
  const resolvedBrokerName = brokerName || broker.name;

  const existing = accounts.find(
    (item) => item.brokerId === resolvedBrokerId
  );

  const now = new Date().toISOString();

  const nextAccount = {
    id: existing?.id || `${resolvedBrokerId}-${Date.now()}`,
    brokerId: resolvedBrokerId,
    brokerName: resolvedBrokerName,
    broker: resolvedBrokerName,
    name: resolvedBrokerName,
    nickname: nickname || existing?.nickname || broker.shortName || resolvedBrokerName,
    clientNumber: String(clientNumber || existing?.clientNumber || "").trim(),
    defaultBroker: defaultBroker || existing?.defaultBroker || accounts.length === 0,
    status,
    connected: true,
    linked: true,
    connectionMode,
    apiMode,
    feeSchedule: feeSchedule || existing?.feeSchedule || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastSyncAt: existing?.lastSyncAt || null
  };

  let next = accounts.filter((item) => item.brokerId !== resolvedBrokerId);

  next.unshift(nextAccount);

  if (nextAccount.defaultBroker) {
    next = next.map((item) => ({
      ...item,
      defaultBroker: item.id === nextAccount.id
    }));
  }

  if (!next.some((item) => item.defaultBroker)) {
    next = next.map((item, index) => ({
      ...item,
      defaultBroker: index === 0
    }));
  }

  return await saveBrokerAccounts(next);
}

export async function setDefaultBrokerAccount(accountId) {
  const accounts = await loadBrokerAccounts();

  const next = accounts.map((item) => ({
    ...item,
    defaultBroker: item.id === accountId,
    updatedAt: new Date().toISOString()
  }));

  return await saveBrokerAccounts(next);
}

export async function removeBrokerAccount(accountId) {
  const accounts = await loadBrokerAccounts();

  let next = accounts.filter((item) => item.id !== accountId);

  if (next.length && !next.some((item) => item.defaultBroker)) {
    next = next.map((item, index) => ({
      ...item,
      defaultBroker: index === 0
    }));
  }

  return await saveBrokerAccounts(next);
}

export async function getDefaultBrokerAccount() {
  const accounts = await loadBrokerAccounts();

  return accounts.find((item) => item.defaultBroker) || accounts[0] || null;
}

export function toDefaultBrokerProfile(account = {}) {
  return {
    id: account.id,
    brokerAccountId: account.id,
    brokerId: account.brokerId,
    broker: account.brokerName || account.name,
    name: account.brokerName || account.name,
    nickname: account.nickname,
    clientNumber: account.clientNumber,
    connected: !!account.connected,
    linked: !!account.linked,
    defaultBroker: !!account.defaultBroker,
    connectionMode: account.connectionMode,
    apiMode: account.apiMode,
    status: account.status,
    updatedAt: new Date().toISOString()
  };
}
