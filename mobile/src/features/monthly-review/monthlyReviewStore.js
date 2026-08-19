import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const MONTHLY_REVIEW_KEY =
  "coachGMonthlyReviews";

function normalizeReviews(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getReviewMonth(
  dateValue = new Date()
) {
  const date =
    dateValue instanceof Date
      ? dateValue
      : new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}

export async function loadMonthlyReviews() {
  const stored =
    await userGetItem(
      MONTHLY_REVIEW_KEY
    );

  return normalizeReviews(
    stored
  );
}

export async function getMonthlyReview(
  reviewMonth
) {
  if (!reviewMonth) {
    return null;
  }

  const reviews =
    await loadMonthlyReviews();

  return (
    reviews.find(
      (review) =>
        review.reviewMonth ===
        reviewMonth
    ) || null
  );
}

export async function saveMonthlyReview(
  review = {}
) {
  if (!review) {
    throw new Error(
      "Monthly review is required"
    );
  }

  const reviewMonth =
    review.reviewMonth ||
    getReviewMonth(
      review.generatedAt ||
        new Date()
    );

  if (!reviewMonth) {
    throw new Error(
      "Unable to determine review month"
    );
  }

  const existingReviews =
    await loadMonthlyReviews();

  const now =
    new Date().toISOString();

  const existingReview =
    existingReviews.find(
      (item) =>
        item.reviewMonth ===
        reviewMonth
    );

  const snapshot = {
    id:
      existingReview?.id ||
      `MR-${reviewMonth}`,

    reviewMonth,

    generatedAt:
      review.generatedAt ||
      now,

    updatedAt:
      now,

    createdAt:
      existingReview?.createdAt ||
      now,

    investor: {
      firstName:
        review?.investor
          ?.firstName ||
        "",

      investorType:
        review?.investor
          ?.investorType ||
        null,

      riskProfile:
        review?.investor
          ?.riskProfile ||
        null,

      goal:
        review?.investor
          ?.goal ||
        null
    },

    portfolio: {
      startingAmount:
        Number(
          review?.portfolio
            ?.startingAmount ||
            0
        ),

      investedAmount:
        Number(
          review?.portfolio
            ?.investedAmount ||
            0
        ),

      availableCash:
        Number(
          review?.portfolio
            ?.availableCash ||
            0
        ),

      currentPortfolioValue:
        Number(
          review?.portfolio
            ?.currentPortfolioValue ||
            0
        ),

      totalRealValue:
        Number(
          review?.portfolio
            ?.totalRealValue ||
            0
        ),

      totalPracticeValue:
        Number(
          review?.portfolio
            ?.totalPracticeValue ||
            0
        ),

      totalProfitLoss:
        Number(
          review?.portfolio
            ?.totalProfitLoss ||
            0
        ),

      holdingsCount:
        Number(
          review?.portfolio
            ?.holdingsCount ||
            0
        )
    },

    decisions: {
      monthlyCount:
        Number(
          review?.decisions
            ?.monthlyCount ||
            0
        ),

      totalCount:
        Number(
          review?.decisions
            ?.totalCount ||
            0
        ),

      confidenceAverage:
        Number(
          review?.decisions
            ?.confidenceAverage ||
            0
        ),

      mostReviewedSymbol:
        review?.decisions
          ?.mostReviewedSymbol ||
        null
    },

    coachG: {
      headline:
        review?.coachG
          ?.headline ||
        "",

      portfolioMessage:
        review?.coachG
          ?.portfolioMessage ||
        "",

      behaviorMessage:
        review?.coachG
          ?.behaviorMessage ||
        "",

      nextFocus:
        review?.coachG
          ?.nextFocus ||
        ""
    }
  };

  const withoutSameMonth =
    existingReviews.filter(
      (item) =>
        item.reviewMonth !==
        reviewMonth
    );

  const updatedReviews = [
    snapshot,
    ...withoutSameMonth
  ].sort(
    (a, b) =>
      String(
        b.reviewMonth
      ).localeCompare(
        String(
          a.reviewMonth
        )
      )
  );

  await userSetItem(
    MONTHLY_REVIEW_KEY,
    JSON.stringify(
      updatedReviews
    )
  );

  return snapshot;
}

export async function getLatestMonthlyReview() {
  const reviews =
    await loadMonthlyReviews();

  return reviews[0] || null;
}

export async function getPreviousMonthlyReview(
  reviewMonth
) {
  const reviews =
    await loadMonthlyReviews();

  const index =
    reviews.findIndex(
      (item) =>
        item.reviewMonth ===
        reviewMonth
    );

  if (index < 0) {
    return null;
  }

  return (
    reviews[index + 1] ||
    null
  );
}

export {
  getReviewMonth
};
