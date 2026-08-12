export const RECOMMENDATION_OUTCOME_STATUSES = Object.freeze({
  NOT_ENOUGH_DATA: "NOT_ENOUGH_DATA",
  FOLLOWED: "FOLLOWED",
  PARTIALLY_FOLLOWED: "PARTIALLY_FOLLOWED",
  NOT_FOLLOWED: "NOT_FOLLOWED",
  OPPOSITE_ACTION: "OPPOSITE_ACTION",
  NO_ACTION_YET: "NO_ACTION_YET"
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function upper(value) {
  return clean(value)?.toUpperCase() || null;
}

function toTime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : null;
}

function normalizeAction(value) {
  const action = upper(value);

  if (["ADD", "BUY", "INCREASE", "ACCUMULATE"].includes(action)) return "BUY";
  if (["SELL", "REDUCE", "TRIM", "EXIT"].includes(action)) return "SELL";
  if (["HOLD", "MAINTAIN"].includes(action)) return "HOLD";

  return action;
}

function recommendationTime(rec = {}) {
  return (
    toTime(rec?.updatedAt) ??
    toTime(rec?.savedAt) ??
    toTime(rec?.date) ??
    null
  );
}

function activityTime(item = {}) {
  return (
    toTime(item?.executedAt) ??
    toTime(item?.filledAt) ??
    toTime(item?.createdAt) ??
    toTime(item?.date) ??
    null
  );
}

export function extractRecommendationActions(rec = {}) {
  const actions = [];

  const push = (item = {}) => {
    const action = normalizeAction(
      item?.action ?? item?.type ?? item?.side
    );

    if (!action) return;

    actions.push({
      action,
      symbol: upper(item?.symbol ?? item?.ticker),
      sector: upper(item?.sector),
      reason: clean(item?.reason)
    });
  };

  safeArray(rec?.actions).forEach((item) => {
    if (typeof item === "string") {
      push({ action: item });
    } else {
      push(item);
    }
  });

  safeArray(rec?.sectorPlan).forEach((item) => {
    push({
      action: item?.action ?? item?.direction ?? "BUY",
      sector: item?.sector,
      reason: item?.reason
    });
  });

  if (!actions.length) {
    push({
      action: rec?.action ?? rec?.recommendedAction,
      symbol: rec?.symbol,
      sector: rec?.targetSector ?? rec?.sector,
      reason: rec?.reason
    });
  }

  return actions;
}

function normalizeActivity(item = {}) {
  return {
    id: clean(item?.id ?? item?.tradeId ?? item?.orderId),
    symbol: upper(item?.symbol ?? item?.ticker),
    sector: upper(item?.sector),
    side: normalizeAction(item?.side ?? item?.type),
    status: upper(item?.status),
    time: activityTime(item),
    raw: item
  };
}

function realizedOrder(item = {}) {
  return [
    "FILLED",
    "COMPLETED",
    "EXECUTED",
    "PARTIAL_FILL",
    "PARTIALLY_FILLED"
  ].includes(upper(item?.status));
}

function matches(activity, action) {
  if (!activity || !action) return false;

  const direction =
    activity?.side === action?.action;

  const symbol =
    action?.symbol
      ? activity?.symbol === action?.symbol
      : true;

  const sector =
    action?.sector
      ? activity?.sector === action?.sector
      : true;

  return direction && symbol && sector;
}

function opposes(activity, action) {
  if (!activity || !action) return false;

  const opposite =
    action?.action === "BUY"
      ? "SELL"
      : action?.action === "SELL"
        ? "BUY"
        : null;

  if (!opposite) return false;

  const symbol =
    action?.symbol
      ? activity?.symbol === action?.symbol
      : true;

  const sector =
    action?.sector
      ? activity?.sector === action?.sector
      : true;

  return (
    activity?.side === opposite &&
    symbol &&
    sector
  );
}

export function buildRecommendationObservedActivity({
  recommendation = {},
  tradeHistory = [],
  orderHistory = []
} = {}) {
  const start = recommendationTime(recommendation);

  const trades =
    safeArray(tradeHistory)
      .map(normalizeActivity)
      .filter(
        (item) =>
          start === null ||
          item?.time === null ||
          item.time >= start
      );

  const orders =
    safeArray(orderHistory)
      .filter(realizedOrder)
      .map(normalizeActivity)
      .filter(
        (item) =>
          start === null ||
          item?.time === null ||
          item.time >= start
      );

  return {
    recommendationStart: start,
    trades,
    orders,
    all: [...trades, ...orders]
  };
}

export function evaluateRecommendationActionOutcome({
  action = {},
  observedActivity = {}
} = {}) {
  const activity = safeArray(observedActivity?.all);

  const matchingActivity =
    activity.filter((item) => matches(item, action));

  const opposingActivity =
    activity.filter((item) => opposes(item, action));

  let status =
    RECOMMENDATION_OUTCOME_STATUSES.NO_ACTION_YET;

  if (matchingActivity.length && opposingActivity.length) {
    status =
      RECOMMENDATION_OUTCOME_STATUSES.PARTIALLY_FOLLOWED;
  } else if (matchingActivity.length) {
    status =
      RECOMMENDATION_OUTCOME_STATUSES.FOLLOWED;
  } else if (opposingActivity.length) {
    status =
      RECOMMENDATION_OUTCOME_STATUSES.OPPOSITE_ACTION;
  }

  return {
    action,
    status,
    matchingActivity,
    opposingActivity
  };
}

export function reconcileRecommendationOutcome({
  recommendation = {},
  tradeHistory = [],
  orderHistory = []
} = {}) {
  const actions = extractRecommendationActions(recommendation);

  if (!actions.length) {
    return {
      ...recommendation,
      observedOutcome:
        RECOMMENDATION_OUTCOME_STATUSES.NOT_ENOUGH_DATA,
      followThroughStatus:
        RECOMMENDATION_OUTCOME_STATUSES.NOT_ENOUGH_DATA,
      actionOutcomes: []
    };
  }

  const observedActivity =
    buildRecommendationObservedActivity({
      recommendation,
      tradeHistory,
      orderHistory
    });

  const actionOutcomes =
    actions.map((action) =>
      evaluateRecommendationActionOutcome({
        action,
        observedActivity
      })
    );

  const statuses =
    actionOutcomes.map((item) => item.status);

  let status =
    RECOMMENDATION_OUTCOME_STATUSES.NO_ACTION_YET;

  if (
    statuses.every(
      (value) =>
        value === RECOMMENDATION_OUTCOME_STATUSES.FOLLOWED
    )
  ) {
    status = RECOMMENDATION_OUTCOME_STATUSES.FOLLOWED;
  } else if (
    statuses.some(
      (value) =>
        value === RECOMMENDATION_OUTCOME_STATUSES.OPPOSITE_ACTION
    )
  ) {
    status = RECOMMENDATION_OUTCOME_STATUSES.OPPOSITE_ACTION;
  } else if (
    statuses.some(
      (value) =>
        value === RECOMMENDATION_OUTCOME_STATUSES.FOLLOWED
    )
  ) {
    status =
      RECOMMENDATION_OUTCOME_STATUSES.PARTIALLY_FOLLOWED;
  }

  return {
    ...recommendation,
    observedOutcome: status,
    followThroughStatus: status,
    actionOutcomes,
    observedActivity,
    reconciliationGeneratedAt: new Date().toISOString()
  };
}

export function reconcileRecommendationHistoryOutcomes({
  recommendationHistory = [],
  tradeHistory = [],
  orderHistory = []
} = {}) {
  return safeArray(recommendationHistory).map(
    (recommendation) =>
      reconcileRecommendationOutcome({
        recommendation,
        tradeHistory,
        orderHistory
      })
  );
}

export function buildRecommendationOutcomeSummary({
  reconciledRecommendations = []
} = {}) {
  const counts = {
    FOLLOWED: 0,
    PARTIALLY_FOLLOWED: 0,
    NOT_FOLLOWED: 0,
    OPPOSITE_ACTION: 0,
    NO_ACTION_YET: 0,
    NOT_ENOUGH_DATA: 0
  };

  safeArray(reconciledRecommendations).forEach((item) => {
    const status =
      item?.observedOutcome ||
      RECOMMENDATION_OUTCOME_STATUSES.NOT_ENOUGH_DATA;

    counts[status] =
      (counts[status] || 0) + 1;
  });

  return {
    total: safeArray(reconciledRecommendations).length,
    counts,
    requiringCoachGDiscussion:
      safeArray(reconciledRecommendations).filter((item) =>
        [
          RECOMMENDATION_OUTCOME_STATUSES.PARTIALLY_FOLLOWED,
          RECOMMENDATION_OUTCOME_STATUSES.NOT_FOLLOWED,
          RECOMMENDATION_OUTCOME_STATUSES.OPPOSITE_ACTION
        ].includes(item?.observedOutcome)
      )
  };
}
