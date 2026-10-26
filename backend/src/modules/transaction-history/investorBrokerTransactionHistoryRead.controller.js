import {
  loadAuthenticatedInvestorTransactionHistory
} from "./investorBrokerTransactionHistory.service.js";

/*
 * R7O-R4E7R8
 *
 * Authenticated investor canonical Transaction History read.
 *
 * Security:
 * - investor identity comes only from req.user.id
 * - client supplies only the owned broker link
 * - service verifies broker-link ownership
 *
 * This endpoint is read-only.
 * It must not create authority, bootstrap history,
 * append executions, reset history, or perform Admin maintenance.
 */
export async function investorTransactionHistoryReadHandler(
  req,
  res
) {
  try {
    const authenticatedUserId =
      String(req.user?.id || "").trim();

    const brokerLinkId =
      String(req.query?.brokerLinkId || "").trim();

    if (!authenticatedUserId) {
      return res.status(401).json({
        ok: false,
        error: "Authentication is required."
      });
    }

    if (!brokerLinkId) {
      return res.status(400).json({
        ok: false,
        error:
          "Broker link is required to read Transaction History."
      });
    }

    const result =
      await loadAuthenticatedInvestorTransactionHistory({
        authenticatedUserId,
        brokerLinkId
      });

    return res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const status =
      Number(error?.status || error?.statusCode || 0);

    return res
      .status(
        status >= 400 && status < 600
          ? status
          : 500
      )
      .json({
        ok: false,
        code: error?.code || null,
        error:
          error?.message ||
          "Transaction History could not be loaded."
      });
  }
}
