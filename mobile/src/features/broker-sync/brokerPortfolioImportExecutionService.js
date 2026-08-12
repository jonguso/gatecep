import {
  getBrokerPortfolioImportRequest,
  startBrokerPortfolioImportRequest,
  completeBrokerPortfolioImportRequest,
  failBrokerPortfolioImportRequest
} from "./brokerPortfolioImportStore";

import {
  getBrokerReconciliationAction,
  completeBrokerReconciliationAction
} from "./brokerReconciliationActionStore";

import {
  recordPortfolioEvent
} from "../portfolio-ledger/portfolioEventStore";

import {
  PORTFOLIO_EVENT_TYPES
} from "../portfolio-ledger/portfolioEventTypes";

import {
  loadBrokerMirror
} from "./brokerSyncService";

import {
  buildBrokerReconciliation
} from "./brokerReconciliationService";

import {
  addBrokerSyncAuditEvent
} from "./brokerSyncAuditStore";

import {
  loadCanonicalRealBrokerPortfolio,
  saveCanonicalRealBrokerPortfolio
} from "./canonicalRealBrokerPortfolioService";

import {
  normalizePortfolioHolding
} from "../../portfolio/portfolioStore";

/*
 * ============================================================
 * PC-015
 * CONTROLLED IMPORT EXECUTION ENGINE
 * ============================================================
 */

export async function executeBrokerPortfolioImport({
  requestId,
  executedBy = "CURRENT_USER"
}) {
  if (!requestId) {
    throw new Error(
      "Import request ID is required."
    );
  }

  const request =
    await getBrokerPortfolioImportRequest(
      requestId
    );

  if (!request) {
    throw new Error(
      "Import request was not found."
    );
  }

  /*
   * Idempotency:
   * Never execute the same request twice.
   */
  if (
    request?.status ===
    "COMPLETED"
  ) {
    return {
      status:
        "ALREADY_COMPLETED",

      request,

      portfolio:
        await loadCanonicalRealBrokerPortfolio(),

      reconciliation:
        await buildBrokerReconciliation()
    };
  }

  const action =
    await getBrokerReconciliationAction(
      request.actionId
    );

  if (!action) {
    throw new Error(
      "The linked reconciliation action was not found."
    );
  }

  if (
    action?.actionCode !==
    "QUEUE_IMPORT_REVIEW"
  ) {
    throw new Error(
      "This action is not eligible for a controlled portfolio import."
    );
  }

  if (
    action?.status !==
      "APPROVED" &&
    action?.status !==
      "IN_PROGRESS"
  ) {
    throw new Error(
      "The reconciliation action must be approved before execution."
    );
  }

  const brokerMirror =
    await loadBrokerMirror();

  const brokerHolding =
    Array.isArray(
      brokerMirror?.holdings
    )
      ? brokerMirror.holdings.find(
          (holding) =>
            String(
              holding?.symbol ||
              ""
            ).toUpperCase() ===
            String(
              request?.symbol ||
              ""
            ).toUpperCase()
        )
      : null;

  if (!brokerHolding) {
    throw new Error(
      `${request.symbol} is no longer present in the broker mirror.`
    );
  }

  const currentBrokerQuantity =
    Number(
      brokerHolding?.quantity ||
      0
    );

  if (
    currentBrokerQuantity <=
    0
  ) {
    throw new Error(
      "The broker holding quantity is no longer valid."
    );
  }

  await startBrokerPortfolioImportRequest(
    request.id
  );

  try {
    const currentPortfolio =
      await loadCanonicalRealBrokerPortfolio();

    const portfolioValueBefore =
  Number(
    currentPortfolio?.totalValue ||
    0
  );

const holdingsValueBefore =
  Number(
    currentPortfolio?.holdingsValue ||
    0
  );

const cashBefore =
  Number(
    currentPortfolio?.availableCash ||
    0
  );

    const currentHoldings =
      Array.isArray(
        currentPortfolio?.holdings
      )
        ? currentPortfolio.holdings
        : [];

    const symbol =
      String(
        request.symbol
      )
        .trim()
        .toUpperCase();

    const existingHolding =
      currentHoldings.find(
        (holding) =>
          String(
            holding?.symbol ||
            ""
          ).toUpperCase() ===
          symbol
      );

    /*
     * If the holding already equals the broker quantity,
     * treat the import as already applied.
     */
    if (
      existingHolding &&
      Number(
        existingHolding.quantity ||
        0
      ) ===
      currentBrokerQuantity
    ) {
      const completedRequest =
        await completeBrokerPortfolioImportRequest(
          request.id,
          executedBy
        );

      await completeBrokerReconciliationAction(
        action.id,
        "Controlled portfolio import was already reflected in the canonical REAL portfolio."
      );

      const reconciliation =
        await buildBrokerReconciliation();

      return {
        status:
          "ALREADY_APPLIED",

        request:
          completedRequest,

        action,

        portfolio:
          currentPortfolio,

        reconciliation
      };
    }

    const importedHolding =
      normalizePortfolioHolding({
        ...brokerHolding,

        symbol,

        quantity:
          currentBrokerQuantity,

        averagePrice:
          Number(
            brokerHolding
              ?.averagePrice ||
            request?.averagePrice ||
            0
          ),

        marketPrice:
          Number(
            brokerHolding
              ?.marketPrice ||
            request?.marketPrice ||
            0
          ),

        broker:
          brokerMirror?.broker ||
          action?.broker ||
          "BROKER_IMPORT",

        source:
          "PC_015_CONTROLLED_BROKER_IMPORT",

        importRequestId:
          request.id,

        reconciliationActionId:
          action.id,

        importedAt:
          new Date().toISOString()
      });

    let nextHoldings;

    if (existingHolding) {
      /*
       * Replace the existing GateCEP quantity with the current
       * broker quantity. This is reconciliation alignment, not
       * additive order execution.
       */
      nextHoldings =
        currentHoldings.map(
          (holding) =>
            String(
              holding?.symbol ||
              ""
            ).toUpperCase() ===
            symbol
              ? importedHolding
              : holding
        );
    } else {
      nextHoldings = [
        ...currentHoldings,
        importedHolding
      ];
    }

    const updatedPortfolio =
      await saveCanonicalRealBrokerPortfolio(nextHoldings, {
        reason: "BROKER_RECONCILIATION_IMPORT"
      });

   const portfolioEvent =
  await recordPortfolioEvent({
    eventType:
      PORTFOLIO_EVENT_TYPES
        .BROKER_IMPORT,

    broker:
      brokerMirror?.broker ||
      action?.broker ||
      null,

    accountName:
      brokerMirror?.accountName ||
      action?.accountName ||
      null,

    symbol,

    companyName:
      brokerHolding?.name ||
      symbol,

    sector:
      brokerHolding?.sector ||
      null,

    quantity:
      currentBrokerQuantity,

    price:
      Number(
        brokerHolding?.marketPrice ||
        request?.marketPrice ||
        0
      ),

    marketValue:
      Number(
        brokerHolding?.marketValue ||
        currentBrokerQuantity *
          Number(
            brokerHolding?.marketPrice ||
            request?.marketPrice ||
            0
          )
      ),

    cashImpact:
      0,

    holdingsValueBefore,

    holdingsValueAfter:
      Number(
        updatedPortfolio?.holdingsValue ||
        0
      ),

    portfolioValueBefore,

    portfolioValueAfter:
      Number(
        updatedPortfolio?.totalValue ||
        0
      ),

    cashBefore,

    cashAfter:
      Number(
        updatedPortfolio?.availableCash ||
        0
      ),

    reference:
      request.id,

    source:
      "PC_015_CONTROLLED_BROKER_IMPORT",

    notes:
      `Imported ${currentBrokerQuantity} ${symbol} shares from the synchronized broker portfolio.`,

    metadata: {
      actionId:
        action.id,

      caseId:
        action.caseId ||
        request.caseId ||
        null,

      issueId:
        action.issueId ||
        request.issueId ||
        null,

      discrepancyKey:
        request.discrepancyKey ||
        action.discrepancyKey ||
        null,

      resolutionCode:
        action.resolutionCode ||
        request.resolutionCode ||
        null
    }
  });

    const completedRequest =
      await completeBrokerPortfolioImportRequest(
        request.id,
        executedBy
      );

    const completedAction =
      await completeBrokerReconciliationAction(
        action.id,
        `Imported ${currentBrokerQuantity} ${symbol} shares into the canonical REAL portfolio through controlled reconciliation.`
      );

    const reconciliation =
      await buildBrokerReconciliation();

    await addBrokerSyncAuditEvent({
      type:
        "BROKER_PORTFOLIO_IMPORT",

      broker:
        brokerMirror?.broker ||
        action?.broker ||
        null,

      accountName:
        brokerMirror?.accountName ||
        action?.accountName ||
        null,

      status:
        reconciliation?.status ||
        null,

      classification:
        "CONTROLLED_IMPORT_COMPLETED",

      brokerTotal:
        reconciliation
          ?.brokerMirror
          ?.totalValue ||
        0,

      gatecepTotal:
        reconciliation
          ?.realPortfolio
          ?.totalValue ||
        0,

      difference:
        reconciliation
          ?.summary
          ?.totalDifference ||
        0,

      cashDifference:
        reconciliation
          ?.summary
          ?.cashDifference ||
        0,

      holdingsCount:
        reconciliation
          ?.realPortfolio
          ?.holdingsCount ||
        0,

      matched:
        reconciliation
          ?.summary
          ?.matched ||
        0,

      mismatched:
        reconciliation
          ?.summary
          ?.mismatched ||
        0,

      missingAtBroker:
        reconciliation
          ?.summary
          ?.missingAtBroker ||
        0,

      extraAtBroker:
        reconciliation
          ?.summary
          ?.extraAtBroker ||
        0,

      issues: [
        {
          type:
            "CONTROLLED_IMPORT_COMPLETED",

          symbol,

          quantity:
            currentBrokerQuantity,

          requestId:
            request.id,

          actionId:
            action.id,

          message:
            `${currentBrokerQuantity} ${symbol} shares were imported into the canonical REAL portfolio.`
        }
      ]
    });

    return {
  status:
    "COMPLETED",

  request:
    completedRequest,

  action:
    completedAction,

  portfolio:
    updatedPortfolio,

  portfolioEvent,

  reconciliation
};

  } catch (error) {
    await failBrokerPortfolioImportRequest(
      request.id,
      error?.message ||
      "Controlled portfolio import failed."
    );

    throw error;
  }
}
