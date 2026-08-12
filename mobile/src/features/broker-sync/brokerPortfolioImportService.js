import {
  loadBrokerPortfolioImportRequests,
  createBrokerPortfolioImportRequest
} from "./brokerPortfolioImportStore";

import {
  loadBrokerReconciliationActions
} from "./brokerReconciliationActionStore";

import {
  loadBrokerMirror
} from "./brokerSyncService";

import {
  loadCanonicalRealBrokerPortfolio
} from "./canonicalRealBrokerPortfolioService";

/*
 * ============================================================
 * PC-014
 * BUILD IMPORT PREVIEW
 * ============================================================
 */

export async function buildBrokerPortfolioImportPreview() {

  const [
  actions,
  requests,
  brokerMirror,
  portfolio
] = await Promise.all([
  loadBrokerReconciliationActions(),
  loadBrokerPortfolioImportRequests(),
  loadBrokerMirror(),
  loadCanonicalRealBrokerPortfolio()
]);

  /*
   * Find approved Queue Import Review actions.
   */

  const approvedImports =
    actions.filter(
      (action) =>
        action.actionCode ===
          "QUEUE_IMPORT_REVIEW" &&
        action.status ===
          "APPROVED"
    );

  const previews = [];

  for (const action of approvedImports) {

    let request =
      requests.find(
        (item) =>
          item.actionId ===
          action.id
      );

    const brokerHolding =
      brokerMirror?.holdings?.find(
        (item) =>
          item.symbol ===
          action.symbol
      );

    const gatecepHolding =
      portfolio?.holdings?.find(
        (item) =>
          item.symbol ===
          action.symbol
      );

    /*
     * Create request automatically
     * if one does not exist.
     */

    if (
      !request &&
      brokerHolding
    ) {

      request =
        await createBrokerPortfolioImportRequest({

          actionId:
            action.id,

          caseId:
            action.caseId,

          issueId:
            action.issueId,

          discrepancyKey:
            action.discrepancyKey,

          broker:
            action.broker,

          accountName:
            action.accountName,

          symbol:
            brokerHolding.symbol,

          companyName:
            brokerHolding.name,

          sector:
            brokerHolding.sector,

          brokerQuantity:
            brokerHolding.quantity,

          gatecepQuantityBefore:
            gatecepHolding?.quantity || 0,

          quantityToImport:
            brokerHolding.quantity,

          averagePrice:
            brokerHolding.averagePrice,

          marketPrice:
            brokerHolding.marketPrice,

          estimatedValue:
            brokerHolding.marketPrice *
            brokerHolding.quantity,

          resolutionCode:
            action.resolutionCode,

          resolutionLabel:
            action.resolutionLabel
        });
    }

    if (!request) {
      continue;
    }

    previews.push({

      ...request,

      brokerHolding,

      gatecepHolding,

      quantityDifference:

        (brokerHolding?.quantity || 0) -

        (gatecepHolding?.quantity || 0),

      valueDifference:

        (brokerHolding?.quantity || 0) *

          (brokerHolding?.marketPrice || 0)

        -

        (gatecepHolding?.quantity || 0) *

          (gatecepHolding?.marketPrice || 0)
    });
  }

  return previews;
}
