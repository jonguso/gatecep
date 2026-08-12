import {
  userGetItem,
  userSetItem
} from "../../services/auth/userStorage";

const KEY = "investorDNAUpdateConfirmations";

function parseArray(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadInvestorDNAUpdateConfirmations() {
  const raw = await userGetItem(KEY);
  return parseArray(raw);
}

export async function saveInvestorDNAUpdateConfirmation(
  instruction = {}
) {
  const history =
    await loadInvestorDNAUpdateConfirmations();

  const record = {
    id:
      instruction?.id ||
      `DNA-UPD-${Date.now()}`,
    ...instruction,
    savedAt:
      instruction?.savedAt ||
      new Date().toISOString(),
    applicationStatus:
      instruction?.applicationStatus ||
      "CONFIRMED_PENDING_APPLICATION"
  };

  const next = [record, ...history].slice(0, 250);

  await userSetItem(
    KEY,
    JSON.stringify(next)
  );

  return record;
}
