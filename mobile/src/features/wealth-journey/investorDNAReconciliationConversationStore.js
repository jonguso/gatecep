import {
  userGetItem,
  userSetItem
} from "../../services/auth/userStorage";

const KEY =
  "investorDNAReconciliationClarifications";

function parseArray(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadInvestorDNAReconciliationClarifications() {
  const raw = await userGetItem(KEY);
  return parseArray(raw);
}

export async function saveInvestorDNAReconciliationClarification(
  clarification = {}
) {
  const history =
    await loadInvestorDNAReconciliationClarifications();

  const record = {
    id:
      clarification?.id ||
      `DNA-CLAR-${Date.now()}`,
    ...clarification,
    savedAt:
      clarification?.savedAt ||
      new Date().toISOString()
  };

  const next =
    [record, ...history].slice(0, 500);

  await userSetItem(
    KEY,
    JSON.stringify(next)
  );

  return record;
}

export async function clearInvestorDNAReconciliationClarifications() {
  await userSetItem(
    KEY,
    JSON.stringify([])
  );

  return [];
}
