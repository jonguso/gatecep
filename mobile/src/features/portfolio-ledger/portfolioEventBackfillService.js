import {
  loadBrokerPortfolioImportRequests
} from "../broker-sync/brokerPortfolioImportStore";

import {
  loadPortfolioEvents,
  recordPortfolioEvent
} from "./portfolioEventStore";

import {
  PORTFOLIO_EVENT_TYPES
} from "./portfolioEventTypes";

/*
 * ============================================================
 * PC-016
 * BACKFILL COMPLETED BROKER IMPORT EVENTS
 * ============================================================
 *
 * This service creates missing ledger events for historical
 * completed PC-015 import requests.
 *
 * It does not change holdings, cash, actions, or cases.
 */

export async function backfillCompletedBrokerImportEvents() {
  const [
    requests,
    existingEvents
  ] = await Promise.all([
    loadBrokerPortfolioImportRequests(),
    loadPortfolioEvents()
  ]);

  const completedRequests =
    Array.isArray(requests)
      ? requests.filter(
          (request) =>
            request?.status ===
            "COMPLETED"
        )
      : [];

  const existingReferences =
    new Set(
      (
        Array.isArray(existingEvents)
          ? existingEvents
          : []
      )
        .filter(
          (event) =>
            event?.eventType ===
            PORTFOLIO_EVENT_TYPES
              .BROKER_IMPORT
        )
        .map(
          (event) =>
            event?.reference
        )
        .filter(Boolean)
    );

  const createdEvents = [];
  const skippedRequests = [];

  for (
    const request of
    completedRequests
  ) {
    if (
      !request?.id ||
      existingReferences.has(
        request.id
      )
    ) {
      skippedRequests.push(
        request
      );

      continue;
    }

    const quantity =
      Number(
        request?.quantityToImport ||
        request?.brokerQuantity ||
        0
      );

    const price =
      Number(
        request?.marketPrice ||
        request?.averagePrice ||
        0
      );

    const marketValue =
      Number(
        request?.estimatedValue ||
        quantity * price
      );

    const event =
      await recordPortfolioEvent({
        eventType:
          PORTFOLIO_EVENT_TYPES
            .BROKER_IMPORT,

        broker:
          request?.broker ||
          null,

        accountName:
          request?.accountName ||
          null,

        symbol:
          request?.symbol ||
          null,

        companyName:
          request?.companyName ||
          request?.symbol ||
          null,

        sector:
          request?.sector ||
          null,

        quantity,

        price,

        marketValue,

        cashImpact:
          0,

        reference:
          request.id,

        source:
          "PC_016_HISTORICAL_BACKFILL",

        notes:
          `Backfilled completed controlled import of ${quantity} ${
            request?.symbol ||
            "security"
          } shares.`,

        occurredAt:
          request?.executedAt ||
          request?.updatedAt ||
          request?.createdAt ||
          new Date().toISOString(),

        metadata: {
          actionId:
            request?.actionId ||
            null,

          caseId:
            request?.caseId ||
            null,

          issueId:
            request?.issueId ||
            null,

          discrepancyKey:
            request?.discrepancyKey ||
            null,

          resolutionCode:
            request?.resolutionCode ||
            null,

          backfilled:
            true
        }
      });

    createdEvents.push(
      event
    );

    existingReferences.add(
      request.id
    );
  }

  return {
    completedRequests:
      completedRequests.length,

    created:
      createdEvents.length,

    skipped:
      skippedRequests.length,

    createdEvents,
    skippedRequests
  };
}