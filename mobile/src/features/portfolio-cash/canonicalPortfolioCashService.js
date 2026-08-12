import {
  userGetItem
} from "../../services/auth/userStorage";

function n(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadCanonicalRealAvailableCash() {
  const raw = await userGetItem("availableCash");
  return n(raw);
}

export function loadPracticeAvailableCash(practicePortfolio = {}) {
  return n(practicePortfolio?.availableCash);
}

export async function buildCanonicalCashContext({
  practicePortfolio = null
} = {}) {
  const realAvailableCash =
    await loadCanonicalRealAvailableCash();

  const practiceAvailableCash =
    loadPracticeAvailableCash(practicePortfolio);

  return {
    realAvailableCash,
    practiceAvailableCash,

    sources: {
      real: 'userStorage["availableCash"]',
      practice: "practicePortfolio.availableCash"
    },

    safeguards: {
      realCashFallsBackToPractice: false,
      practiceCashUsedForRealWealth: false
    }
  };
}
