import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadUnifiedPortfolio
} from "../../portfolio/unifiedPortfolioApi";

import {
  buildSyncStatus
} from "../../portfolio/syncStatus";

/*
 * ============================================================
 * PC-028K
 * INVESTOR JOURNEY CONTINUITY BRIDGE
 * ============================================================
 *
 * Problem confirmed at runtime:
 *
 * Onboarding / Investor DNA knows the investor's intent ("family"),
 * but uploaded real portfolio data lives in the portfolio stack.
 *
 * PC-028K joins those two realities into ONE investor journey:
 *
 * Initial discussion / DNA
 *        +
 * Practice evidence
 *        +
 * Uploaded / synced real portfolio
 *        +
 * Cash / transaction upload status
 *        ↓
 * Canonical Investor Journey Context
 *
 * Important:
 * Uploaded financial data enriches the SAME investor journey.
 * It never creates a second investor identity.
 * ============================================================
 */

export const JOURNEY_DATA_STAGES = Object.freeze({
  INITIAL_DISCUSSION: "INITIAL_DISCUSSION",
  PRACTICE: "PRACTICE",
  ACTUAL_INVESTING: "ACTUAL_INVESTING"
});

export const JOURNEY_EVIDENCE_STRENGTH = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH"
});

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};
}

function clean(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function nowIso() {
  return new Date().toISOString();
}

function calculateHoldingsValue(
  holdings = []
) {
  return safeArray(
    holdings
  ).reduce(
    (
      total,
      holding
    ) =>
      total +
      (
        n(
          holding?.marketValue
        ) ??
        (
          (
            n(
              holding?.quantity
            ) ||
            0
          ) *
          (
            n(
              holding?.marketPrice ??
              holding?.price ??
              holding?.lastPrice
            ) ||
            0
          )
        )
      ),
    0
  );
}

function calculateInvestedValue(
  holdings = []
) {
  return safeArray(
    holdings
  ).reduce(
    (
      total,
      holding
    ) =>
      total +
      (
        n(
          holding?.costBasis ??
          holding?.investedValue
        ) ??
        (
          (
            n(
              holding?.quantity
            ) ||
            0
          ) *
          (
            n(
              holding?.averageCost ??
              holding?.averagePrice ??
              holding?.averageCostPerShare
            ) ||
            0
          )
        )
      ),
    0
  );
}

export function buildInitialJourneyEvidence(
  investorContext = {}
) {
  const dna =
    safeObject(
      investorContext
        ?.investorDNA
    );

  const investor =
    safeObject(
      investorContext
        ?.investor
    );

  const profile =
    safeObject(
      investorContext
        ?.profile
    );

  return {
    stage:
      JOURNEY_DATA_STAGES
        .INITIAL_DISCUSSION,

    strength:
      JOURNEY_EVIDENCE_STRENGTH
        .MEDIUM,

    investorDNA:
      dna,

    goalIntent:
      clean(
        investor?.goal ??
        dna?.goal ??
        profile?.goal
      ),

    investorType:
      clean(
        investor?.investorType ??
        dna?.investorType
      ),

    riskProfile:
      clean(
        investor?.riskProfile ??
        dna?.riskProfile
      ),

    hasWealthBlueprint:
      Boolean(
        investorContext
          ?.wealthBlueprint
      ),

    source:
      "loadInvestorContext"
  };
}

export function buildPracticeJourneyEvidence(
  investorContext = {}
) {
  const practicePortfolio =
    safeObject(
      investorContext
        ?.practicePortfolio
    );

  const holdings =
    safeArray(
      practicePortfolio
        ?.holdings
    );

  return {
    stage:
      JOURNEY_DATA_STAGES
        .PRACTICE,

    strength:
      holdings.length
        ? JOURNEY_EVIDENCE_STRENGTH
            .MEDIUM
        : JOURNEY_EVIDENCE_STRENGTH
            .LOW,

    available:
      holdings.length >
        0 ||
      practicePortfolio
        ?.status ===
        "ACTIVE",

    holdings,

    holdingsCount:
      holdings.length,

    holdingsValue:
      n(
        practicePortfolio
          ?.holdingsValue
      ) ??
      calculateHoldingsValue(
        holdings
      ),

    availableCash:
      n(
        practicePortfolio
          ?.availableCash
      ),

    totalValue:
      n(
        practicePortfolio
          ?.totalValue
      ),

    source:
      "loadInvestorContext.practicePortfolio"
  };
}

export function buildActualInvestingEvidence({
  portfolio = {},
  syncStatus = {}
} = {}) {
  const holdings =
    safeArray(
      portfolio?.holdings
    );

  const holdingsValue =
    n(
      portfolio
        ?.holdingsValue ??
      portfolio
        ?.totalMarketValue
    ) ??
    calculateHoldingsValue(
      holdings
    );

  const availableCash =
    n(
      syncStatus
        ?.availableCash ??
      portfolio
        ?.availableCash
    ) ??
    0;

  const investedValue =
    n(
      portfolio
        ?.investedValue
    ) ??
    calculateInvestedValue(
      holdings
    );

  const totalValue =
    n(
      portfolio
        ?.totalValue ??
      portfolio
        ?.portfolioValue
    ) ??
    (
      holdingsValue +
      availableCash
    );

  const hasUploadedPortfolio =
    Boolean(
      syncStatus
        ?.portfolioUploaded
    ) ||
    holdings.length >
      0;

  const hasUploadedCash =
    Boolean(
      syncStatus
        ?.cashUploaded
    ) ||
    availableCash !==
      0;

  const hasTransactions =
    Boolean(
      syncStatus
        ?.transactionsUploaded
    ) ||
    n(
      syncStatus
        ?.transactionCount
    ) >
      0;

  return {
    stage:
      JOURNEY_DATA_STAGES
        .ACTUAL_INVESTING,

    strength:
      hasUploadedPortfolio
        ? JOURNEY_EVIDENCE_STRENGTH
            .HIGH
        : JOURNEY_EVIDENCE_STRENGTH
            .LOW,

    available:
      hasUploadedPortfolio ||
      hasUploadedCash ||
      hasTransactions,

    holdings,

    holdingsCount:
      holdings.length,

    holdingsValue,

    investedValue,

    availableCash,

    totalValue,

    uploads: {
      portfolio:
        hasUploadedPortfolio,

      cash:
        hasUploadedCash,

      transactions:
        hasTransactions,

      lastPortfolioSync:
        syncStatus
          ?.lastPortfolioSync ||
        null,

      lastCashSync:
        syncStatus
          ?.lastCashSync ||
        null
    },

    source:
      "loadUnifiedPortfolio + buildSyncStatus"
  };
}

export function choosePrimaryInvestmentEvidence({
  actual,
  practice
} = {}) {
  if (
    actual?.available &&
    actual?.holdingsCount >
      0
  ) {
    return {
      stage:
        JOURNEY_DATA_STAGES
          .ACTUAL_INVESTING,

      reason:
        "Real uploaded or synchronized holdings are available and take priority over simulated holdings for current wealth-position analysis.",

      portfolio:
        actual
    };
  }

  if (
    practice?.available
  ) {
    return {
      stage:
        JOURNEY_DATA_STAGES
          .PRACTICE,

      reason:
        "No real investment portfolio is currently available, so GateCEP can continue learning from practice activity.",

      portfolio:
        practice
    };
  }

  return {
    stage:
      JOURNEY_DATA_STAGES
        .INITIAL_DISCUSSION,

    reason:
      "GateCEP currently has discussion-based context but no investment-position evidence.",

    portfolio:
      null
  };
}

export function buildCanonicalInvestorJourneyContext({
  investorContext = {},
  portfolio = {},
  syncStatus = {}
} = {}) {
  const initial =
    buildInitialJourneyEvidence(
      investorContext
    );

  const practice =
    buildPracticeJourneyEvidence(
      investorContext
    );

  const actual =
    buildActualInvestingEvidence({
      portfolio,
      syncStatus
    });

  const primaryInvestmentEvidence =
    choosePrimaryInvestmentEvidence({
      actual,
      practice
    });

  const primaryPortfolio =
    primaryInvestmentEvidence
      ?.portfolio;

  return {
    generatedAt:
      nowIso(),

    investor: {
      firstName:
        investorContext
          ?.identity
          ?.firstName ||
        investorContext
          ?.profile
          ?.firstName ||
        null,

      lastName:
        investorContext
          ?.identity
          ?.lastName ||
        investorContext
          ?.profile
          ?.lastName ||
        null,

      investorDNA:
        investorContext
          ?.investorDNA ||
        {},

      wealthBlueprint:
        investorContext
          ?.wealthBlueprint ||
        null,

      goalIntent:
        initial
          ?.goalIntent ||
        null,

      investorType:
        initial
          ?.investorType ||
        null,

      riskProfile:
        initial
          ?.riskProfile ||
        null
    },

    evidence: {
      initial,
      practice,
      actual
    },

    primaryInvestmentEvidence,

    currentFinancialPosition:
      primaryPortfolio
        ? {
            sourceStage:
              primaryInvestmentEvidence
                .stage,

            holdings:
              primaryPortfolio
                .holdings ||
              [],

            holdingsCount:
              primaryPortfolio
                .holdingsCount ||
              0,

            holdingsValue:
              n(
                primaryPortfolio
                  .holdingsValue
              ),

            investedValue:
              n(
                primaryPortfolio
                  .investedValue
              ),

            availableCash:
              n(
                primaryPortfolio
                  .availableCash
              ),

            totalValue:
              n(
                primaryPortfolio
                  .totalValue
              )
          }
        : {
            sourceStage:
              null,

            holdings:
              [],

            holdingsCount:
              0,

            holdingsValue:
              null,

            investedValue:
              null,

            availableCash:
              null,

            totalValue:
              null
          },

    journeyState: {
      hasInitialDNA:
        Boolean(
          investorContext
            ?.investorDNA
        ),

      hasPracticeEvidence:
        Boolean(
          practice?.available
        ),

      hasActualInvestmentEvidence:
        Boolean(
          actual?.available
        ),

      currentStage:
        primaryInvestmentEvidence
          ?.stage
    },

    safeguards: {
      singleInvestorJourney:
        true,

      uploadedDataCreatesNewInvestor:
        false,

      actualDataOverridesDNA:
        false,

      actualDataEnrichesDNA:
        true,

      practiceDiscardedWhenActualExists:
        false,

      practiceRemainsHistoricalEvidence:
        true
    }
  };
}

export async function loadCanonicalInvestorJourneyContext({
  broker = "ALL"
} = {}) {
  const [
    investorContext,
    portfolio,
    syncStatus
  ] =
    await Promise.all([
      loadInvestorContext(),

      loadUnifiedPortfolio({
        broker
      }),

      buildSyncStatus()
    ]);

  return buildCanonicalInvestorJourneyContext({
    investorContext,
    portfolio,
    syncStatus
  });
}
