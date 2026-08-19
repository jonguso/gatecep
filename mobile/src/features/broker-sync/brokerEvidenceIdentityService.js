import { userGetItem } from "../../auth/userStorage";

const clean = (value) => String(value ?? "").trim();
const upper = (value) => clean(value).toUpperCase();

function parseStored(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
}

export function extractBrokerFileIdentifier(fileName = "") {
  const base = clean(fileName)
    .replace(/\.[^.]+$/i, "")
    .replace(/\s*\(\d+\)\s*$/i, "");
  return base.match(/(?:^|[-_\s])(\d{5,})$/)?.[1] || null;
}

export function buildBrokerAccountKey({ brokerId, clientAccount, tradingAccount } = {}) {
  const broker = upper(brokerId);
  const account = upper(clientAccount ?? tradingAccount);
  return broker && account ? `${broker}|${account}` : null;
}

export function extractStatementIdentity(rows = []) {
  const text = rows.flatMap((row) => Object.entries(row || {}).flat())
    .map(clean).filter(Boolean).join(" | ");
  return {
    tradingAccount: text.match(/\bAcc(?:ount)?\.?\s*[:#-]?\s*(\d{5,})\b/i)?.[1] || null,
    clientCode: text.match(/\bClient(?:\s+(?:Code|Number|No\.?))?\s*[:#-]?\s*(\d{4,})\b/i)?.[1] || null
  };
}

export function extractOrderHistoryIdentity(rows = []) {
  const first = rows.find((row) => row && Object.keys(row).length) || {};
  const entries = Object.entries(first).reduce((result, [key, value]) => {
    result[upper(key).replace(/[^A-Z0-9]/g, "")] = clean(value);
    return result;
  }, {});
  return {
    brokerId: entries.MEMBERCODE || entries.BROKERCODE || null,
    tradingAccount: entries.TRADINGACCOUNT || entries.ACCOUNTNUMBER || null,
    clientCode: entries.CLIENTCODE || entries.CLIENTNUMBER || null,
    clientName: entries.CLIENTNAME || entries.ACCOUNTHOLDER || null
  };
}

export async function loadVerifiedUserCds() {
  const brokerProfiles = parseStored(await userGetItem("brokerProfiles"));
  const brokerAccounts = parseStored(await userGetItem("brokerAccounts"));
  const candidates = [
    parseStored(await userGetItem("cdsProfile")),
    parseStored(await userGetItem("brokerProfile")),
    parseStored(await userGetItem("defaultBrokerProfile")),
    parseStored(await userGetItem("cloudBrokerProfile")),
    ...(Array.isArray(brokerProfiles) ? brokerProfiles : []),
    ...(Array.isArray(brokerAccounts) ? brokerAccounts : [])
  ];
  return clean(candidates.find((item) => clean(item?.cdsNumber))?.cdsNumber) || null;
}

export function validateBrokerEvidenceIdentity({
  fileName, userCds, brokerId, clientAccount, tradingAccount, internalIdentity = null,
  expectedAccountKey = null
} = {}) {
  const brokerFileIdentifier = extractBrokerFileIdentifier(fileName);
  const cdsNumber = clean(userCds);
  const normalizedBrokerId = upper(brokerId);
  const normalizedClientAccount = clean(clientAccount ?? tradingAccount);
  const brokerAccountKey = buildBrokerAccountKey({
    brokerId: normalizedBrokerId,
    clientAccount: normalizedClientAccount
  });
  const errors = [];
  if (!cdsNumber) errors.push("Add and verify the user's CDS number before uploading broker evidence.");
  if (!normalizedBrokerId) errors.push("Broker ID is required.");
  if (!normalizedClientAccount) errors.push("Broker client account is required.");
  if (!brokerFileIdentifier) errors.push("The filename must end with the investor CDS number.");
  if (cdsNumber && brokerFileIdentifier && cdsNumber !== brokerFileIdentifier) {
    errors.push("This file belongs to a different CDS investor.");
  }
  if (expectedAccountKey && brokerAccountKey && expectedAccountKey !== brokerAccountKey) {
    errors.push("This evidence belongs to a different broker trading account.");
  }
  if (internalIdentity?.brokerId && normalizedBrokerId && upper(internalIdentity.brokerId) !== normalizedBrokerId) {
    errors.push("The broker inside the file does not match the selected broker.");
  }
  if (internalIdentity?.clientCode && normalizedClientAccount && clean(internalIdentity.clientCode) !== normalizedClientAccount) {
    errors.push("The client account inside the file does not match the selected broker account.");
  }
  if (internalIdentity?.tradingAccount && cdsNumber && clean(internalIdentity.tradingAccount) !== cdsNumber) {
    errors.push("The CDS account inside the file does not match this investor.");
  }
  return {
    ok: errors.length === 0, errors, cdsNumber: cdsNumber || null,
    brokerId: normalizedBrokerId || null,
    clientAccount: normalizedClientAccount || null,
    tradingAccount: normalizedClientAccount || null,
    brokerAccountKey, brokerFileIdentifier,
    identityStatus: errors.length ? "REJECTED" : "VERIFIED"
  };
}

export function requireValidBrokerEvidenceIdentity(input) {
  const result = validateBrokerEvidenceIdentity(input);
  if (!result.ok) throw new Error(result.errors[0]);
  return result;
}
