import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadDecisionJournal
} from "../decision-journal/decisionJournalStore";

import {
  loadMonthlyReviews
} from "../monthly-review/monthlyReviewStore";

import {
  loadBrokerSyncAuditHistory
} from "../broker-sync/brokerSyncAuditStore";

import {
  loadBrokerResolutionLedger
} from "../broker-sync/brokerResolutionLedgerStore";

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function normalizeTimestamp(value) {
  const date = normalizeDate(value);

  return date
    ? date.toISOString()
    : null;
}

/*
 * ============================================================
 * MONEY
 * ============================================================
 */

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

/*
 * ============================================================
 * READABLE MONTH
 * ============================================================
 */

function readableMonth(
  reviewMonth
) {
  if (!reviewMonth) {
    return "Monthly Review";
  }

  const [
    year,
    month
  ] = String(
    reviewMonth
  ).split("-");

  const date =
    new Date(
      Number(year),
      Number(month) - 1,
      1
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return reviewMonth;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );
}

/*
 * ============================================================
 * BUILD INVESTOR TIMELINE
 * ============================================================
 */

export async function buildInvestorTimeline() {
  const [
    context,
    journal,
    monthlyReviews,
    brokerAuditHistory,
    brokerResolutionLedger
  ] = await Promise.all([
    loadInvestorContext(),
    loadDecisionJournal(),
    loadMonthlyReviews(),
    loadBrokerSyncAuditHistory(),
    loadBrokerResolutionLedger()
  ]);

  const events = [];

  const storedProfile =
    context?.storedProfile ||
    {};

  const profile =
    context?.profile ||
    {};

  const investorDNA =
    context?.investorDNA ||
    null;

  const wealthBlueprint =
    context?.wealthBlueprint ||
    null;

  const practicePortfolio =
    context?.practicePortfolio ||
    null;

  /*
   * ==========================================================
   * INVESTOR JOURNEY START
   * ==========================================================
   */

  const profileCreatedAt =
    storedProfile?.createdAt ||
    profile?.createdAt ||
    storedProfile?.updatedAt ||
    profile?.updatedAt ||
    null;

  if (profileCreatedAt) {
    events.push({
      id:
        "PROFILE-CREATED",

      type:
        "INVESTOR_PROFILE_CREATED",

      category:
        "FOUNDATION",

      title:
        "Investor Journey Started",

      description:
        "You began your GateCEP investor discovery journey with Coach G.",

      timestamp:
        normalizeTimestamp(
          profileCreatedAt
        ),

      metadata: {
        firstName:
          context?.identity
            ?.firstName ||
          profile?.firstName ||
          null
      }
    });
  }

  /*
   * ==========================================================
   * INVESTOR DNA
   * ==========================================================
   */

  if (investorDNA) {
    events.push({
      id:
        investorDNA?.id ||
        "INVESTOR-DNA",

      type:
        "INVESTOR_DNA_CREATED",

      category:
        "FOUNDATION",

      title:
        "Investor DNA Created",

      description:
        `Coach G identified you as a ${
          investorDNA
            ?.investorType ||
          "developing investor"
        } with a ${
          investorDNA
            ?.riskProfile ||
          "developing"
        } risk profile.`,

      timestamp:
        normalizeTimestamp(
          investorDNA
            ?.createdAt ||
          investorDNA
            ?.updatedAt
        ),

      metadata: {
        investorType:
          investorDNA
            ?.investorType ||
          null,

        riskProfile:
          investorDNA
            ?.riskProfile ||
          null,

        goal:
          investorDNA?.goal ||
          null,

        riskScore:
          investorDNA
            ?.riskScore ??
          null,

        confidenceScore:
          investorDNA
            ?.confidenceScore ??
          null
      }
    });
  }

  /*
   * ==========================================================
   * WEALTH BLUEPRINT
   * ==========================================================
   */

  if (wealthBlueprint) {
    const blueprintTimestamp =
      storedProfile
        ?.profile
        ?.wealthBlueprint
        ?.createdAt ||
      storedProfile
        ?.profile
        ?.wealthBlueprint
        ?.updatedAt ||
      investorDNA?.updatedAt ||
      investorDNA?.createdAt ||
      null;

    events.push({
      id:
        "WEALTH-BLUEPRINT",

      type:
        "WEALTH_BLUEPRINT_CREATED",

      category:
        "FOUNDATION",

      title:
        "Wealth Blueprint Created",

      description:
        `Coach G prepared your ${
          wealthBlueprint
            ?.strategy ||
          wealthBlueprint
            ?.riskProfile ||
          "personalized"
        } investment direction.`,

      timestamp:
        normalizeTimestamp(
          blueprintTimestamp
        ),

      metadata: {
        strategy:
          wealthBlueprint
            ?.strategy ||
          null,

        allocation:
          wealthBlueprint
            ?.allocation ||
          null
      }
    });
  }

  /*
   * ==========================================================
   * PRACTICE PORTFOLIO
   * ==========================================================
   */

  if (practicePortfolio) {
    events.push({
      id:
        "PRACTICE-PORTFOLIO",

      type:
        "PRACTICE_PORTFOLIO_CREATED",

      category:
        "PORTFOLIO",

      title:
        "Practice Portfolio Created",

      description:
        `Coach G created a KES ${money(
          practicePortfolio
            ?.startingAmount
        )} learning portfolio with ${
          practicePortfolio
            ?.holdings
            ?.length ||
          0
        } holdings.`,

      timestamp:
        normalizeTimestamp(
          practicePortfolio
            ?.createdAt ||
          practicePortfolio
            ?.updatedAt
        ),

      metadata: {
        startingAmount:
          Number(
            practicePortfolio
              ?.startingAmount ||
            0
          ),

        investedAmount:
          Number(
            practicePortfolio
              ?.investedAmount ||
            0
          ),

        availableCash:
          Number(
            practicePortfolio
              ?.availableCash ||
            0
          ),

        holdingsCount:
          Number(
            practicePortfolio
              ?.holdings
              ?.length ||
            0
          )
      }
    });
  }

  /*
   * ==========================================================
   * PRACTICE DECISIONS
   * ==========================================================
   */

  const decisions =
    Array.isArray(journal)
      ? journal
      : [];

  decisions.forEach(
    (entry) => {
      events.push({
        id:
          entry?.id ||
          `DECISION-${Math.random()}`,

        type:
          "PRACTICE_DECISION",

        category:
          "DECISION",

        title:
          `Considered ${
            entry?.symbol ||
            "Investment"
          }`,

        description:
          buildDecisionDescription(
            entry
          ),

        timestamp:
          normalizeTimestamp(
            entry?.createdAt ||
            entry?.updatedAt
          ),

        metadata: {
          symbol:
            entry?.symbol ||
            null,

          companyName:
            entry?.companyName ||
            null,

          decision:
            entry?.decision ||
            null,

          reason:
            entry?.reason ||
            null,

          expectedOutcome:
            entry
              ?.expectedOutcome ||
            null,

          confidence:
            Number(
              entry?.confidence ||
              0
            ),

          priceAtDecision:
            Number(
              entry
                ?.priceAtDecision ||
              0
            ),

          reviewStatus:
            entry
              ?.reviewStatus ||
            null
        }
      });
    }
  );

  /*
   * ==========================================================
   * MONTHLY REVIEWS
   * ==========================================================
   */

  const reviews =
    Array.isArray(
      monthlyReviews
    )
      ? monthlyReviews
      : [];

  reviews.forEach(
    (review) => {
      events.push({
        id:
          review?.id ||
          `MONTHLY-${review?.reviewMonth}`,

        type:
          "MONTHLY_REVIEW",

        category:
          "REVIEW",

        title:
          `${readableMonth(
            review?.reviewMonth
          )} Monthly Review`,

        description:
          buildMonthlyReviewDescription(
            review
          ),

        timestamp:
          normalizeTimestamp(
            review?.updatedAt ||
            review?.generatedAt ||
            review?.createdAt
          ),

        metadata: {
          reviewMonth:
            review?.reviewMonth ||
            null,

          practiceValue:
            Number(
              review
                ?.portfolio
                ?.totalPracticeValue ||
              0
            ),

          investedAmount:
            Number(
              review
                ?.portfolio
                ?.investedAmount ||
              0
            ),

          availableCash:
            Number(
              review
                ?.portfolio
                ?.availableCash ||
              0
            ),

          monthlyDecisions:
            Number(
              review
                ?.decisions
                ?.monthlyCount ||
              0
            ),

          averageConfidence:
            Number(
              review
                ?.decisions
                ?.confidenceAverage ||
              0
            ),

          mostReviewedSymbol:
            review
              ?.decisions
              ?.mostReviewedSymbol ||
            null,

          nextFocus:
            review
              ?.coachG
              ?.nextFocus ||
            null
        }
      });
    }
  );

  /*
   * ==========================================================
   * BROKER SYNC / RECONCILIATION AUDIT EVENTS
   * ==========================================================
   */

  const brokerAuditEvents =
    Array.isArray(
      brokerAuditHistory
    )
      ? brokerAuditHistory
      : [];

  brokerAuditEvents.forEach(
    (audit) => {
      const classification =
        audit?.classification ||
        audit?.status ||
        "UNKNOWN";

      const isResolution =
        audit?.type ===
        "BROKER_RESOLUTION";

      events.push({
        id:
          audit?.id ||
          `BROKER-AUDIT-${Math.random()}`,

        type:
          audit?.type ||
          "BROKER_SYNC",

        category:
          "BROKER",

        title:
          isResolution
            ? `Broker Resolution ${classification}`
            : `Broker Reconciliation ${classification}`,

        description:
          buildBrokerAuditDescription(
            audit
          ),

        timestamp:
          normalizeTimestamp(
            audit?.createdAt ||
            audit?.updatedAt
          ),

        metadata: {
          broker:
            audit?.broker ||
            null,

          accountName:
            audit?.accountName ||
            null,

          classification,

          status:
            audit?.status ||
            null,

          brokerTotal:
            Number(
              audit
                ?.brokerTotal ||
              0
            ),

          gatecepTotal:
            Number(
              audit
                ?.gatecepTotal ||
              0
            ),

          difference:
            Number(
              audit
                ?.difference ||
              0
            ),

          cashDifference:
            Number(
              audit
                ?.cashDifference ||
              0
            ),

          matched:
            Number(
              audit?.matched ||
              0
            ),

          mismatched:
            Number(
              audit
                ?.mismatched ||
              0
            ),

          missingAtBroker:
            Number(
              audit
                ?.missingAtBroker ||
              0
            ),

          extraAtBroker:
            Number(
              audit
                ?.extraAtBroker ||
              0
            )
        }
      });
    }
  );

  /*
   * ==========================================================
   * BROKER RESOLUTION DECISION LEDGER
   * ==========================================================
   */

  const resolutionEvents =
    Array.isArray(
      brokerResolutionLedger
    )
      ? brokerResolutionLedger
      : [];

  resolutionEvents.forEach(
    (entry) => {
      events.push({
        id:
          entry?.id ||
          `BROKER-RESOLUTION-${Math.random()}`,

        type:
          "BROKER_RESOLUTION_DECISION",

        category:
          "BROKER",

        title:
          entry?.symbol
            ? `${entry.symbol} Reconciliation Explained`
            : "Broker Reconciliation Explained",

        description:
          buildBrokerResolutionDescription(
            entry
          ),

        timestamp:
          normalizeTimestamp(
            entry?.createdAt
          ),

        metadata: {
          symbol:
            entry?.symbol ||
            null,

          discrepancyType:
            entry
              ?.discrepancyType ||
            null,

          resolutionCode:
            entry
              ?.resolutionCode ||
            null,

          resolutionLabel:
            entry
              ?.resolutionLabel ||
            null,

          previousResolutionCode:
            entry
              ?.previousResolutionCode ||
            null,

          gatecepQuantity:
            Number(
              entry
                ?.gatecepQuantity ||
              0
            ),

          brokerQuantity:
            Number(
              entry
                ?.brokerQuantity ||
              0
            ),

          gatecepValue:
            Number(
              entry
                ?.gatecepValue ||
              0
            ),

          brokerValue:
            Number(
              entry
                ?.brokerValue ||
              0
            ),

          source:
            entry?.source ||
            null
        }
      });
    }
  );

  /*
   * ==========================================================
   * REMOVE EVENTS WITHOUT TIMESTAMPS
   * ==========================================================
   */

  const validEvents =
    events.filter(
      (event) =>
        Boolean(
          event.timestamp
        )
    );

  /*
   * ==========================================================
   * LATEST FIRST
   * ==========================================================
   */

  validEvents.sort(
    (a, b) =>
      new Date(
        b.timestamp
      ).getTime() -
      new Date(
        a.timestamp
      ).getTime()
  );

  /*
   * ==========================================================
   * RETURN TIMELINE
   * ==========================================================
   */

  return {
    generatedAt:
      new Date().toISOString(),

    investor: {
      firstName:
        context?.identity
          ?.firstName ||
        "",

      investorType:
        context?.investor
          ?.investorType ||
        investorDNA
          ?.investorType ||
        null,

      goal:
        context?.investor
          ?.goal ||
        investorDNA?.goal ||
        null
    },

    summary: {
      totalEvents:
        validEvents.length,

      foundationEvents:
        validEvents.filter(
          (event) =>
            event.category ===
            "FOUNDATION"
        ).length,

      portfolioEvents:
        validEvents.filter(
          (event) =>
            event.category ===
            "PORTFOLIO"
        ).length,

      decisionEvents:
        validEvents.filter(
          (event) =>
            event.category ===
            "DECISION"
        ).length,

      reviewEvents:
        validEvents.filter(
          (event) =>
            event.category ===
            "REVIEW"
        ).length,

      brokerEvents:
        validEvents.filter(
          (event) =>
            event.category ===
            "BROKER"
        ).length
    },

    events:
      validEvents
  };
}

/*
 * ============================================================
 * DECISION DESCRIPTION
 * ============================================================
 */

function buildDecisionDescription(
  entry
) {
  const parts = [];

  if (entry?.reason) {
    parts.push(
      entry.reason
    );
  }

  if (
    Number(
      entry?.confidence
    ) > 0
  ) {
    parts.push(
      `Confidence ${Number(
        entry.confidence
      )}/5`
    );
  }

  if (
    Number(
      entry
        ?.priceAtDecision
    ) > 0
  ) {
    parts.push(
      `Price KES ${money(
        entry.priceAtDecision
      )}`
    );
  }

  return (
    parts.join(" • ") ||
    "Practice investment decision recorded."
  );
}

/*
 * ============================================================
 * MONTHLY REVIEW DESCRIPTION
 * ============================================================
 */

function buildMonthlyReviewDescription(
  review
) {
  const parts = [];

  const decisionCount =
    Number(
      review
        ?.decisions
        ?.monthlyCount ||
      0
    );

  parts.push(
    `${decisionCount} ${
      decisionCount === 1
        ? "decision"
        : "decisions"
    }`
  );

  const confidence =
    Number(
      review
        ?.decisions
        ?.confidenceAverage ||
      0
    );

  if (confidence > 0) {
    parts.push(
      `Average confidence ${confidence.toFixed(
        1
      )}/5`
    );
  }

  const symbol =
    review
      ?.decisions
      ?.mostReviewedSymbol;

  if (symbol) {
    parts.push(
      `Most reviewed ${symbol}`
    );
  }

  return parts.join(
    " • "
  );
}

/*
 * ============================================================
 * BROKER AUDIT DESCRIPTION
 * ============================================================
 */

function buildBrokerAuditDescription(
  audit
) {
  const parts = [];

  if (audit?.broker) {
    parts.push(
      audit.broker
    );
  }

  if (
    Number(
      audit?.matched
    ) > 0
  ) {
    parts.push(
      `${Number(
        audit.matched
      )} matched`
    );
  }

  if (
    Number(
      audit?.mismatched
    ) > 0
  ) {
    parts.push(
      `${Number(
        audit.mismatched
      )} requiring review`
    );
  }

  const difference =
    Number(
      audit?.difference ||
      0
    );

  if (
    Math.abs(
      difference
    ) >= 0.01
  ) {
    parts.push(
      `Difference KES ${money(
        difference
      )}`
    );
  }

  return (
    parts.join(" • ") ||
    "Broker synchronization event recorded."
  );
}

/*
 * ============================================================
 * BROKER RESOLUTION DESCRIPTION
 * ============================================================
 */

function buildBrokerResolutionDescription(
  entry
) {
  const parts = [];

  if (
    entry?.resolutionLabel
  ) {
    parts.push(
      entry.resolutionLabel
    );
  }

  if (
    entry?.discrepancyType
  ) {
    parts.push(
      entry.discrepancyType
    );
  }

  if (entry?.symbol) {
    parts.push(
      `GateCEP Qty ${Number(
        entry
          ?.gatecepQuantity ||
        0
      )}`
    );

    parts.push(
      `Broker Qty ${Number(
        entry
          ?.brokerQuantity ||
        0
      )}`
    );
  }

  return (
    parts.join(" • ") ||
    "Broker discrepancy resolution recorded."
  );
}