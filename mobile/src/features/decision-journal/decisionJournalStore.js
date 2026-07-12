import { userGetItem, userSetItem } from "../../auth/userStorage";

const JOURNAL_KEY = "practiceDecisionJournal";

function normalizeJournal(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function loadDecisionJournal() {
  const stored = await userGetItem(JOURNAL_KEY);
  return normalizeJournal(stored);
}

export async function saveDecisionJournal(entries = []) {
  const safeEntries = Array.isArray(entries) ? entries : [];

  await userSetItem(
    JOURNAL_KEY,
    JSON.stringify(safeEntries)
  );

  return safeEntries;
}

export async function addDecisionJournalEntry(entry = {}) {
  if (!entry.symbol) {
    throw new Error("A security symbol is required");
  }

  const journal = await loadDecisionJournal();

  const record = {
    id:
      entry.id ||
      `DEC-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    symbol: String(entry.symbol).toUpperCase(),
    companyName:
      entry.companyName ||
      entry.name ||
      entry.symbol,
    decision:
      entry.decision ||
      "CONSIDER_BUY",
    reason:
      entry.reason ||
      "",
    expectedOutcome:
      entry.expectedOutcome ||
      "",
    confidence: Number(entry.confidence || 0),
    investorGoal:
      entry.investorGoal ||
      null,
    investorType:
      entry.investorType ||
      null,
    priceAtDecision: Number(
      entry.priceAtDecision ||
      entry.price ||
      0
    ),
    quantity: Number(entry.quantity || 0),
    isPractice:
      entry.isPractice !== false,
    status:
      entry.status ||
      "RECORDED",
    reviewStatus:
      entry.reviewStatus ||
      "PENDING",
    createdAt:
      entry.createdAt ||
      new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updated = [record, ...journal];

  await saveDecisionJournal(updated);

  return record;
}

export async function getDecisionJournalEntry(id) {
  if (!id) {
    return null;
  }

  const journal = await loadDecisionJournal();

  return (
    journal.find((entry) => entry.id === id) ||
    null
  );
}

export async function updateDecisionJournalEntry(
  id,
  updates = {}
) {
  if (!id) {
    throw new Error("Decision ID is required");
  }

  const journal = await loadDecisionJournal();

  const updatedJournal = journal.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }

    return {
      ...entry,
      ...updates,
      id: entry.id,
      updatedAt: new Date().toISOString()
    };
  });

  await saveDecisionJournal(updatedJournal);

  return (
    updatedJournal.find((entry) => entry.id === id) ||
    null
  );
}

export async function clearDecisionJournal() {
  await saveDecisionJournal([]);
}