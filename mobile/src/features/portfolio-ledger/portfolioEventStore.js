import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

import {
  getPortfolioEventCategory
} from "./portfolioEventTypes";

const PORTFOLIO_EVENT_LEDGER_KEY =
  "portfolioEventLedger";

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeEvents(
  value
) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeEvent(
  event = {}
) {
  const now =
    new Date()
      .toISOString();

  const eventType =
    event?.eventType ||
    "PORTFOLIO_ADJUSTMENT";

  return {
    id:
      event?.id ||
      `PLE-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "PORTFOLIO_EVENT",

    eventType,

    category:
      event?.category ||
      getPortfolioEventCategory(
        eventType
      ),

    investorId:
      event?.investorId ||
      null,

    broker:
      event?.broker ||
      null,

    accountName:
      event?.accountName ||
      null,

    symbol:
      event?.symbol
        ? String(
            event.symbol
          )
            .trim()
            .toUpperCase()
        : null,

    companyName:
      event?.companyName ||
      null,

    sector:
      event?.sector ||
      null,

    quantity:
      Number(
        event?.quantity ||
        0
      ),

    price:
      Number(
        event?.price ||
        0
      ),

    marketValue:
      Number(
        event?.marketValue ||
        0
      ),

    cashImpact:
      Number(
        event?.cashImpact ||
        0
      ),

    holdingsValueBefore:
      Number(
        event?.holdingsValueBefore ||
        0
      ),

    holdingsValueAfter:
      Number(
        event?.holdingsValueAfter ||
        0
      ),

    portfolioValueBefore:
      Number(
        event?.portfolioValueBefore ||
        0
      ),

    portfolioValueAfter:
      Number(
        event?.portfolioValueAfter ||
        0
      ),

    cashBefore:
      Number(
        event?.cashBefore ||
        0
      ),

    cashAfter:
      Number(
        event?.cashAfter ||
        0
      ),

    reference:
      event?.reference ||
      null,

    source:
      event?.source ||
      null,

    notes:
      event?.notes ||
      null,

    metadata:
      event?.metadata &&
      typeof event.metadata ===
        "object"
        ? event.metadata
        : {},

    occurredAt:
      event?.occurredAt ||
      now,

    createdAt:
      event?.createdAt ||
      now,

    updatedAt:
      event?.updatedAt ||
      now
  };
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadPortfolioEvents() {
  const raw =
    await userGetItem(
      PORTFOLIO_EVENT_LEDGER_KEY
    );

  return normalizeEvents(
    raw
  );
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */

export async function savePortfolioEvents(
  events = []
) {
  const safeEvents =
    Array.isArray(
      events
    )
      ? events
      : [];

  await userSetItem(
    PORTFOLIO_EVENT_LEDGER_KEY,
    JSON.stringify(
      safeEvents
    )
  );

  return safeEvents;
}

/*
 * ============================================================
 * RECORD EVENT
 * ============================================================
 */

export async function recordPortfolioEvent(
  event = {}
) {
  if (
    !event?.eventType
  ) {
    throw new Error(
      "Portfolio event type is required."
    );
  }

  const events =
    await loadPortfolioEvents();

  const record =
    normalizeEvent(
      event
    );

  /*
   * Optional idempotency protection.
   *
   * A source event with the same reference, type, and symbol
   * should not be recorded twice.
   */
  const duplicate =
    events.find(
      (item) =>
        item?.eventType ===
          record.eventType &&
        item?.reference ===
          record.reference &&
        item?.symbol ===
          record.symbol &&
        Boolean(
          record.reference
        )
    );

  if (
    duplicate
  ) {
    return duplicate;
  }

  const updated = [
    record,
    ...events
  ];

  await savePortfolioEvents(
    updated
  );

  return record;
}

/*
 * ============================================================
 * GET EVENT
 * ============================================================
 */

export async function getPortfolioEvent(
  eventId
) {
  if (
    !eventId
  ) {
    return null;
  }

  const events =
    await loadPortfolioEvents();

  return (
    events.find(
      (item) =>
        item?.id ===
        eventId
    ) ||
    null
  );
}

/*
 * ============================================================
 * FILTERS
 * ============================================================
 */

export async function loadEventsForSymbol(
  symbol
) {
  const normalizedSymbol =
    String(
      symbol ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !normalizedSymbol
  ) {
    return [];
  }

  const events =
    await loadPortfolioEvents();

  return events.filter(
    (item) =>
      item?.symbol ===
      normalizedSymbol
  );
}

export async function loadEventsForType(
  eventType
) {
  if (
    !eventType
  ) {
    return [];
  }

  const events =
    await loadPortfolioEvents();

  return events.filter(
    (item) =>
      item?.eventType ===
      eventType
  );
}

export async function loadEventsForCategory(
  category
) {
  if (
    !category
  ) {
    return [];
  }

  const events =
    await loadPortfolioEvents();

  return events.filter(
    (item) =>
      item?.category ===
      category
  );
}

export async function loadEventsForBroker(
  broker
) {
  const normalizedBroker =
    String(
      broker ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !normalizedBroker
  ) {
    return [];
  }

  const events =
    await loadPortfolioEvents();

  return events.filter(
    (item) =>
      String(
        item?.broker ||
        ""
      )
        .trim()
        .toUpperCase() ===
      normalizedBroker
  );
}

/*
 * ============================================================
 * LATEST
 * ============================================================
 */

export async function loadLatestPortfolioEvents(
  limit = 20
) {
  const events =
    await loadPortfolioEvents();

  return [...events]
    .sort(
      (a, b) =>
        new Date(
          b?.occurredAt ||
          b?.createdAt ||
          0
        ).getTime() -
        new Date(
          a?.occurredAt ||
          a?.createdAt ||
          0
        ).getTime()
    )
    .slice(
      0,
      Math.max(
        Number(
          limit ||
          20
        ),
        0
      )
    );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

export async function getPortfolioEventSummary() {
  const events =
    await loadPortfolioEvents();

  const countByCategory =
    (category) =>
      events.filter(
        (item) =>
          item?.category ===
          category
      ).length;

  const totalCashImpact =
    events.reduce(
      (total, item) =>
        total +
        Number(
          item?.cashImpact ||
          0
        ),
      0
    );

  return {
    totalEvents:
      events.length,

    brokerEvents:
      countByCategory(
        "BROKER"
      ),

    tradeEvents:
      countByCategory(
        "TRADE"
      ),

    incomeEvents:
      countByCategory(
        "INCOME"
      ),

    cashEvents:
      countByCategory(
        "CASH"
      ),

    corporateActionEvents:
      countByCategory(
        "CORPORATE_ACTION"
      ),

    adjustmentEvents:
      countByCategory(
        "ADJUSTMENT"
      ),

    totalCashImpact
  };
}