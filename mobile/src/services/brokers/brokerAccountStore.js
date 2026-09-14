import { userGetItem, userSetItem } from "../auth/userStorage";
import { findBrokerById } from "./brokerRegistry";

const CDS_PROFILE_KEY = "cdsProfile";
const BROKER_ACCOUNTS_KEY = "brokerAccounts";
const DEFAULT_BROKER_KEY = "defaultBrokerProfile";
const LEGACY_BROKER_PROFILE_KEY = "brokerProfile";
const LEGACY_BROKER_PROFILES_KEY = "brokerProfiles";

function cleanText(value) { return String(value ?? "").trim(); }

export function resolveCanonicalBrokerId(value = "") {
  const raw = cleanText(value).toUpperCase();
  if (!raw) return null;
  if (["AIB","AIB-AXYS","AIB AXYS"].includes(raw)) return "AIB";
  if (["ABC","ABC CAPITAL"].includes(raw)) return "ABC";
  if (["NCBA","NCBA INVESTMENT BANK"].includes(raw)) return "NCBA";
  if (["DYER","DYER & BLAIR","DYER AND BLAIR"].includes(raw)) return "DYER";
  if (["FAIDA","FAIDA INVESTMENT BANK"].includes(raw)) return "FAIDA";
  if (["STANDARD INVESTMENT BANK","SIB"].includes(raw)) return "SIB";
  if (["GATECEP-DEMO","GATECEP DEMO","GATECEP_PRACTICE","GATECEP PRACTICE","GATECEP BROKER","SIM","SIMULATION BROKER"].includes(raw)) return "GATECEP_PRACTICE";
  return raw.replace(/[^A-Z0-9]+/g, "_");
}

export async function migrateLegacyBrokerProfileToCanonicalAccounts() {
  const existing = await loadBrokerAccounts();
  if (existing.length > 0) return { migrated:false, reason:"CANONICAL_ACCOUNTS_ALREADY_PRESENT", accounts:existing };

  const [legacyRaw, legacyProfilesRaw, defaultRaw] = await Promise.all([
    userGetItem(LEGACY_BROKER_PROFILE_KEY),
    userGetItem(LEGACY_BROKER_PROFILES_KEY),
    userGetItem(DEFAULT_BROKER_KEY)
  ]);

  let legacy = null;
  for (const raw of [legacyRaw, defaultRaw]) {
    if (!raw) continue;
    try { const parsed=JSON.parse(raw); if (parsed && typeof parsed==="object") { legacy=parsed; break; } } catch {}
  }
  if (!legacy && legacyProfilesRaw) {
    try { const parsed=JSON.parse(legacyProfilesRaw); if (Array.isArray(parsed) && parsed.length) legacy=parsed[0]; } catch {}
  }
  if (!legacy) return { migrated:false, reason:"NO_LEGACY_PROFILE", accounts:[] };

  const brokerLabel=cleanText(legacy.broker||legacy.brokerName||legacy.name||legacy.selectedBroker);
  const brokerId=resolveCanonicalBrokerId(brokerLabel);
  if (!brokerId) return { migrated:false, reason:"LEGACY_BROKER_ID_UNAVAILABLE", accounts:[] };

  const now=new Date().toISOString();
  const broker=findBrokerById(brokerId||"GATECEP_PRACTICE");
  const brokerName=brokerLabel||cleanText(broker?.name)||brokerId;
  const account={
    id:brokerId, brokerId, brokerName, broker:brokerName, name:brokerName,
    shortName:cleanText(broker?.shortName)||brokerId,
    nickname:cleanText(legacy.nickname)||cleanText(broker?.shortName)||brokerName,
    accountNumber:cleanText(legacy.accountNumber||legacy.clientNumber),
    clientNumber:cleanText(legacy.clientNumber||legacy.accountNumber),
    cdsNumber:cleanText(legacy.cdsNumber), connected:true, linked:true, status:"ACTIVE",
    connectionMode:legacy.connectionMode||"MIGRATED_LEGACY_PROFILE",
    apiMode:legacy.apiMode||"PENDING_BROKER_API", defaultBroker:true,
    feeSchedule:legacy.feeSchedule||null, migrationSource:"LEGACY_BROKER_PROFILE",
    legacyProfileId:legacy.id||null, createdAt:legacy.createdAt||legacy.updatedAt||now,
    connectedAt:legacy.connectedAt||legacy.updatedAt||now, updatedAt:now, lastSyncAt:legacy.lastSyncAt||null
  };
  const saved=await saveBrokerAccounts([account]);
  return { migrated:true, reason:"LEGACY_PROFILE_MIGRATED", account, accounts:saved };
}


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
  const broker = findBrokerById(brokerId || "GATECEP_PRACTICE");
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
    feeSchedule: account.feeSchedule || null,
    updatedAt: new Date().toISOString()
  };
}
