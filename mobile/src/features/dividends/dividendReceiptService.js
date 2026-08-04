import {
  getDividendRecord,
  saveDividendRecord
} from "./dividendStore";

import {
  loadInvestorContext,
  savePracticePortfolio
} from "../investor/investorContextStore";

import {
  loadPortfolioEvents,
  recordPortfolioEvent
} from "../portfolio-ledger/portfolioEventStore";

import {
  PORTFOLIO_EVENT_TYPES
} from "../portfolio-ledger/portfolioEventTypes";

function number(value) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

/*
 * ============================================================
 * PC-017C
 * RECEIVE DIVIDEND
 * ============================================================
 */

export async function receiveDividend({
  recordId,
  receivedBy = "CURRENT_USER"
}) {
  if (!recordId) {
    throw new Error(
      "Dividend record ID is required."
    );
  }

  const dividend =
    await getDividendRecord(
      recordId
    );

  if (!dividend) {
    throw new Error(
      "Dividend record was not found."
    );
  }

  /*
   * Duplicate receipt protection.
   */
  if (
    dividend?.status ===
      "PAID" ||
    dividend?.paymentReference
  ) {
    return {
      status:
        "ALREADY_RECEIVED",

      dividend,

      portfolio:
        (
          await loadInvestorContext()
        )?.practicePortfolio ||
        null
    };
  }

  const symbol =
    normalizeSymbol(
      dividend.symbol
    );

  const investorContext =
    await loadInvestorContext();

  const currentPortfolio =
    investorContext
      ?.practicePortfolio ||
    {};

  const holdings =
    Array.isArray(
      currentPortfolio?.holdings
    )
      ? currentPortfolio.holdings
      : [];

  const holding =
    holdings.find(
      (item) =>
        normalizeSymbol(
          item?.symbol
        ) ===
        symbol
    );

  if (!holding) {
    throw new Error(
      `${symbol} is not currently held in the Practice Portfolio.`
    );
  }

  const quantity =
    number(
      holding?.quantity
    );

  if (quantity <= 0) {
    throw new Error(
      `${symbol} has no eligible shares for this dividend receipt.`
    );
  }

  const dividendPerShare =
    number(
      dividend
        ?.dividendPerShare
    );

  if (
    dividendPerShare <=
    0
  ) {
    throw new Error(
      "Dividend per share must be greater than zero."
    );
  }

  const withholdingTaxRate =
    number(
      dividend
        ?.withholdingTaxRate
    );

  const grossAmount =
    roundMoney(
      quantity *
      dividendPerShare
    );

  const taxAmount =
    roundMoney(
      grossAmount *
      (
        withholdingTaxRate /
        100
      )
    );

  const netAmount =
    roundMoney(
      grossAmount -
      taxAmount
    );

  if (netAmount < 0) {
    throw new Error(
      "The calculated net dividend cannot be negative."
    );
  }

  /*
   * Use a deterministic reference so the same declaration
   * cannot create multiple ledger events.
   */
  const paymentReference =
    `DIVREC-${dividend.id}`;

  const existingEvents =
    await loadPortfolioEvents();

  const existingEvent =
    Array.isArray(
      existingEvents
    )
      ? existingEvents.find(
          (event) =>
            event?.eventType ===
              PORTFOLIO_EVENT_TYPES
                .DIVIDEND_RECEIVED &&
            event?.reference ===
              paymentReference
        )
      : null;

  /*
   * If the event already exists, repair the dividend record
   * without crediting cash again.
   */
  if (existingEvent) {
    const repairedDividend =
      await saveDividendRecord({
        ...dividend,

        status:
          "PAID",

        paymentReference,

        entitlementQuantity:
          quantity,

        grossAmount,

        taxAmount,

        netAmount,

        paidAt:
          existingEvent?.occurredAt ||
          existingEvent?.createdAt ||
          new Date().toISOString(),

        receivedBy,

        ledgerEventId:
          existingEvent.id
      });

    return {
      status:
        "ALREADY_RECORDED",

      dividend:
        repairedDividend,

      portfolio:
        currentPortfolio,

      portfolioEvent:
        existingEvent
    };
  }

  const cashBefore =
    roundMoney(
      currentPortfolio
        ?.availableCash ||
      0
    );

  const cashAfter =
    roundMoney(
      cashBefore +
      netAmount
    );

  const portfolioValueBefore =
    roundMoney(
      currentPortfolio
        ?.totalValue ||
      (
        number(
          currentPortfolio
            ?.holdingsValue
        ) +
        cashBefore
      )
    );

  /*
   * Only the net dividend is credited to available cash.
   */
  const updatedPortfolio =
    await savePracticePortfolio({
      ...currentPortfolio,

      availableCash:
        cashAfter
    });

  const portfolioEvent =
    await recordPortfolioEvent({
      eventType:
        PORTFOLIO_EVENT_TYPES
          .DIVIDEND_RECEIVED,

      broker:
        holding?.broker ||
        null,

      accountName:
        null,

      symbol,

      companyName:
        dividend?.companyName ||
        holding?.name ||
        symbol,

      sector:
        dividend?.sector ||
        holding?.sector ||
        null,

      quantity,

      price:
        dividendPerShare,

      marketValue:
        grossAmount,

      cashImpact:
        netAmount,

      holdingsValueBefore:
        number(
          currentPortfolio
            ?.holdingsValue
        ),

      holdingsValueAfter:
        number(
          updatedPortfolio
            ?.holdingsValue
        ),

      portfolioValueBefore,

      portfolioValueAfter:
        number(
          updatedPortfolio
            ?.totalValue
        ),

      cashBefore,

      cashAfter,

      reference:
        paymentReference,

      source:
        "PC_017C_DIVIDEND_RECEIPT",

      notes:
        `Received ${symbol} dividend: gross KES ${grossAmount.toFixed(
          2
        )}, tax KES ${taxAmount.toFixed(
          2
        )}, net KES ${netAmount.toFixed(
          2
        )}.`,

      occurredAt:
        new Date().toISOString(),

      metadata: {
        dividendRecordId:
          dividend.id,

        dividendType:
          dividend?.dividendType ||
          null,

        dividendPerShare,

        withholdingTaxRate,

        entitlementQuantity:
          quantity,

        grossAmount,

        taxAmount,

        netAmount,

        paymentDate:
          dividend?.paymentDate ||
          null
      }
    });

  const paidDividend =
    await saveDividendRecord({
      ...dividend,

      status:
        "PAID",

      paymentReference,

      entitlementQuantity:
        quantity,

      grossAmount,

      taxAmount,

      netAmount,

      paidAt:
        portfolioEvent
          ?.occurredAt ||
        new Date().toISOString(),

      receivedBy,

      ledgerEventId:
        portfolioEvent.id
    });

  return {
    status:
      "RECEIVED",

    dividend:
      paidDividend,

    portfolio:
      updatedPortfolio,

    portfolioEvent,

    receipt: {
      paymentReference,

      symbol,

      quantity,

      dividendPerShare,

      grossAmount,

      taxAmount,

      netAmount,

      cashBefore,

      cashAfter
    }
  };
}