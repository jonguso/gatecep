import {
  loadInvestorContext,
  savePracticePortfolio
} from "../investor/investorContextStore";

import {
  getCorporateAction,
  markCorporateActionExecuted,
  markCorporateActionFailed
} from "./corporateActionStore";

import {
  buildCorporateActionImpact
} from "./corporateActionImpactService";

import {
  CORPORATE_ACTION_STATUSES,
  CORPORATE_ACTION_TYPES
} from "./corporateActionTypes";

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

function roundQuantity(value) {
  return Number(
    number(value).toFixed(6)
  );
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getLedgerEventType(
  actionType
) {
  switch (actionType) {
    case CORPORATE_ACTION_TYPES
      .BONUS_SHARE:
      return PORTFOLIO_EVENT_TYPES
        .BONUS_SHARE;

    case CORPORATE_ACTION_TYPES
      .STOCK_SPLIT:
    case CORPORATE_ACTION_TYPES
      .REVERSE_SPLIT:
      return PORTFOLIO_EVENT_TYPES
        .STOCK_SPLIT;

    default:
      return PORTFOLIO_EVENT_TYPES
        .PORTFOLIO_ADJUSTMENT;
  }
}

/*
 * ============================================================
 * PC-018D
 * EXECUTE CORPORATE ACTION
 * ============================================================
 */

export async function executeCorporateAction({
  actionId,
  executedBy = "CURRENT_USER"
}) {
  if (!actionId) {
    throw new Error(
      "Corporate action ID is required."
    );
  }

  const action =
    await getCorporateAction(
      actionId
    );

  if (!action) {
    throw new Error(
      "Corporate action was not found."
    );
  }

  /*
   * Existing execution is returned without applying it twice.
   */
  if (
    action?.status ===
      CORPORATE_ACTION_STATUSES
        .EXECUTED ||
    action?.executionReference
  ) {
    return {
      status:
        "ALREADY_EXECUTED",

      action,

      portfolio:
        (
          await loadInvestorContext()
        )?.practicePortfolio ||
        null
    };
  }

  if (
    action?.status !==
    CORPORATE_ACTION_STATUSES
      .APPROVED
  ) {
    throw new Error(
      "Only an approved corporate action can be executed."
    );
  }

  if (
    ![
      CORPORATE_ACTION_TYPES
        .BONUS_SHARE,

      CORPORATE_ACTION_TYPES
        .STOCK_SPLIT,

      CORPORATE_ACTION_TYPES
        .REVERSE_SPLIT
    ].includes(
      action?.actionType
    )
  ) {
    throw new Error(
      `${action?.actionType || "This corporate action"} is not supported by PC-018D.`
    );
  }

  const executionReference =
    `CAEXEC-${action.id}`;

  const existingEvents =
    await loadPortfolioEvents();

  const existingEvent =
    Array.isArray(
      existingEvents
    )
      ? existingEvents.find(
          (event) =>
            event?.reference ===
              executionReference
        )
      : null;

  /*
   * Repair action state if the portfolio event exists already.
   * No second portfolio mutation is performed.
   */
  if (existingEvent) {
    const repairedAction =
      await markCorporateActionExecuted(
        action.id,
        {
          executedAt:
            existingEvent
              ?.occurredAt ||
            existingEvent
              ?.createdAt ||
            new Date()
              .toISOString(),

          executedBy,

          executionReference,

          ledgerEventId:
            existingEvent.id,

          quantityBefore:
            number(
              existingEvent
                ?.metadata
                ?.quantityBefore
            ),

          quantityChange:
            number(
              existingEvent
                ?.metadata
                ?.quantityChange
            ),

          quantityAfter:
            number(
              existingEvent
                ?.metadata
                ?.quantityAfter
            ),

          cashImpact:
            number(
              existingEvent
                ?.cashImpact
            ),

          portfolioValueBefore:
            number(
              existingEvent
                ?.portfolioValueBefore
            ),

          portfolioValueAfter:
            number(
              existingEvent
                ?.portfolioValueAfter
            )
        }
      );

    return {
      status:
        "ALREADY_RECORDED",

      action:
        repairedAction,

      portfolio:
        (
          await loadInvestorContext()
        )?.practicePortfolio ||
        null,

      portfolioEvent:
        existingEvent
    };
  }

  try {
    /*
     * Recalculate against the latest holding immediately
     * before execution.
     */
    const impact =
      await buildCorporateActionImpact({
        corporateAction:
          action
      });

    if (
      !impact?.supported
    ) {
      throw new Error(
        impact?.message ||
          "This corporate action is not supported."
      );
    }

    if (
      !impact?.executable
    ) {
      throw new Error(
        impact?.message ||
          "This corporate action cannot currently be executed."
      );
    }

    const investorContext =
      await loadInvestorContext();

    const currentPortfolio =
      investorContext
        ?.practicePortfolio ||
      {};

    const currentHoldings =
      Array.isArray(
        currentPortfolio
          ?.holdings
      )
        ? currentPortfolio
            .holdings
        : [];

    const symbol =
      normalizeSymbol(
        action.symbol
      );

    const holdingIndex =
      currentHoldings.findIndex(
        (holding) =>
          normalizeSymbol(
            holding?.symbol
          ) ===
          symbol
      );

    if (holdingIndex < 0) {
      throw new Error(
        `${symbol} is no longer held in the Practice Portfolio.`
      );
    }

    const currentHolding =
      currentHoldings[
        holdingIndex
      ];

    const quantityBefore =
      roundQuantity(
        number(
          currentHolding
            ?.quantity
        )
      );

    const quantityAfter =
      roundQuantity(
        number(
          impact
            ?.impact
            ?.quantityAfter
        )
      );

    const quantityChange =
      roundQuantity(
        quantityAfter -
        quantityBefore
      );

    if (
      Math.abs(
        quantityBefore -
        number(
          impact
            ?.impact
            ?.quantityBefore
        )
      ) > 0.000001
    ) {
      throw new Error(
        "The holding quantity changed after approval. Refresh the action preview before execution."
      );
    }

    const costValueBefore =
      roundMoney(
        number(
          currentHolding
            ?.costValue ||
          currentHolding
            ?.investedValue
        ) ||
        quantityBefore *
          number(
            currentHolding
              ?.averagePrice ||
            currentHolding
              ?.averageCost
          )
      );

    const marketValueBefore =
      roundMoney(
        number(
          currentHolding
            ?.marketValue ||
          currentHolding
            ?.value
        ) ||
        quantityBefore *
          number(
            currentHolding
              ?.marketPrice ||
            currentHolding
              ?.price
          )
      );

    const averagePriceAfter =
      quantityAfter > 0
        ? roundMoney(
            costValueBefore /
            quantityAfter
          )
        : 0;

    const theoreticalMarketPriceAfter =
      quantityAfter > 0
        ? roundMoney(
            marketValueBefore /
            quantityAfter
          )
        : 0;

    const nextHolding = {
      ...currentHolding,

      quantity:
        quantityAfter,

      averagePrice:
        averagePriceAfter,

      averageCost:
        averagePriceAfter,

      marketPrice:
        theoreticalMarketPriceAfter,

      price:
        theoreticalMarketPriceAfter,

      lastPrice:
        theoreticalMarketPriceAfter,

      costValue:
        costValueBefore,

      investedValue:
        costValueBefore,

      marketValue:
        marketValueBefore,

      value:
        marketValueBefore,

      profitLoss:
        roundMoney(
          marketValueBefore -
          costValueBefore
        ),

      profitLossPct:
        costValueBefore > 0
          ? Number(
              (
                (
                  marketValueBefore -
                  costValueBefore
                ) /
                costValueBefore *
                100
              ).toFixed(2)
            )
          : 0,

      updatedAt:
        new Date()
          .toISOString(),

      metadata: {
        ...(
          currentHolding
            ?.metadata &&
          typeof currentHolding
            .metadata ===
            "object"
            ? currentHolding.metadata
            : {}
        ),

        lastCorporateActionId:
          action.id,

        lastCorporateActionType:
          action.actionType,

        lastCorporateActionReference:
          executionReference
      }
    };

    const nextHoldings = [
      ...currentHoldings
    ];

    nextHoldings[
      holdingIndex
    ] = nextHolding;

    const holdingsValueBefore =
      roundMoney(
        currentHoldings.reduce(
          (sum, holding) =>
            sum +
            (
              number(
                holding
                  ?.marketValue ||
                holding?.value
              ) ||
              number(
                holding
                  ?.quantity
              ) *
                number(
                  holding
                    ?.marketPrice ||
                  holding?.price
                )
            ),
          0
        )
      );

    const holdingsValueAfter =
      roundMoney(
        nextHoldings.reduce(
          (sum, holding) =>
            sum +
            (
              number(
                holding
                  ?.marketValue ||
                holding?.value
              ) ||
              number(
                holding
                  ?.quantity
              ) *
                number(
                  holding
                    ?.marketPrice ||
                  holding?.price
                )
            ),
          0
        )
      );

    const availableCash =
      roundMoney(
        currentPortfolio
          ?.availableCash ||
        0
      );

    const portfolioValueBefore =
      roundMoney(
        holdingsValueBefore +
        availableCash
      );

    const portfolioValueAfter =
      roundMoney(
        holdingsValueAfter +
        availableCash
      );

    const updatedPortfolio =
      await savePracticePortfolio({
        ...currentPortfolio,

        holdings:
          nextHoldings,

        investedAmount:
          roundMoney(
            nextHoldings.reduce(
              (sum, holding) =>
                sum +
                number(
                  holding
                    ?.costValue ||
                  holding
                    ?.investedValue
                ),
              0
            )
          ),

        holdingsValue:
          holdingsValueAfter,

        totalValue:
          portfolioValueAfter,

        updatedAt:
          new Date()
            .toISOString()
      });

    const portfolioEvent =
      await recordPortfolioEvent({
        eventType:
          getLedgerEventType(
            action.actionType
          ),

        broker:
          currentHolding?.broker ||
          action?.broker ||
          null,

        accountName:
          action?.accountName ||
          null,

        symbol,

        companyName:
          action?.companyName ||
          currentHolding?.name ||
          symbol,

        sector:
          action?.sector ||
          currentHolding?.sector ||
          null,

        quantity:
          quantityChange,

        price:
          theoreticalMarketPriceAfter,

        marketValue:
          marketValueBefore,

        cashImpact:
          0,

        holdingsValueBefore,

        holdingsValueAfter,

        portfolioValueBefore,

        portfolioValueAfter,

        cashBefore:
          availableCash,

        cashAfter:
          availableCash,

        reference:
          executionReference,

        source:
          "PC_018D_CORPORATE_ACTION_EXECUTION",

        notes:
          `${
            action.actionType
          } executed for ${symbol}. Quantity changed from ${quantityBefore} to ${quantityAfter}.`,

        occurredAt:
          new Date()
            .toISOString(),

        metadata: {
          corporateActionId:
            action.id,

          actionType:
            action.actionType,

          ratioNumerator:
            number(
              action
                ?.ratioNumerator
            ),

          ratioDenominator:
            number(
              action
                ?.ratioDenominator
            ),

          ratioLabel:
            `${
              action
                ?.ratioNumerator
            }:${
              action
                ?.ratioDenominator
            }`,

          fractionalShareTreatment:
            action
              ?.fractionalShareTreatment ||
            "ROUND_DOWN",

          rawQuantityAfter:
            number(
              impact
                ?.impact
                ?.rawQuantityAfter
            ),

          fractionalQuantity:
            number(
              impact
                ?.impact
                ?.fractionalQuantity
            ),

          quantityBefore,

          quantityChange,

          quantityAfter,

          averagePriceBefore:
            number(
              currentHolding
                ?.averagePrice ||
              currentHolding
                ?.averageCost
            ),

          averagePriceAfter,

          marketPriceBefore:
            number(
              currentHolding
                ?.marketPrice ||
              currentHolding
                ?.price
            ),

          theoreticalMarketPriceAfter,

          costValueBefore,

          costValueAfter:
            costValueBefore,

          recordDate:
            action?.recordDate ||
            null,

          effectiveDate:
            action?.effectiveDate ||
            null
        }
      });

    const executedAction =
      await markCorporateActionExecuted(
        action.id,
        {
          executedAt:
            portfolioEvent
              ?.occurredAt ||
            new Date()
              .toISOString(),

          executedBy,

          executionReference,

          ledgerEventId:
            portfolioEvent.id,

          quantityBefore,

          quantityChange,

          quantityAfter,

          cashImpact:
            0,

          portfolioValueBefore,

          portfolioValueAfter
        }
      );

    return {
      status:
        "EXECUTED",

      action:
        executedAction,

      portfolio:
        updatedPortfolio,

      portfolioEvent,

      execution: {
        executionReference,

        symbol,

        actionType:
          action.actionType,

        quantityBefore,

        quantityChange,

        quantityAfter,

        averagePriceBefore:
          number(
            currentHolding
              ?.averagePrice ||
            currentHolding
              ?.averageCost
          ),

        averagePriceAfter,

        marketPriceBefore:
          number(
            currentHolding
              ?.marketPrice ||
            currentHolding
              ?.price
          ),

        theoreticalMarketPriceAfter,

        costValueBefore,

        costValueAfter:
          costValueBefore,

        marketValueBefore,

        marketValueAfter:
          marketValueBefore,

        cashImpact:
          0,

        portfolioValueBefore,

        portfolioValueAfter
      }
    };
  } catch (error) {
    await markCorporateActionFailed(
      action.id,
      error?.message ||
        "Corporate action execution failed."
    );

    throw error;
  }
}